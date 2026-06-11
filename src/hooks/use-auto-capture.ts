import { useEffect, useRef } from 'react';
import { AppState, PermissionsAndroid, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as Notifications from 'expo-notifications';

import { useToast } from '@/design/components/Toast/useToast';
import { t } from '@/i18n';
import {
  CAPTURE_ASK_ACTION_DISMISS,
  CAPTURE_ASK_CATEGORY,
  ensureNotificationPermission,
  notifyCaptureAsk,
  notifyLocal,
} from '@/lib/notifications';
import { useCaptureStore } from '@/stores/capture-store';
import { useSettingsStore } from '@/stores/settings-store';

import {
  addScreenshotListener,
  checkNow,
  startWatching,
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
 */
const PIPELINE_TIMEOUT_MS = 90 * 1000;

/**
 * 스크린샷 자동 감지 훅.
 *
 * 앱의 핵심 가치(스크린샷을 알아서 정리). 네이티브 photo-library-watcher가 새 스크린샷을
 * 감지하면, 설정의 autoCapture가 켜져 있을 때:
 * - 앱 사용 중(포그라운드): 토스트와 함께 즉시 백그라운드 파이프라인
 *   (업로드→온디바이스 OCR→GPT→저장)을 돌린다.
 * - 다른 앱 사용 중(백그라운드): 상단 헤드업 알림으로 "Memsum에 저장할까요?"를 묻고,
 *   [저장](또는 본문 탭) 응답 시 파이프라인을 돌린다. [무시]는 폐기.
 *
 * - 직렬 큐: 연속 스크린샷은 한 번에 하나씩 처리한다(동시 업로드 폭주·race 방지).
 * - 결과 판별: startCapture의 반환값(saved)으로 성공을 판별한다(전역 카운터 폴링 race 제거).
 * - 권한: Android 13+ READ_MEDIA_IMAGES 런타임 권한을 요청하고, 거부 시 1회 안내한다.
 *   iOS는 네이티브 모듈이 PHPhotoLibrary 권한을 자동 요청한다.
 * - 캐치업: 구독 직후·포그라운드 복귀 시 checkNow()로 리스너 부재 동안의 항목을 회수한다.
 *
 * 루트 레이아웃에서 1회 마운트한다(AutoCaptureGate).
 */
export function useAutoCapture(): void {
  const startCapture = useCaptureStore((state) => state.startCapture);
  const autoCapture = useSettingsStore((state) => state.autoCapture);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const toast = useToast();

  // 이미 처리(질문 게시 포함)한 스크린샷 id. 삽입 순서를 유지하는 Set이므로
  // 상한 초과 시 가장 오래된 항목부터 제거한다(FIFO).
  const processedIds = useRef<Set<string>>(new Set());
  // 직렬 처리 체인. 새 작업은 이전 처리 완료 후 시작된다.
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  // 권한 거부 안내는 세션당 1회만(반복 토스트 방지).
  const warnedPermissionRef = useRef(false);

  // 설정 복원 후 autoCapture가 켜져 있으면 권한을 1회 확보한다.
  useEffect(() => {
    if (!hydrated || !autoCapture) return;
    void (async () => {
      // 미디어 권한(Android만 — iOS는 네이티브가 처리). 거부 시 자동 정리 불가를 안내.
      if (Platform.OS === 'android') {
        const granted = await requestAndroidMediaPermission();
        if (!granted && !warnedPermissionRef.current) {
          warnedPermissionRef.current = true;
          toast.show({ tone: 'warning', title: t('autoCapture.permissionNeeded') });
        }
      }
      // 질문/결과 알림용 알림 권한(거부돼도 포그라운드 토스트 경로는 동작).
      await ensureNotificationPermission();
    })();
  }, [hydrated, autoCapture, toast]);

  // 스크린샷 이벤트 구독 + 질문 알림 응답 구독 → 직렬 큐로 처리.
  useEffect(() => {
    // 같은 알림 응답이 리스너+콜드스타트 경로로 중복 전달되는 것을 막는다.
    const handledResponses = new Set<string>();

    const subscription = addScreenshotListener((payload) => {
      enqueue(() => handleScreenshot(payload));
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleAskResponse(response);
      },
    );
    // 앱이 종료 상태에서 알림 액션으로 시작된 경우의 응답을 회수한다.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleAskResponse(response);
      })
      .catch(() => {
        /* 미지원 환경 — 무시 */
      });

    // 네이티브 질문 알림(JobScheduler 게시)의 [저장]/본문 탭 딥링크 처리.
    // Android 동결 중 감지는 네이티브 잡이 알림을 띄우고, 저장 선택 시
    // memsum://?autoSaveUri=... 로 앱을 열어 여기서 파이프라인을 잇는다.
    const handledUrls = new Set<string>();
    const handleDeepLink = (url: string | null): void => {
      if (!url || handledUrls.has(url)) return;
      handledUrls.add(url);
      try {
        const parsed = Linking.parse(url);
        const rawUri = parsed.queryParams?.autoSaveUri;
        const uri = typeof rawUri === 'string' && rawUri.length > 0 ? rawUri : undefined;
        if (!uri) return;
        // 같은 항목이 옵저버/캐치업 경로로 이미 처리됐다면 중복 저장하지 않는다.
        if (processedIds.current.has(uri)) return;
        rememberProcessed(processedIds.current, uri);
        const input = toCaptureInput({ uri });
        if (!input) return;
        enqueue(async () => {
          if (AppState.currentState === 'active') {
            toast.show({ tone: 'info', title: t('autoCapture.detected') });
          }
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

    // 라이브 감지 시작(리스너 등록 후 — 리스너 없는 발화로 인한 유실 방지) +
    // 캐치업: JS 번들 로딩 중에 찍힌 스크린샷을 1회 회수한다.
    startWatching();
    checkNow();

    // 포그라운드 복귀 시 캐치업: 백그라운드 동결(Android cached-app freezer)·
    // 서스펜드(iOS) 중 찍힌 스크린샷을 복귀 시점에 회수한다.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        checkNow();
      }
    });

    return () => {
      subscription.remove();
      responseSub.remove();
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
      if (!screenshotId || processedIds.current.has(screenshotId)) return;

      // 콜백은 stale 클로저이므로 최신 설정값을 store에서 직접 읽는다.
      if (!useSettingsStore.getState().autoCapture) return;

      const input = toCaptureInput(payload);
      if (!input) return; // 지원되지 않는 페이로드(예: uri 없는 iOS 이벤트)는 조용히 무시.

      if (AppState.currentState !== 'active') {
        // 다른 앱 사용 중: 상단 헤드업으로 묻는다. 게시 성공 시에만 처리됨으로 마킹해,
        // 권한 거부 등으로 묻지 못한 항목은 앱 복귀 시 캐치업으로 다시 들어오게 한다.
        const posted = await notifyCaptureAsk({
          assetId: payload.assetId,
          uri: payload.uri,
        });
        if (posted) rememberProcessed(processedIds.current, screenshotId);
        return;
      }

      // 앱 사용 중: 묻지 않고 즉시 정리(토스트로 진행·결과 안내).
      rememberProcessed(processedIds.current, screenshotId);
      toast.show({ tone: 'info', title: t('autoCapture.detected') });
      await runPipeline(input);
    }

    /** 질문 알림 응답 처리: [저장]/본문 탭 → 파이프라인, [무시] → 폐기. */
    function handleAskResponse(
      response: Notifications.NotificationResponse,
    ): void {
      const request = response.notification.request;
      if (request.content.categoryIdentifier !== CAPTURE_ASK_CATEGORY) return;
      if (handledResponses.has(request.identifier)) return;
      handledResponses.add(request.identifier);

      // 트레이에 남은 알림 정리(액션 응답은 자동 제거되지 않는 플랫폼이 있다).
      void Notifications.dismissNotificationAsync(request.identifier).catch(
        () => {
          /* 이미 제거됨 — 무시 */
        },
      );

      // [무시]는 여기서 끝(폐기). 본문 탭(DEFAULT)·[저장]은 저장 의사로 본다.
      if (response.actionIdentifier === CAPTURE_ASK_ACTION_DISMISS) return;

      const data = request.content.data as CaptureAskPayload | undefined;
      const input = toCaptureInput({
        assetId: data?.assetId,
        uri: data?.uri,
      });
      if (!input) return;

      enqueue(async () => {
        if (AppState.currentState === 'active') {
          toast.show({ tone: 'info', title: t('autoCapture.detected') });
        }
        await runPipeline(input);
      });
    }

    /** 파이프라인 실행 + 결과 안내(포그라운드 토스트 / 백그라운드 시스템 알림). */
    async function runPipeline(input: StartCaptureInput): Promise<void> {
      // 성공 판별은 반환값으로(전역 savedCount 폴링은 동시 캡처에서 오판 — 리뷰 HIGH).
      // 타임아웃 race: 동결 중 끊긴 네트워크가 큐를 영구 차단하지 않게 한다.
      let saved = false;
      try {
        const result = await Promise.race([
          startCapture(input, { silent: true }),
          new Promise<{ saved: boolean }>((resolve) => {
            setTimeout(() => resolve({ saved: false }), PIPELINE_TIMEOUT_MS);
          }),
        ]);
        saved = result.saved;
      } catch (error) {
        console.error('[auto-capture] 처리 실패:', error);
      }

      // 결과 안내: 완료 시점의 앱 상태로 토스트/시스템 알림을 분기한다.
      const isActiveNow = AppState.currentState === 'active';
      if (saved) {
        if (isActiveNow) {
          toast.show({ tone: 'success', title: t('autoCapture.saved') });
        } else {
          await notifyLocal(t('autoCapture.notifTitle'), t('autoCapture.saved'));
        }
      } else if (isActiveNow) {
        // 실패는 포그라운드에서만 토스트(백그라운드 실패 알림은 소음 — 재시도 가능).
        toast.show({ tone: 'danger', title: t('autoCapture.error') });
      }
    }
  }, [startCapture, toast]);
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

/**
 * Android READ_MEDIA_IMAGES 런타임 권한을 요청한다.
 * 이미 허용돼 있으면 즉시 true. 거부돼도 앱은 계속 동작(수동 캡처는 가능).
 */
async function requestAndroidMediaPermission(): Promise<boolean> {
  try {
    const permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[auto-capture] 미디어 권한 요청 실패:', error);
    return false;
  }
}
