import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { useToast } from '@/design/components/Toast/useToast';
import { t } from '@/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import { useCaptureStore } from '@/stores/capture-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useSettingsStore } from '@/stores/settings-store';

import {
  addScreenshotListener,
  checkNow,
  consumeAskToken,
  getPermissionStatus,
  requestPermission,
  startWatching,
  stopWatching,
} from '../../modules/photo-library-watcher';
import type { CaptureAskPayload } from '@/lib/notifications';
import type { StartCaptureInput } from '@/stores/capture-store';

/**
 * processedIds 상한. 네이티브 lastSeen 가드가 1차 방어라 JS 가드는 최근 항목만
 * 기억하면 된다. 무한 누적(장기 세션 메모리 증가)을 막는다(코드리뷰 MEDIUM).
 */
const PROCESSED_IDS_MAX = 300;

/**
 * 단일 캡처 파이프라인 최대 대기(ms). 백그라운드 동결로 네트워크 호출이 영구
 * 행잉되면 직렬 큐 전체가 막히므로, 시간 초과 시 실패로 간주하고 다음으로 넘어간다.
 * 서버(process-capture)의 OpenAI 재시도 총 예산(60s) + 업로드·OCR 여유로 잡는다.
 */
const PIPELINE_TIMEOUT_MS = 90 * 1000;

/**
 * iOS: 앱이 비활성일 때 받은 이벤트를 활성화까지 보관하는 상한(네이티브 캐치업 상한 20과 동급).
 * 넘치면 가장 오래된 것부터 버린다(장시간 백그라운드 메모리 증가 방지).
 */
const INACTIVE_HOLD_MAX = 20;

/**
 * 딥링크로 받을 수 있는 uri 형태 — MediaStore 이미지 항목만 허용한다
 * (질문 알림이 만드는 형태와 동일). 외부 파일/임의 스킴 업로드를 막는 2차 방어.
 */
const MEDIA_STORE_IMAGE_URI = /^content:\/\/media\/external(_primary)?\/images\/media\/\d+$/;

/**
 * 처리한 스크린샷 id 공유 집합.
 * why 모듈 스코프: 훅(옵저버/캐치업/딥링크)과 헤드리스 [저장] 태스크(앱이 떠 있으면
 * 같은 JS 런타임에서 실행됨)가 서로의 처리 여부를 보고 중복 저장을 막아야 한다.
 */
const processedIds = new Set<string>();

/** 외부(헤드리스 태스크)용: 이미 처리된 항목인지. */
export function isProcessedScreenshot(id: string): boolean {
  return processedIds.has(id);
}

/** 외부(헤드리스 태스크)용: 처리됨으로 마킹(FIFO 상한 적용). */
export function markProcessedScreenshot(id: string): void {
  rememberProcessed(processedIds, id);
}

/**
 * 스크린샷 자동 감지 훅.
 *
 * 앱의 핵심 가치(스크린샷을 알아서 정리). 네이티브 photo-library-watcher가 새 스크린샷을
 * 감지하면, 설정의 autoCapture가 켜져 있을 때:
 * - 앱 사용 중(포그라운드): 즉시 백그라운드 파이프라인(업로드→온디바이스 OCR→GPT→저장)을 돌린다.
 * - 다른 앱 사용 중(백그라운드): 네이티브 질문 알림이 묻고, [저장]/본문 탭 시 파이프라인을 돌린다.
 *
 * - 감지 on/off: 온보딩 완료 + autoCapture ON + 사진 권한이 모두 갖춰져야 startWatching,
 *   하나라도 빠지면 stopWatching(Android 백그라운드 잡·질문 알림까지 끈다).
 * - 권한: 온보딩 전에는 절대 묻지 않는다. 온보딩 완료 후에도 미결정이면 그때 1회 묻는다
 *   (온보딩 화면이 먼저 requestPermission을 불렀다면 이미 결정돼 팝업이 다시 뜨지 않는다).
 * - 직렬 큐: 연속 스크린샷은 한 번에 하나씩 처리한다(동시 업로드 폭주·race 방지).
 * - 캐치업: 감지 시작 직후·포그라운드 복귀 시 checkNow()로 리스너 부재 동안의 항목을 회수한다.
 *
 * 루트 레이아웃에서 1회 마운트한다(AutoCaptureGate).
 */
