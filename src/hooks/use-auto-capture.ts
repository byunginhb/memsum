import { useEffect, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';

import { useToast } from '@/design/components/Toast/useToast';
import { t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';
import { useSettingsStore } from '@/stores/settings-store';

import { addScreenshotListener } from '../../modules/photo-library-watcher';
import type { StartCaptureInput } from '@/stores/capture-store';

/**
 * 스크린샷 자동 감지 → 백그라운드 캡처 훅.
 *
 * 앱의 핵심 가치(스크린샷을 알아서 정리). 네이티브 photo-library-watcher가 새 스크린샷을
 * 감지하면, 설정의 autoCapture가 켜져 있을 때 capture-store.startCapture(silent)로
 * 업로드→온디바이스 OCR→GPT 처리→저장 파이프라인을 백그라운드로 돌린다(확인 Sheet 없이).
 * 저장되면 savedCount 증가로 홈/검색/캘린더 목록이 자동 새로고침된다.
 *
 * 권한: Android 13+는 READ_MEDIA_IMAGES 런타임 권한이 필요하다(미부여 시 네이티브
 * ContentObserver의 MediaStore 쿼리가 비어 이벤트가 안 온다). iOS는 네이티브 모듈이
 * PHPhotoLibrary 권한을 자동 요청한다.
 *
 * 루트 레이아웃에서 1회 마운트한다(AutoCaptureGate).
 */
export function useAutoCapture(): void {
  const startCapture = useCaptureStore((state) => state.startCapture);
  const autoCapture = useSettingsStore((state) => state.autoCapture);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const toast = useToast();

  // 이미 처리한 스크린샷 id(중복 트리거 방지). 네이티브에도 lastSeenId 캐시가 있지만
  // 재구독/재렌더 사이의 중복까지 막기 위해 JS에서도 한 번 더 가드한다.
  const processedIds = useRef<Set<string>>(new Set());

  // 설정 복원 후 autoCapture가 켜져 있으면 Android 미디어 권한을 1회 요청한다.
  useEffect(() => {
    if (!hydrated || !autoCapture || Platform.OS !== 'android') return;
    void requestAndroidMediaPermission();
  }, [hydrated, autoCapture]);

  // 스크린샷 이벤트 구독 → 백그라운드 캡처.
  useEffect(() => {
    const subscription = addScreenshotListener((payload) => {
      void handleScreenshot(payload);
    });

    return () => {
      subscription.remove();
    };

    // 단일 스크린샷을 처리한다(설정 가드·중복 가드·백그라운드 캡처·결과 토스트).
    async function handleScreenshot(payload: {
      assetId?: string;
      uri?: string;
    }): Promise<void> {
      const screenshotId = payload.assetId ?? payload.uri ?? '';
      if (!screenshotId || processedIds.current.has(screenshotId)) return;

      // 콜백은 stale 클로저이므로 최신 설정값을 store에서 직접 읽는다.
      if (!useSettingsStore.getState().autoCapture) return;
      processedIds.current.add(screenshotId);

      const input = toCaptureInput(payload);
      if (!input) return;

      toast.show({ tone: 'info', title: t('autoCapture.detected') });

      // startCapture는 내부 실패 시 throw하지 않고 error 단계로 둔다. 성공 판별은
      // savedCount 증가로 한다(done에 도달할 때만 증가).
      const before = useCaptureStore.getState().savedCount;
      try {
        await startCapture(input, { silent: true });
      } catch (error) {
        console.error('[auto-capture] 처리 실패:', error);
      }
      const succeeded = useCaptureStore.getState().savedCount > before;
      toast.show({
        tone: succeeded ? 'success' : 'danger',
        title: succeeded ? t('autoCapture.saved') : t('autoCapture.error'),
      });
    }
  }, [startCapture, toast]);
}

/** 네이티브 스크린샷 페이로드 → startCapture 입력. uri가 없으면(잘못된 페이로드) null. */
function toCaptureInput(payload: {
  assetId?: string;
  uri?: string;
}): StartCaptureInput | null {
  if (Platform.OS === 'android') {
    if (!payload.uri) return null;
    return {
      imageUri: payload.uri,
      sourcePlatform: 'android',
      uri: payload.uri,
    };
  }
  // iOS: OCR은 assetId로 하지만 업로드용 file uri 확보는 별도 작업(추후). assetId만 전달.
  if (!payload.assetId) return null;
  return {
    imageUri: payload.uri ?? '',
    sourcePlatform: 'ios',
    assetId: payload.assetId,
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
