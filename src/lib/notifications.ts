// src/lib/notifications.ts
//
// 로컬 알림 래퍼 (expo-notifications).
// 자동 캡처가 앱 백그라운드에서 스크린샷을 정리·저장했을 때, 인앱 토스트는 보이지
// 않으므로 시스템 로컬 알림으로 결과를 알린다("감지되면 알림"의 실제 구현).
// 푸시(APNs/FCM) 자격증명은 필요 없다 — 전부 로컬 알림이다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Android 알림 채널 id(8.0+ 필수). 캡처 결과 알림 전용.
const CHANNEL_ID = 'captures';

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

async function ensureChannel(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
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

/**
 * 즉시 로컬 알림을 띄운다(best-effort — 실패해도 캡처 저장 자체에는 영향 없음).
 * 권한이 없으면 조용히 무시한다(호출 측 분기 단순화).
 */
export async function notifyLocal(title: string, body?: string): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body ?? undefined },
      // null trigger = 즉시 표시.
      trigger: null,
    });
  } catch (error) {
    console.error('[notifications] 로컬 알림 실패:', error);
  }
}
