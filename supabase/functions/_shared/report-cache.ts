// supabase/functions/_shared/report-cache.ts
//
// 주간 리포트 캐시 재사용 판단 — 순수 함수(Deno 전역/외부 의존 없음, Jest에서 테스트).
//
// why: 예전에는 그 주 행이 한 번 생기면 영구 고정돼, 월요일에 1장으로 만든 "빈 리포트"가
// 주중 캡처가 늘어도 그대로였다. 진행 중인 주는 캡처 변화가 있으면 다시 만들고,
// 지난 주는 더 바뀌지 않으므로(비용 절감) 캐시를 그대로 쓴다.

export type CachedReportMeta = {
  /** 행의 locale(legacy null은 ko로 간주). */
  readonly locale: string | null;
  readonly total_captures: number | null;
  /** 생성(갱신) 시각 ISO. 없으면 언제 만들었는지 몰라 진행 중 주에선 재생성한다. */
  readonly generated_at: string | null;
};

export type CurrentWeekState = {
  /** 그 주 현재 캡처 수. */
  readonly weekCount: number;
  /** 그 주 가장 최근 캡처 created_at ISO(없으면 null). */
  readonly latestCaptureAt: string | null;
};

/**
 * 캐시를 그대로 돌려줘도 되는지.
 * - 언어가 다르면 재생성(사용자가 앱 언어를 바꿈).
 * - 지난 주: 언어만 맞으면 재사용.
 * - 진행 중인 주: 캡처 수가 그대로이고 생성 이후 새 캡처가 없을 때만 재사용
 *   (수가 줄어든 삭제도 반영하려고 "다름"으로 비교한다).
 */
export function canReuseCachedReport(
  cached: CachedReportMeta,
  locale: string,
  isCurrentWeek: boolean,
  current: CurrentWeekState | null,
): boolean {
  const cachedLocale = cached.locale === "en" ? "en" : "ko";
  if (cachedLocale !== locale) return false;
  if (!isCurrentWeek) return true;
  if (!current) return false;

  if ((cached.total_captures ?? -1) !== current.weekCount) return false;
  if (current.latestCaptureAt === null) return true;
  if (cached.generated_at === null) return false;

  const generatedMs = Date.parse(cached.generated_at);
  const latestMs = Date.parse(current.latestCaptureAt);
  if (Number.isNaN(generatedMs) || Number.isNaN(latestMs)) return false;
  return latestMs <= generatedMs;
}
