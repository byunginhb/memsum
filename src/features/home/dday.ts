// D-day 헬퍼 — 임박 일정 카드용 날짜 표시 문구.
// eta-text.ts와 동일한 톤: 단정형 금지, 파싱 실패 시 폴백 반환(앱 크래시 방지).
// now를 인자로 받아 렌더 순수성 유지(Date.now() 직접 호출 금지).

import { getLocale, t } from '@/i18n';

/** ISO8601 → epoch ms. 파싱 실패 시 NaN 반환. */
function toEpoch(iso: string): number {
  return new Date(iso).getTime();
}

/**
 * 로컬 타임 자정 기준으로 두 epoch ms 사이의 날짜 차이를 계산한다.
 * 양수 = 미래, 0 = 오늘, 음수 = 과거(호출자가 양수인지 확인할 책임).
 */
function localDayDiff(targetMs: number, nowMs: number): number {
  const nowDate = new Date(nowMs);
  const targetDate = new Date(targetMs);
  const nowMidnight = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    nowDate.getDate(),
  ).getTime();
  const targetMidnight = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  ).getTime();
  return Math.round((targetMidnight - nowMidnight) / 86_400_000);
}

/**
 * D-day 배지 텍스트 — "오늘" / "내일" / "D-N".
 * UpcomingSection 히어로 숫자 강조 표시용.
 * @param startsAt ISO8601 (KST) 문자열.
 * @param now 현재 시각 epoch ms.
 */
export function dDayBadge(startsAt: string, now: number): string {
  const target = toEpoch(startsAt);
  if (Number.isNaN(target)) return t('home.upcoming.dday.fallback');
  const diff = localDayDiff(target, now);
  if (diff <= 0) return t('home.upcoming.dday.today');
  if (diff === 1) return t('home.upcoming.dday.tomorrow');
  return t('home.upcoming.dday.n', { n: diff });
}

/**
 * 임박 일정 카드용 D-day 라벨 — "오늘/내일/D-N · 시각".
 * 스크린리더 a11y 합성 및 elevated 카드 부제목에 사용한다.
 * @param startsAt ISO8601 (KST) 문자열.
 * @param now 현재 시각 epoch ms (Date.now() 대신 인자로 받아 렌더 순수성 유지).
 * @returns 표시용 문구. 파싱 실패 시 폴백 문구(앱 크래시 방지).
 */
export function dDayLabel(startsAt: string, now: number): string {
  const target = toEpoch(startsAt);
  if (Number.isNaN(target)) return t('home.upcoming.dday.fallback');

  const localeCode = getLocale() === 'ko' ? 'ko-KR' : 'en-US';
  const timeStr = new Date(target).toLocaleString(localeCode, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const badge = dDayBadge(startsAt, now);
  return `${badge} · ${timeStr}`;
}
