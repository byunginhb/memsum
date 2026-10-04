import { getLocale } from '@/i18n';

/**
 * 캡처·일정 날짜 표기 헬퍼 — 자료실 카드·상세·캘린더 타임라인 공용.
 *
 * 숫자 표기(10.04, 09:41)는 mono 머리표에 그대로 들어가므로 로케일과 무관한 고정 형식을 쓰고,
 * 요일·월 이름처럼 언어가 드러나는 부분만 앱 로케일(ko/en)로 만든다(기기 로케일 의존 금지).
 */

function appLocale(): string {
  return getLocale() === 'ko' ? 'ko-KR' : 'en-US';
}

function parse(iso: string): Date | null {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** "10.04" — 카드·배지용 짧은 날짜. 파싱 실패 시 빈 문자열. */
export function formatShortDate(iso: string): string {
  const d = parse(iso);
  return d ? `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}` : '';
}

/** "09:41" — 24시간 시각. */
export function formatClock(iso: string): string {
  const d = parse(iso);
  return d ? `${pad2(d.getHours())}:${pad2(d.getMinutes())}` : '';
}

/** "2026.10.04 09:41" — 상세 메타 머리표. */
export function formatStamp(iso: string): string {
  const d = parse(iso);
  if (!d) return '';
  return `${d.getFullYear()}.${formatShortDate(iso)} ${formatClock(iso)}`;
}

/** 스크린리더용 긴 일시(“2026년 10월 12일 토요일 오후 2:00”). */
export function formatSpokenDateTime(iso: string): string {
  const d = parse(iso);
  if (!d) return iso;
  return d.toLocaleString(appLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export type DayParts = {
  /** ko "10월", en "Oct". */
  month: string;
  /** "12". */
  day: string;
  /** ko "토요일"(위의 "10월"과 헷갈리지 않게 긴 형식), en "Sat". */
  weekday: string;
  /** 기기 현재 날짜와 같은 날인지. */
  isToday: boolean;
};

/** 캘린더 타임라인 왼쪽 날짜 열 조각. 파싱 실패 시 null. */
export function dayParts(iso: string, now: Date = new Date()): DayParts | null {
  const d = parse(iso);
  if (!d) return null;
  return {
    month: d.toLocaleDateString(appLocale(), { month: 'short' }),
    day: String(d.getDate()),
    weekday: d.toLocaleDateString(appLocale(), {
      weekday: appLocale().startsWith('ko') ? 'long' : 'short',
    }),
    isToday:
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate(),
  };
}
