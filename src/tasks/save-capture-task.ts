// 백그라운드 [저장] 헤드리스 태스크 (Android).
//
// 질문 알림의 [저장] 액션 → SaveCaptureReceiver → HeadlessJsTaskService가 이 태스크를
// 화면 없이 실행한다(앱 전환 없음 — 사용자 작업 비방해). 업로드→온디바이스 OCR→GPT→저장
// 파이프라인(capture-store.startCapture silent)을 그대로 재사용하고, 결과는 시스템
// 알림으로만 알린다. 등록: 루트 index.js의 AppRegistry('MemsumSaveCapture').

import {
  isProcessedScreenshot,
  markProcessedScreenshot,
} from '@/hooks/use-auto-capture';
import { t } from '@/i18n';
import { notifyLocal } from '@/lib/notifications';
import { useCaptureStore } from '@/stores/capture-store';

import { markHandled } from '../../modules/photo-library-watcher';

/** 네이티브 인텐트 extras (ScreenshotAskJobService의 EXTRA_* 키와 1:1). */
type SaveCaptureTaskData = {
  uri?: string;
  media_id?: number;
  notif_id?: number;
};

export async function saveCaptureTask(
  data: SaveCaptureTaskData | undefined,
): Promise<void> {
  const uri =
    typeof data?.uri === 'string' && data.uri.length > 0 ? data.uri : null;
  if (!uri) return;

  // 다른 경로(옵저버/캐치업/딥링크)가 이미 처리한 항목이면 중복 저장하지 않는다.
  if (isProcessedScreenshot(uri)) return;
  markProcessedScreenshot(uri);

  let saved = false;
  try {
    const result = await useCaptureStore.getState().startCapture(
      { imageUri: uri, sourcePlatform: 'android', uri },
      { silent: true },
    );
    saved = result.saved;
  } catch (error) {
    console.error('[save-capture-task] 백그라운드 저장 실패:', error);
  }

  // 네이티브 마커 전진 — 다음 앱 실행/복귀 시 캐치업이 같은 항목을 재발화하지 않게.
  if (typeof data?.media_id === 'number' && Number.isFinite(data.media_id)) {
    markHandled(data.media_id);
  }

  // 앱은 백그라운드(화면 없음)이므로 결과는 시스템 알림으로만 알린다.
  await notifyLocal(
    t('autoCapture.notifTitle'),
    saved ? t('autoCapture.saved') : t('autoCapture.error'),
  );
}
