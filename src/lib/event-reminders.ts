// src/lib/event-reminders.ts
//
// 이벤트 전날 리마인드 오케스트레이션 — 하루 1건 묶음의 단일 진실.
//
// 등록된 이벤트 캡처 목록을 "리마인드 날짜(이벤트 날짜 YYYYMMDD)"별로 그룹핑하고,
// 각 그룹을 scheduleEventReminder로 예약한다.
// - 하루 1건: 같은 날 이벤트가 여러 개여도 identifier=reminder-YYYYMMDD 고정으로 교체.
// - 과거 시각: getReminderDate가 null을 반환해 자동 스킵.
// - iOS 상한(64개) 고려: 가까운 MAX_REMINDER_DAYS일치만 예약하고 앱 기동 시 롤링 재예약.

import type { CaptureListItem } from '@/features/captures/types';
import {
  cancelAllEventReminders,
  getReminderDate,
  scheduleEventReminder,
} from '@/lib/notifications';

// iOS 예약 알림 상한(64개)에 여유분을 두고 최대 30일치 고유 날짜만 예약한다.
const MAX_REMINDER_DAYS = 30;

/** starts_at(ISO8601 KST) → 이벤트 날짜 키(YYYYMMDD). 파싱 실패 시 빈 문자열. */
function dateKeyFromStartsAt(startsAt: string): string {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}${mo}${da}`;
}

/**
 * 이벤트 캡처 목록을 전날 리마인드 날짜별로 그룹핑하고,
 * 각 그룹에 대해 하루 1건 묶음 알림을 멱등 재예약한다.
 *
 * 전략: 전체 취소 → 재예약. 이벤트 추가·변경·삭제 모두 이 한 번의 호출로 반영된다.
 * 호출 빈도가 낮아(savedCount 변화 또는 설정 변경 시) 전체 취소 비용은 무시 가능하다.
 *
 * @param items listEventCaptures()가 반환한 이벤트 캡처 목록.
 * @param hour  전날 발송 시각(0-23, 기기 로컬 시간). settings-store의 eventReminderHour.
 * @param minute 전날 발송 분(고정 0).
 */
export async function syncEventReminders(
  items: CaptureListItem[],
  hour: number,
  minute: number,
): Promise<void> {
  // 기존 리마인드 예약 전체 취소 후 재예약 — 이벤트 삭제/시각 변경 모두 반영.
  await cancelAllEventReminders();

  const now = Date.now();

  type Group = {
    dateKey: string;
    reminderMs: number;
    items: { title: string; startsAt: string }[];
  };

  const groups = new Map<string, Group>();

  for (const item of items) {
    if (!item.event?.starts_at) continue;
    const dateKey = dateKeyFromStartsAt(item.event.starts_at);
    if (!dateKey) continue;

    // 전날 리마인드 시각이 이미 과거면 이 그룹 자체를 건너뜀.
    const reminderDate = getReminderDate(dateKey, hour, minute);
    if (!reminderDate || reminderDate.getTime() <= now) continue;

    const entry = { title: item.event.title, startsAt: item.event.starts_at };
    const existing = groups.get(dateKey);
    if (existing) {
      existing.items.push(entry);
    } else {
      groups.set(dateKey, { dateKey, reminderMs: reminderDate.getTime(), items: [entry] });
    }
  }

  // 가까운 순으로 정렬, 상한 이내만 예약.
  const sorted = [...groups.values()]
    .sort((a, b) => a.reminderMs - b.reminderMs)
    .slice(0, MAX_REMINDER_DAYS);

  // 병렬 예약. 실패해도 개별 scheduleEventReminder 내 try/catch가 조용히 넘긴다.
  await Promise.all(
    sorted.map((group) =>
      scheduleEventReminder({
        dateKey: group.dateKey,
        hour,
        minute,
        items: group.items,
        deepLinkUrl: '/calendar',
      }),
    ),
  );
}
