// src/lib/notifications.ts
//
// 로컬 알림 래퍼 (expo-notifications) — 결과 알림 전용.
// 질문 알림("저장할까요?")은 네이티브(ScreenshotAskJobService)가 단일 게시한다 —
// Android 동결 중에도 떠야 하고 [저장]이 앱을 열지 않아야 하기 때문(헤드리스 처리).
// 푸시(APNs/FCM) 자격증명은 필요 없다 — 전부 로컬 알림이다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 결과 알림 채널(Android 8.0+ 필수). 조용한 보조 알림(DEFAULT).
const CHANNEL_RESULT = 'captures';

/** 스크린샷 페이로드(네이티브 이벤트·딥링크 공용 형태). */
export type CaptureAskPayload = {
  assetId?: string;
  uri?: string;
};

// 포그라운드 수신 시 표시 정책: 배너·목록 표시, 소리·배지는 끔(조용한 보조 알림).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 채널 생성은 1회면 충분. 멱등이지만 호출 횟수를 줄이기 위해 플래그로 가드.
let channelReady = false;

async function ensureChannels(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_RESULT, {
      name: '캡처 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    channelReady = true;
  } catch (error) {
    console.error('[notifications] 채널 생성 실패:', error);
  }
}

/**
 * 알림 권한을 보장한다(미요청이면 요청). 거부돼도 throw하지 않고 false.
 * Android 13+의 POST_NOTIFICATIONS, iOS의 알림 권한을 모두 이 한 줄로 처리한다.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // 한 번도 묻지 않았거나 재요청 가능하면 요청한다.
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('[notifications] 권한 확인/요청 실패:', error);
    return false;
  }
}

/** Android는 채널 지정 즉시 트리거, iOS는 즉시(null). */
function immediateTrigger(
  channelId: string,
): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android' ? { channelId } : null;
}

/**
 * 즉시 결과 알림을 띄운다(best-effort — 실패해도 캡처 저장 자체에는 영향 없음).
 * 권한이 없으면 조용히 무시한다(호출 측 분기 단순화).
 */
export async function notifyLocal(title: string, body?: string): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body ?? undefined },
      trigger: immediateTrigger(CHANNEL_RESULT),
    });
  } catch (error) {
    console.error('[notifications] 로컬 알림 실패:', error);
  }
}
