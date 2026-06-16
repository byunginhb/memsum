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

// 택배 상태 전이 알림 채널(Android). 배송 출발/완료는 즉시 확인 가치가 커 헤드업(HIGH).
const CHANNEL_PARCEL = 'parcel-status';

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
    await Notifications.setNotificationChannelAsync(CHANNEL_PARCEL, {
      name: '택배 상태',
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

/** 택배 상태 전이 알림 입력(즉시 표시). 탭하면 해당 추적 상세로 이동한다. */
export type ParcelNotificationInput = {
  /** parcel_tracks.id — 탭 시 상세 라우팅 키. */
  trackId: string;
  /** 표시용 택배사명(없으면 "택배"로 폴백). */
  carrierName: string;
  /** estimate 시간대 문구(있으면 본문에 포함). */
  estimate?: string | null;
  /** 배송완료 시각 문구(delivered 본문용). */
  deliveredAt?: string | null;
};

/**
 * 택배 상태 전이 알림을 즉시 표시한다(예약 아님 — trigger:null).
 * 푸시/원격이 아니라 클라이언트 폴링이 상태 전이를 감지했을 때 직접 게시하는 로컬 알림이다.
 * 권한 거부 시 false. 실패해도 throw하지 않는다(폴링 흐름을 막지 않음).
 */
async function presentParcelNotification(
  title: string,
  body: string,
  trackId: string,
): Promise<boolean> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { url: `/parcel/${trackId}` },
      },
      // trigger:null → 즉시 표시.
      trigger: null,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_PARCEL } : null),
    });
    return true;
  } catch (error) {
    console.error('[notifications] 택배 알림 표시 실패:', error);
    return false;
  }
}

/**
 * 배송 출발(level 5) 알림 — "오늘 도착 예상". estimate 유무에 따라 본문 분기.
 * 단정형 금지(가능성형 i18n 카피 사용).
 */
export async function presentParcelOutForDelivery(
  input: ParcelNotificationInput,
): Promise<boolean> {
  const carrier = input.carrierName.length > 0 ? input.carrierName : t('parcel.sectionTitle');
  const hasTime = typeof input.estimate === 'string' && input.estimate.length > 0;
  const body = hasTime
    ? t('push.parcel.outForDelivery.bodyWithTime', { time: input.estimate as string })
    : t('push.parcel.outForDelivery.bodyNoTime');
  return presentParcelNotification(
    t('push.parcel.outForDelivery.title', { carrier }),
    body,
    input.trackId,
  );
}

/** 배송 완료(level 6) 알림 — 도착 시각 문구를 본문에 포함. */
export async function presentParcelDelivered(
  input: ParcelNotificationInput,
): Promise<boolean> {
  const carrier = input.carrierName.length > 0 ? input.carrierName : t('parcel.sectionTitle');
  const date = typeof input.deliveredAt === 'string' && input.deliveredAt.length > 0
    ? input.deliveredAt
    : '';
  return presentParcelNotification(
    t('push.parcel.delivered.title', { carrier }),
    t('push.parcel.delivered.body', { date }),
    input.trackId,
  );
}
