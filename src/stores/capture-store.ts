import { create } from 'zustand';

import { processCapture } from '@/lib/api';
import { uploadCaptureImage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';

import { recognizeText } from '../../modules/vision-ocr';

import type { CaptureDraft, CaptureStage } from '@/features/capture/types';

/**
 * 캡처 파이프라인 오케스트레이션 스토어 (W3-C).
 *
 * 스크린샷 감지(또는 샘플) → 업로드 → 온디바이스 OCR → process-capture(GPT)
 * 단계를 순차로 진행하며, 각 단계 전이를 불변 업데이트로 반영한다.
 * 캡처 확인 Sheet(CaptureSheet)는 이 스토어의 current/isSheetOpen만 구독한다.
 *
 * 단계: uploading → ocr → processing → done (실패 시 어느 단계든 error).
 */

/** startCapture 입력. iOS는 OCR을 assetId로, Android는 uri로 수행한다. */
export type StartCaptureInput = {
  /** 미리보기용 로컬 uri. iOS는 확보가 어려우면 placeholder 허용. */
  imageUri: string;
  sourcePlatform: 'ios' | 'android';
  /** iOS: PHAsset localIdentifier. OCR source. */
  assetId?: string;
  /** Android: content:// 또는 file:// URI. OCR source + 업로드 source. */
  uri?: string;
};

type CaptureStore = {
  current: CaptureDraft | null;
  isSheetOpen: boolean;
  /** 캡처가 'done'(서버 저장 완료)에 도달할 때마다 증가. 리스트 화면이 이 값을 구독해 새로고침한다. */
  savedCount: number;
  startCapture: (input: StartCaptureInput) => Promise<void>;
  closeSheet: () => void;
  reset: () => void;
  /**
   * 외부에서 데이터가 바뀌었음을 알려 리스트 화면을 새로고침시킨다(savedCount 증가 재사용).
   * 예: 설정에서 "내 데이터 삭제" 후 홈/검색/캘린더 목록을 비우기 위해 호출.
   */
  notifyDataChanged: () => void;
};

/**
 * 의존성 없이 로컬 캡처 id 생성(업로드 경로 키 captures-raw/{userId}/{captureId}.jpg 용).
 * 서버 capture_id(process-capture가 새로 발급)와는 별개다.
 * RFC4122를 엄격히 지킬 필요는 없고 충돌만 없으면 되므로 시간+난수 조합을 쓴다.
 */
function localCaptureId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `cap_${time}_${rand}`;
}

/** OCR source 추출. iOS는 assetId 우선, Android(및 샘플)는 uri. */
function ocrSource(input: StartCaptureInput): { assetId?: string; uri?: string } {
  if (input.sourcePlatform === 'ios' && input.assetId) {
    return { assetId: input.assetId };
  }
  return { uri: input.uri ?? input.imageUri };
}

/**
 * 업로드용 로컬 이미지 uri 추출.
 * Android는 content:///file:// uri, iOS는 미리보기 imageUri를 쓴다.
 * (iOS assetId 직접 업로드는 W3-B 스토리지 구현 범위라 여기서는 uri만 넘긴다.)
 */
function uploadUri(input: StartCaptureInput): string {
  return input.uri ?? input.imageUri;
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  current: null,
  isSheetOpen: false,
  savedCount: 0,

  startCapture: async (input: StartCaptureInput): Promise<void> => {
    const id = localCaptureId();

    // 초기 draft: uploading 단계로 시작하며 즉시 Sheet를 연다.
    const initial: CaptureDraft = {
      id,
      sourcePlatform: input.sourcePlatform,
      imageUri: input.imageUri,
      stage: 'uploading',
    };
    set({ current: initial, isSheetOpen: true });

    // 단계 전이마다 새 draft를 만들고, 그 사이 다른 캡처로 교체됐으면 무시한다.
    const advance = (next: CaptureDraft): boolean => {
      if (get().current?.id !== id) return false;
      set({ current: next });
      return true;
    };

    const fail = (stage: CaptureStage, error: unknown): void => {
      const message =
        error instanceof Error ? error.message : '캡처 처리 중 오류가 발생했습니다.';
      console.error('[capture] 실패:', { id, stage, error });
      // 현재 draft가 이 캡처일 때만 error로 전이(불변 업데이트).
      const draft = get().current;
      if (!draft || draft.id !== id) return;
      set({ current: { ...draft, stage: 'error', error: message } });
    };

    try {
      // ① 세션 보장(익명 로그인). userId 확보.
      await useAuthStore.getState().ensureSession();
      const userId = useAuthStore.getState().userId;
      if (!userId) {
        const authError = useAuthStore.getState().error;
        fail('uploading', new Error(authError ?? '로그인 세션을 확보하지 못했습니다.'));
        return;
      }

      // ② 이미지 업로드(stage: uploading). 업로드 경로는 로컬 captureId 사용.
      const upload = await uploadCaptureImage({
        uri: uploadUri(input),
        userId,
        captureId: id,
      });
      if (!advance({ ...initial, stage: 'uploading', storagePath: upload.path })) {
        return;
      }

      // ③ 온디바이스 OCR(stage: ocr).
      if (!advance({ ...initial, stage: 'ocr', storagePath: upload.path })) {
        return;
      }
      const ocr = await recognizeText(ocrSource(input));

      // ④ process-capture 호출(stage: processing). image_url(path)을 함께 넘긴다.
      if (
        !advance({
          ...initial,
          stage: 'processing',
          storagePath: upload.path,
          ocrText: ocr.text,
        })
      ) {
        return;
      }
      // captureId는 넘기지 않는다: 로컬 id(cap_...)는 DB에 없고 uuid도 아니라
      // 함수의 UPDATE-by-id 경로가 실패한다. capture_id 없이 호출해 새 row를
      // INSERT 시키고, 서버가 발급한 capture_id는 result.capture_id로 받는다.
      // (storage 경로의 로컬 id는 파일명일 뿐이며 image_url 컬럼으로 row와 연결된다.)
      const result = await processCapture({
        ocrText: ocr.text,
        sourcePlatform: input.sourcePlatform,
        imageUrl: upload.path,
      });

      // ⑤ 완료(stage: done). 서버 capture_id는 result.capture_id에 별도 보관.
      if (
        advance({
          ...initial,
          stage: 'done',
          storagePath: upload.path,
          ocrText: ocr.text,
          result,
        })
      ) {
        // 저장 완료 신호: 리스트 화면이 savedCount 변화를 구독해 새로고침한다.
        set({ savedCount: get().savedCount + 1 });
      }
    } catch (error) {
      // 단계는 현재 draft에서 추정(가장 최근 전이 stage).
      const stage = get().current?.stage ?? 'uploading';
      fail(stage, error);
    }
  },

  closeSheet: (): void => {
    set({ isSheetOpen: false });
  },

  reset: (): void => {
    set({ current: null, isSheetOpen: false });
  },

  notifyDataChanged: (): void => {
    set({ savedCount: get().savedCount + 1 });
  },
}));
