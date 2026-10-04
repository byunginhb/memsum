// 홈 상단(머리표·헤드라인) 계산 — 화면과 분리한 순수 함수라 단위 테스트로 고정한다.

import type { Locale } from '@/i18n';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
/** 월요일 + 3일 = 목요일. 주가 두 달에 걸치면 목요일이 속한 달의 주로 센다(ISO 주차 규칙). */
const THURSDAY_OFFSET_DAYS = 3;

const EN_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export type WeekLabelParts = {
  /** ko: "10", en: "Oct". */
  month: string;
  /** 그 달의 몇째 주(1~5). */
  week: number;
};

/**
 * 주 시작(월요일 "YYYY-MM-DD") → "10월 1주"용 조각.
 *
 * why 목요일 기준: 9/28(월)~10/4(일)처럼 달을 걸치는 주를 "9월 5주"라 부르면 어색하다.
 * 목요일이 속한 달·날짜로 세면 그 주의 과반(4일)이 있는 달이 된다.
 */
export function weekLabelParts(weekStart: string, locale: Locale): WeekLabelParts | null {
  const monday = new Date(`${weekStart}T00:00:00Z`);
  if (Number.isNaN(monday.getTime())) return null;
  const thursday = new Date(monday.getTime() + THURSDAY_OFFSET_DAYS * MS_PER_DAY);
  const monthIndex = thursday.getUTCMonth();
  const week = Math.ceil(thursday.getUTCDate() / DAYS_PER_WEEK);
  const month = locale === 'ko' ? String(monthIndex + 1) : EN_MONTHS[monthIndex];
  return { month, week };
}

export type HeadlineKind = 'events' | 'parcels' | 'captures' | 'quietWeek' | 'empty';

export type HeadlineInput = {
  /** 아직 지나지 않은(다가오는) 일정 수. */
  upcomingEvents: number;
  /** 배송 중인 택배 수. */
  activeParcels: number;
  /** 이번 주 캡처 수. */
  captures: number;
  /** 지금까지 캡처가 한 장이라도 있는지. */
  hasAny: boolean;
};

/**
 * 헤드라인으로 무엇을 말할지 고른다 — "놓치지 않게"(안전망) 축.
 * 앞으로 챙길 것이 먼저다: 다가오는 일정 > 오는 중인 택배 > 이번 주 기억해 둔 캡처 장수.
 * 챙길 게 없으면 quietWeek, 캡처가 아예 없으면 empty(가져오기 행동을 붙인다).
 */
export function pickHeadline(input: HeadlineInput): { kind: HeadlineKind; count: number } {
  if (!input.hasAny) return { kind: 'empty', count: 0 };
  if (input.upcomingEvents > 0) return { kind: 'events', count: input.upcomingEvents };
  if (input.activeParcels > 0) return { kind: 'parcels', count: input.activeParcels };
  if (input.captures > 0) return { kind: 'captures', count: input.captures };
  return { kind: 'quietWeek', count: 0 };
}
