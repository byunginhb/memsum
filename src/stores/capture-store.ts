import { create } from 'zustand';

import { processCapture } from '@/lib/api';
import { uploadCaptureImage } from '@/lib/storage';
import { useAuthStore } from '@/stores/auth-store';
// 자동 캘린더 등록(설정 ON + 구글 연결 시). calendar-store는 capture-store를
// import하지 않으므로 순환 의존이 없다.
import { useCalendarStore } from '@/stores/calendar-store';
import { useSettingsStore } from '@/stores/settings-store';

import { recognizeText } from '../../modules/vision-ocr';

import type {
  CaptureDraft,
  CaptureStage,
  ProcessCaptureResult,
} from '@/features/capture/types';

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
  /**
   * 캡처 파이프라인 시작. options.silent=true면 확인 Sheet를 열지 않고 백그라운드로
   * 처리한다(스크린샷 자동 감지용 — 저장되면 savedCount 증가로 목록이 갱신된다).
   *
   * @returns saved — 서버 저장(done)까지 완료됐는지. 호출 측(자동 캡처 토스트 등)이
   * 전역 savedCount 폴링 대신 이 반환값으로 성공을 판별한다(동시 캡처 race 제거).
   */
  startCapture: (
    input: StartCaptureInput,
    options?: { silent?: boolean },
  ) => Promise<{ saved: boolean }>;
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

/** 설정 복원 대기 안전망(ms) — 복원 실패로 hydrated가 영영 안 켜져도 진행한다. */
const SETTINGS_HYDRATION_TIMEOUT_MS = 3000;

/**
 * 설정(AsyncStorage persist) 복원 완료를 기다린다.
 * why: 헤드리스([저장] 콜드 스타트)에서는 복원이 끝나기 전에 autoCalendar를
 * 읽을 수 있다 — 기본값(true)이 사용자가 꺼 둔 설정을 덮어 의도와 반대로
 * 자동 등록되는 race를 막는다. 이미 복원됐으면 즉시 반환.
 */
async function waitForSettingsHydration(): Promise<void> {
  if (useSettingsStore.getState().hydrated) return;
  await new Promise<void>((resolve) => {
    const finish = (): void => {
      unsubscribe();
      clearTimeout(timer);
      resolve();
    };
    const unsubscribe = useSettingsStore.subscribe((state) => {
      if (state.hydrated) finish();
    });
    const timer = setTimeout(finish, SETTINGS_HYDRATION_TIMEOUT_MS);
  });
}

/**
 * 자동 캘린더 등록 — 설정(autoCalendar) ON + 구글 캘린더 연결 상태일 때,
 * 캡처에서 감지된 일정(제목·시간)을 사용자의 구글 캘린더에 자동 등록한다.
 *
 * 실패해도 캡처 저장 자체에는 영향이 없다(비치명 — 로그만 남기고 계속).
 * 헤드리스([저장] 백그라운드)에서도 동작해야 하므로 calendar-store가 아직
 * 복원 전이면 SecureStore에서 토큰을 먼저 복원한다(restore는 멱등).
 *
 * @returns 등록했으면 true(호출 측이 목록 갱신 신호를 보낼 수 있게).
 */
async function autoRegisterCalendarIfEnabled(
  result: ProcessCaptureResult,
): Promise<boolean> {
  try {
    if (!result.event) return false;
    await waitForSettingsHydration();
    if (!useSettingsStore.getState().autoCalendar) return false;

    const calendar = useCalendarStore.getState();
    if (!calendar.hydrated) {
      await calendar.restore();
    }
    if (useCalendarStore.getState().status !== 'connected') return false;

    await useCalendarStore.getState().registerCapture({
      captureId: result.capture_id,
      event: result.event,
    });
    return true;
  } catch (error) {
    // 자동 등록 실패는 조용히 넘긴다(무음 정책) — 사용자는 상세/캘린더 탭에서 수동 등록 가능.
    console.error('[capture] 자동 캘린더 등록 실패:', error);
    return false;
  }
}

export const useCaptureStore = create<CaptureStore>((set, get) => ({
  current: null,
  isSheetOpen: false,
  savedCount: 0,

  startCapture: async (
    input: StartCaptureInput,
    options?: { silent?: boolean },
  ): Promise<{ saved: boolean }> => {
    const silent = options?.silent === true;
    const id = localCaptureId();

    // 초기 draft: uploading 단계로 시작. silent가 아니면 즉시 Sheet를 연다.
    // silent(스크린샷 자동 감지)는 current/Sheet를 일절 건드리지 않는다 —
    // current는 확인 Sheet 1개 전용 슬롯이라, 백그라운드 파이프라인이 공유하면
    // 동시 캡처 시 서로를 중단시키는 race가 생긴다(코드리뷰 HIGH).
    const initial: CaptureDraft = {
      id,
      sourcePlatform: input.sourcePlatform,
      imageUri: input.imageUri,
      stage: 'uploading',
    };
    if (!silent) {
      set({ current: initial, isSheetOpen: true });
    }

    // 단계 전이(UI 추적용). silent는 UI가 없으므로 항상 계속 진행한다.
    // 비-silent는 그 사이 다른 캡처로 교체됐으면 UI 갱신을 멈춘다(파이프라인 자체는 계속).
    const advance = (next: CaptureDraft): boolean => {
      if (silent) return true;
      if (get().current?.id !== id) return false;
      set({ current: next });
      return true;
    };

    const fail = (stage: CaptureStage, error: unknown): void => {
      const message =
        error instanceof Error ? error.message : '캡처 처리 중 오류가 발생했습니다.';
      console.error('[capture] 실패:', { id, stage, error });
      if (silent) return; // 백그라운드 캡처는 UI 상태를 건드리지 않는다(호출 측이 반환값으로 처리).
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
        return { saved: false };
      }

      // ② 이미지 업로드(stage: uploading). 업로드 경로는 로컬 captureId 사용.
      const upload = await uploadCaptureImage({
        uri: uploadUri(input),
        userId,
        captureId: id,
      });
      if (!advance({ ...initial, stage: 'uploading', storagePath: upload.path })) {
        return { saved: false };
      }

      // ③ 온디바이스 OCR(stage: ocr).
      if (!advance({ ...initial, stage: 'ocr', storagePath: upload.path })) {
        return { saved: false };
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
        return { saved: false };
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

      // ⑤ 완료. 서버 저장은 이미 성공했으므로, UI(advance) 성공 여부와 무관하게
      // 목록 새로고침 신호(savedCount)를 보낸다(신호 유실 방지 — 코드리뷰 HIGH).
      advance({
        ...initial,
        stage: 'done',
        storagePath: upload.path,
        ocrText: ocr.text,
        result,
      });
      set({ savedCount: get().savedCount + 1 });

      // ⑥ 자동 캘린더 등록(설정 ON + 연결 시). 등록되면 목록에 '캘린더 추가됨'이
      // 반영되도록 신호를 한 번 더 보낸다. 실패는 비치명(저장은 이미 완료).
      const registered = await autoRegisterCalendarIfEnabled(result);
      if (registered) {
        set({ savedCount: get().savedCount + 1 });
      }
      return { saved: true };
    } catch (error) {
      // 단계는 현재 draft에서 추정(가장 최근 전이 stage). silent는 추적 안 하므로 uploading.
      const stage = silent ? 'uploading' : (get().current?.stage ?? 'uploading');
      fail(stage, error);
      return { saved: false };
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
