// 뽑힌 일정의 날짜·시각 표기 — 캡처 시트·홈 "다가오는 것"이 같이 쓴다(상세 화면도 맞출 수 있게 공용).

import { getLocale } from '@/i18n';

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const KO_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export type EventWhen = {
  /** ko "10.06", en "Oct 6". mono로 그린다. */
  date: string;
  /** "14:00" (24시간). */
  time: string;
  /** ko "화", en "Tue". */
  weekday: string;
  /** 스크린리더용 완전한 문장형. */
  spoken: string;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * ISO8601 → 날짜·시각 조각. 기기 시간대 기준으로 보여 준다(사용자가 있는 곳의 시각).
 * 파싱 실패면 null — 호출측은 원문 대신 줄을 숨긴다(원시 타임스탬프 노출 금지).
 */
export function formatEventWhen(iso: string): EventWhen | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const isKo = getLocale() === 'ko';
  const month = d.getMonth();
  const day = d.getDate();
  const date = isKo ? `${pad2(month + 1)}.${pad2(day)}` : `${EN_MONTHS[month]} ${day}`;
  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const weekday = (isKo ? KO_WEEKDAYS : EN_WEEKDAYS)[d.getDay()];
  const spoken = d.toLocaleString(isKo ? 'ko-KR' : 'en-US', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  return { date, time, weekday, spoken };
}