export function useAutoCapture(): void {
  const startCapture = useCaptureStore((state) => state.startCapture);
  const autoCapture = useSettingsStore((state) => state.autoCapture);
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  const toast = useToast();

  // 직렬 처리 체인. 새 작업은 이전 처리 완료 후 시작된다.
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  // 권한 거부 안내는 세션당 1회만(반복 토스트 방지).
  const warnedPermissionRef = useRef(false);
  // 권한 팝업은 세션당 1회만. why: Android는 check로 "거부"와 "미결정"을 구분하지 못하고,
  // 팝업이 닫히며 생기는 포그라운드 복귀가 sync를 다시 불러 팝업이 연달아 뜰 수 있다.
  const askedPermissionRef = useRef(false);
  // sync 중복 실행 방지(설정 변경과 포그라운드 복귀가 겹칠 때).
  const syncingRef = useRef(false);

  // 스크린샷 이벤트 구독 + 딥링크 → 직렬 큐로 처리.
  // (감지 시작은 아래 effect가 담당 — 리스너가 먼저 등록돼야 이벤트가 유실되지 않는다.)
  useEffect(() => {
    // iOS 전용: 앱 비활성 중 받은 이벤트 보관함(활성화 시 처리).
    const heldWhileInactive: CaptureAskPayload[] = [];
    const subscription = addScreenshotListener((payload) => {
      enqueue(() => handleScreenshot(payload));
    });

    // 네이티브 질문 알림(JobScheduler 게시)의 본문("열어서 보기") 탭 딥링크 처리.
    // memsum://?autoSaveUri=...&autoSaveToken=... 로 앱을 열어 여기서 파이프라인을 잇는다.
    const handledUrls = new Set<string>();
    const handleDeepLink = (url: string | null): void => {
      if (!url || handledUrls.has(url)) return;
      handledUrls.add(url);
      try {
        const parsed = Linking.parse(url);
        const rawUri = parsed.queryParams?.autoSaveUri;
        const rawToken = parsed.queryParams?.autoSaveToken;
        const uri = typeof rawUri === 'string' && rawUri.length > 0 ? rawUri : undefined;
        if (!uri) return;
        // 위조 방지: MediaStore 이미지 uri 형태 + 알림이 만든 1회용 토큰이 모두 맞아야 한다.
        if (!MEDIA_STORE_IMAGE_URI.test(uri)) return;
        if (typeof rawToken !== 'string' || !consumeAskToken(rawToken)) return;
        // 같은 항목이 옵저버/캐치업 경로로 이미 처리됐다면 중복 저장하지 않는다.
        if (processedIds.has(uri)) return;
        rememberProcessed(processedIds, uri);
        const input = toCaptureInput({ uri });
        if (!input) return;
        enqueue(async () => {
          await runPipeline(input);
        });
      } catch (error) {
        console.error('[auto-capture] 딥링크 처리 실패:', error);
      }
    };
    const linkSub = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
    void Linking.getInitialURL()
      .then(handleDeepLink)
      .catch(() => {
        /* 무시 */
      });

    // iOS: 비활성 동안 받아 둔 이벤트를 활성화되면 처리한다(handleScreenshot 참고).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      for (const held of heldWhileInactive.splice(0)) {
        enqueue(() => handleScreenshot(held));
      }
    });

    return () => {
      subscription.remove();
      linkSub.remove();
      appStateSub.remove();
    };

    /** 직렬 큐에 작업을 넣는다(이전 작업 완료 후 실행, 실패는 로깅 후 계속). */
    function enqueue(job: () => Promise<void>): void {
      chainRef.current = chainRef.current.then(job).catch((error) => {
        console.error('[auto-capture] 큐 처리 실패:', error);
      });
    }

    /** 단일 스크린샷 처리: 설정·중복 가드 → 포그라운드면 즉시, 백그라운드면 질문 알림. */
    async function handleScreenshot(payload: CaptureAskPayload): Promise<void> {
      const screenshotId = payload.assetId ?? payload.uri ?? '';
      if (!screenshotId || processedIds.has(screenshotId)) return;

      // 콜백은 stale 클로저이므로 최신 설정값을 store에서 직접 읽는다.
      if (!useSettingsStore.getState().autoCapture) return;

      const input = toCaptureInput(payload);
      if (!input) return; // 지원되지 않는 페이로드(예: uri 없는 iOS 이벤트)는 조용히 무시.

      if (AppState.currentState !== 'active') {
        // Android: 질문 알림은 네이티브 잡(ScreenshotAskJobService)이 단일 게시한다.
        // 사용자가 응답하지 않은 채 앱으로 돌아오면 캐치업(checkNow)이 자동 처리한다
        // ([무시]한 항목은 네이티브가 캐치업에서 뺀다).
        // iOS: 네이티브가 보낸 순간 sentIds로 "보냄" 처리해 checkNow가 다시 보내지 않는다 —
        // 여기서 버리면 영구 누락되므로 활성화될 때까지 보관했다가 처리한다.
        if (Platform.OS === 'ios') {
          heldWhileInactive.push(payload);
          if (heldWhileInactive.length > INACTIVE_HOLD_MAX) heldWhileInactive.shift();
        }
        return;
      }

      // 앱 사용 중: 묻지 않고 조용히 정리한다(무음 정책 — 저장되면 목록 갱신이 곧 피드백).
      rememberProcessed(processedIds, screenshotId);
      await runPipeline(input);
    }

    /**
     * 파이프라인 실행 — 무음 정책: 성공해도 알리지 않는다(목록 자동 갱신이 피드백).
     * 실패만 포그라운드 토스트로 알린다(데이터 유실은 사용자가 알아야 함).
     * 글자 없는 스크린샷(skipped)은 실패가 아니므로 알리지 않는다.
     */
    async function runPipeline(input: StartCaptureInput): Promise<void> {
      let saved = false;
      let skipped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          startCapture(input, { silent: true }),
          new Promise<{ saved: boolean; skipped?: boolean }>((resolve) => {
            timer = setTimeout(() => resolve({ saved: false }), PIPELINE_TIMEOUT_MS);
          }),
        ]);
        saved = result.saved;
        skipped = result.skipped === true;
      } catch (error) {
        console.error('[auto-capture] 처리 실패:', error);
      } finally {
        // 파이프라인이 먼저 끝나면 경쟁 타이머를 해제한다(큐가 길 때 타이머 누적 방지).
        if (timer !== undefined) clearTimeout(timer);
      }

      if (!saved && !skipped && AppState.currentState === 'active') {
        toast.show({ tone: 'danger', title: t('autoCapture.error') });
      }
    }
  }, [startCapture, toast]);

  // 감지 on/off 동기화: 온보딩·설정·권한 상태가 바뀌거나 앱이 포그라운드로 돌아올 때.
  useEffect(() => {
    // 웹(개발용 미리보기)에는 사진첩 감지가 없다 — 권한 안내 토스트도 띄우지 않는다.
    if (Platform.OS === 'web') return;
    if (!settingsHydrated || !onboardingHydrated) return;
    const enabled = onboardingCompleted && autoCapture;
    let cancelled = false;

    const sync = async (): Promise<void> => {
      if (!enabled) {
        stopWatching();
        return;
      }
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await syncEnabled();
      } finally {
        syncingRef.current = false;
      }
    };

    const syncEnabled = async (): Promise<void> => {
      let status = await getPermissionStatus();
      // 온보딩이 끝난 뒤에만 도달한다 — 아직 안 물어봤으면 지금(세션당 1회) 묻는다.
      if (status === 'undetermined' && !askedPermissionRef.current) {
        askedPermissionRef.current = true;
        status = await requestPermission();
      }
      if (cancelled) return;
      if (status === 'granted' || status === 'limited') {
        // 리스너 등록 후 시작(위 effect가 먼저 실행됨) → 직후 캐치업으로 부트/부재 구간 회수.
        startWatching();
        checkNow();
      } else {
        stopWatching();
        if (!warnedPermissionRef.current) {
          warnedPermissionRef.current = true;
          toast.show({ tone: 'warning', title: t('autoCapture.permissionNeeded') });
        }
        return;
      }
      // 질문 알림(Android)용 알림 권한 — 거부돼도 포그라운드 경로는 동작한다.
      if (Platform.OS === 'android') {
        await ensureNotificationPermission();
      }
    };

    void sync();

    // 포그라운드 복귀: 설정 앱에서 권한을 바꿨을 수 있어 재동기화 + 캐치업
    // (백그라운드 동결/서스펜드 중 찍힌 스크린샷 회수).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync();
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
    };
  }, [settingsHydrated, onboardingHydrated, onboardingCompleted, autoCapture, toast]);
}

