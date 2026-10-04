// D-day 표기 — 홈 "놓치면 안 돼요" 목록의 왼쪽 열(원격 #3 이식).
// now를 인자로 받아 렌더 순수성을 지키고(Date.now() 직접 호출 금지), 파싱 실패는 폴백 문구로 돌린다.

import { t } from '@/i18n';

const MS_PER_DAY = 86_400_000;

/**
 * 기기 시간대 자정 기준 날짜 차이. 양수 = 미래, 0 = 오늘, 음수 = 과거.
 * 파싱 실패면 null.
 */
export function localDayDiff(startsAt: string, now: number): number | null {
  const target = new Date(startsAt);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(now);
  const nowMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  // 서머타임 전환일(23/25시간)도 반올림으로 하루로 센다.
  return Math.round((targetMidnight - nowMidnight) / MS_PER_DAY);
}

/** D-day 배지 — "오늘" / "내일" / "D-N". 지난 일정도 "오늘"로 묶는다(목록은 다가오는 것만 받는다). */
export function dDayBadge(startsAt: string, now: number): string {
  const diff = localDayDiff(startsAt, now);
  if (diff === null) return t('home.upcoming.dday.fallback');
  if (diff <= 0) return t('home.upcoming.dday.today');
  if (diff === 1) return t('home.upcoming.dday.tomorrow');
  return t('home.upcoming.dday.n', { n: diff });
}
