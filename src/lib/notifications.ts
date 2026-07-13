// src/lib/notifications.ts
//
// 알림 정책: 평소에는 완전 무음(저장/정리 결과 알림 없음), 주 1회 리포트만 "짜잔".
// - 질문 알림("저장할까요?")은 네이티브(ScreenshotAskJobService)가 단일 게시한다.
// - 이 모듈은 주간 리포트 예약 알림(기본 일요일 저녁)과
//   이벤트 전날 리마인드(하루 1건 묶음)를 담당한다.
// 푸시(APNs/FCM) 자격증명은 필요 없다 — 전부 로컬 알림이다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

// 주간 리포트 알림 채널(Android). 주 1회의 하이라이트라 헤드업(HIGH)으로 띄운다.
const CHANNEL_WEEKLY = 'weekly-report';

// 택배 상태 전이 알림 채널(Android). 배송 출발/완료는 즉시 확인 가치가 커 헤드업(HIGH).
const CHANNEL_PARCEL = 'parcel-status';

// 이벤트 전날 리마인드 채널(Android). 하루 1건 묶음 알림이라 헤드업(HIGH)으로 띄운다.
const CHANNEL_EVENT_REMINDER = 'event-reminder';

/** 주간 리포트 예약 알림 식별자(같은 id로 재예약하면 교체된다). */
export const WEEKLY_IDENTIFIER = 'weekly-report';

/** 이벤트 리마인드 식별자 접두사. 날짜 키(YYYYMMDD)를 붙여 하루 1건 고정. */
const REMINDER_ID_PREFIX = 'reminder-';

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
    await Notifications.setNotificationChannelAsync(CHANNEL_EVENT_REMINDER, {
      name: '일정 리마인드',
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

// ── 이벤트 전날 리마인드 ─────────────────────────────────────────────────────

/** 묶음 리마인드 알림 단일 항목. */
export type EventReminderItem = {
  title: string;
  /** ISO8601 KST — 발송 시각 포맷에 사용. */
  startsAt: string;
};

/** scheduleEventReminder 입력. */
export type ScheduleEventReminderInput = {
  /** 이벤트 날짜 키(YYYYMMDD) — 식별자 생성·전날 계산 기준. */
  dateKey: string;
  /** 전날 발송 시각(0-23, 기기 로컬 시간). */
  hour: number;
  /** 전날 발송 분. */
  minute: number;
  /** 묶음 알림에 표시할 이벤트 목록. */
  items: EventReminderItem[];
  /** 탭 시 이동할 딥링크 경로(예: '/calendar'). */
  deepLinkUrl: string;
};

/**
 * 이벤트 날짜 키(YYYYMMDD)와 발송 시각으로 전날 리마인드 절대 시각을 계산한다.
 * 기기 로컬 시간 기준. 계산된 시각이 현재보다 과거면 null(예약 스킵).
 */
export function getReminderDate(dateKey: string, hour: number, minute: number): Date | null {
  const y = parseInt(dateKey.slice(0, 4), 10);
  const mo = parseInt(dateKey.slice(4, 6), 10) - 1; // 0-indexed
  const d = parseInt(dateKey.slice(6, 8), 10);
  // 이벤트 당일 기준으로 전날(d-1)의 hour:minute 절대 시각.
  const trigger = new Date(y, mo, d - 1, hour, minute, 0, 0);
  return trigger.getTime() <= Date.now() ? null : trigger;
}

/** 시작 시각(ISO8601)을 "HH:MM" 포맷으로 변환. 파싱 실패 시 빈 문자열. */
function formatEventTime(startsAt: string): string {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * 단건/묶음 알림 제목·본문 생성.
 * 단건: "{title} · {time}"
 * 다건: "일정 {count}건 — {title1} {time1}, {title2} …" (최대 3건 요약)
 */
function buildReminderContent(items: EventReminderItem[]): { title: string; body: string } {
  const notifTitle = t('eventReminder.notif.title');

  if (items.length === 1) {
    const item = items[0];
    const time = formatEventTime(item.startsAt);
    const body = time
      ? t('eventReminder.notif.body', { title: item.title, time })
      : item.title;
    return { title: notifTitle, body };
  }

  const summary = items
    .slice(0, 3)
    .map((item) => {
      const time = formatEventTime(item.startsAt);
      return time ? `${item.title} ${time}` : item.title;
    })
    .join(', ');

  const body = t('eventReminder.notif.bundleBody', {
    count: String(items.length),
    summary,
  });
  return { title: notifTitle, body };
}

/**
 * 특정 이벤트 날짜의 묶음 리마인드 알림을 예약한다.
 * 식별자=`reminder-{dateKey}`로 고정해 같은 날 재예약은 교체(하루 1건 보장).
 * 전날 시각이 이미 과거면 false(스킵). 권한 거부도 false.
 */
export async function scheduleEventReminder(
  input: ScheduleEventReminderInput,
): Promise<boolean> {
  try {
    const triggerDate = getReminderDate(input.dateKey, input.hour, input.minute);
    if (!triggerDate) return false;

    const granted = await ensureNotificationPermission();
    if (!granted) return false;
    await ensureChannels();

    const { title, body } = buildReminderContent(input.items);
    const identifier = `${REMINDER_ID_PREFIX}${input.dateKey}`;

    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title,
        body,
        data: { url: input.deepLinkUrl },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_EVENT_REMINDER } : null),
      },
    });
    return true;
  } catch (error) {
    console.error('[notifications] 이벤트 리마인드 예약 실패:', error);
    return false;
  }
}

/** 특정 이벤트 날짜의 리마인드 예약을 해제한다. */
export async function cancelEventReminder(dateKey: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${REMINDER_ID_PREFIX}${dateKey}`);
  } catch (error) {
    console.error('[notifications] 이벤트 리마인드 해제 실패:', error);
  }
}

/**
 * `reminder-` 접두사를 가진 이벤트 리마인드 예약을 모두 해제한다.
 * 이벤트 삭제·설정 OFF·전체 재동기화 직전에 호출한다.
 */
export async function cancelAllEventReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch (error) {
    console.error('[notifications] 이벤트 리마인드 전체 해제 실패:', error);
  }
}
