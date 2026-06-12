// src/lib/notifications.ts
//
// 알림 정책: 평소에는 완전 무음(저장/정리 결과 알림 없음), 주 1회 리포트만 "짜잔".
// - 질문 알림("저장할까요?")은 네이티브(ScreenshotAskJobService)가 단일 게시한다.
// - 이 모듈은 주간 리포트 예약 알림(기본 일요일 저녁)만 담당한다.
// 푸시(APNs/FCM) 자격증명은 필요 없다 — 전부 로컬 알림이다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

// 주간 리포트 알림 채널(Android). 주 1회의 하이라이트라 헤드업(HIGH)으로 띄운다.
const CHANNEL_WEEKLY = 'weekly-report';

/** 주간 리포트 예약 알림 식별자(같은 id로 재예약하면 교체된다). */
const WEEKLY_IDENTIFIER = 'weekly-report';

/** 기본 발송 시각: 일요일 저녁 7시(기기 로컬 시간 기준). */
const WEEKLY_WEEKDAY_SUNDAY = 1; // expo/iOS 규약: 1 = 일요일
const WEEKLY_HOUR = 19;
const WEEKLY_MINUTE = 0;

/** 스크린샷 페이로드(네이티브 이벤트·딥링크 공용 형태). */
export type CaptureAskPayload = {
  assetId?: string;
  uri?: string;
};

// 포그라운드 수신 시 표시 정책: 배너·목록 표시, 소리·배지는 끔.
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
    await Notifications.setNotificationChannelAsync(CHANNEL_WEEKLY, {
      name: '주간 리포트',
      importance: Notifications.AndroidImportance.HIGH,
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
 * 주간 리포트 알림을 예약한다(매주 일요일 저녁, 반복).
 * 같은 식별자로 재호출하면 교체되므로 멱등이다. 권한 거부 시 false(다음 기동 때 재시도).
 * 탭하면 data.url로 리포트 화면을 연다(응답 처리: use-weekly-report-notification).
 */
export async function scheduleWeeklyReportNotification(): Promise<boolean> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;
    await ensureChannels();

    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_IDENTIFIER,
      content: {
        title: t('weeklyNotif.title'),
        body: t('weeklyNotif.body'),
        data: { url: '/report/weekly' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: WEEKLY_WEEKDAY_SUNDAY,
        hour: WEEKLY_HOUR,
        minute: WEEKLY_MINUTE,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_WEEKLY } : null),
      },
    });
    return true;
  } catch (error) {
    console.error('[notifications] 주간 알림 예약 실패:', error);
    return false;
  }
}

/** 주간 리포트 예약 알림을 해제한다(설정 토글 OFF). */
export async function cancelWeeklyReportNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WEEKLY_IDENTIFIER);
  } catch (error) {
    console.error('[notifications] 주간 알림 해제 실패:', error);
  }
}