/** 처리 완료 id 기록 + 상한 초과 시 가장 오래된 항목 제거(FIFO). */
function rememberProcessed(ids: Set<string>, id: string): void {
  ids.add(id);
  if (ids.size > PROCESSED_IDS_MAX) {
    const oldest = ids.values().next().value;
    if (oldest !== undefined) ids.delete(oldest);
  }
}

/**
 * 네이티브 스크린샷 페이로드 → startCapture 입력.
 * iOS도 네이티브가 임시 파일 uri를 함께 보내므로(업로드용), uri 없으면 처리 불가로 본다.
 */
function toCaptureInput(payload: CaptureAskPayload): StartCaptureInput | null {
  if (Platform.OS === 'android') {
    if (!payload.uri) return null;
    return {
      imageUri: payload.uri,
      sourcePlatform: 'android',
      uri: payload.uri,
    };
  }
  // iOS: OCR은 assetId(PHAsset), 업로드는 네이티브가 내려준 임시 파일 uri를 쓴다.
  // uri가 없으면(내보내기 실패 등) 업로드가 불가능하므로 시작하지 않는다(오탐 토스트 방지).
  if (!payload.assetId || !payload.uri) return null;
  return {
    imageUri: payload.uri,
    sourcePlatform: 'ios',
    assetId: payload.assetId,
    uri: payload.uri,
  };
}
