// src/lib/stats.ts
//
// Memsum 홈 "이번 주 캡처" 통계 데이터 레이어.
// 이번 주(KST 월~일)에 생성된 캡처 수를 세어 진행률 위젯에 공급한다.
//
// 주 경계 계산은 weekly-report Edge Function(mondayOfWeekKst·weekBoundsUtc)과
// 동일해야 "이번 주" 정의가 클라이언트·서버 간 어긋나지 않는다. 그래서 같은 로직을
// 의도적으로 복제한다(공유 모듈이 없는 RN↔Deno 경계 때문). 상수도 동일하게 추출.
//
// 조회는 익명 세션 + RLS("own captures": auth.uid() = user_id)에 의존한다.
// 세션이 없으면 RLS가 0건을 돌려주므로 count=0이 정상 동작(에러 아님).

import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** KST 오프셋(ms). weekly-report와 동일. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/** 주간 캡처 목표 장수(진행률 분모). 화면 "{count}/{goal}". */
const WEEKLY_GOAL = 30;

// ── 타입 ─────────────────────────────────────────────────────────────────────

/**
 * 이번 주 캡처 통계. count는 실제 캡처 수, goal은 고정 목표,
 * weekStart/weekEnd는 KST 기준 주 경계 날짜("YYYY-MM-DD").
 */
export type WeeklyStats = {
  count: number;
  goal: number;
  weekStart: string;
  weekEnd: string;
};

// ── 내부 유틸 (weekly-report 동일 복제) ────────────────────────────────────────

/** Date(UTC 필드 기준) → "YYYY-MM-DD". */
function formatDateUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * 주어진 시점이 속한 주의 월요일(KST)을 "YYYY-MM-DD"로 반환.
 * UTC 시각에 KST 오프셋을 더해 "KST 벽시계"를 UTC 필드로 흉내낸다.
 */
function mondayOfWeekKst(base: Date): string {
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const day = kst.getUTCDay(); // 0=일 … 6=토
  // 월요일까지 되돌릴 일수: 일요일(0)은 6, 그 외 day-1.
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(kst.getTime() - diffToMonday * MS_PER_DAY);
  return formatDateUtc(monday);
}

/** "YYYY-MM-DD" + 일수 → "YYYY-MM-DD". */
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return formatDateUtc(new Date(d.getTime() + days * MS_PER_DAY));
}

/**
 * week_start(KST 월요일 00:00) ~ 다음 주 월요일 00:00 의 UTC ISO 경계.
 * captures.created_at(timestamptz) 범위 필터([fromUtc, toUtc))에 사용한다.
 */
function weekBoundsUtc(weekStart: string): { fromUtc: string; toUtc: string } {
  const startKstMs = new Date(`${weekStart}T00:00:00Z`).getTime() - KST_OFFSET_MS;
  const endKstMs = startKstMs + DAYS_PER_WEEK * MS_PER_DAY;
  return {
    fromUtc: new Date(startKstMs).toISOString(),
    toUtc: new Date(endKstMs).toISOString(),
  };
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 이번 주(KST 월~일) 생성된 캡처 수를 세어 WeeklyStats로 돌려준다.
 *
 * count는 head:true + count:'exact'로 행 본문 전송 없이 개수만 받는다
 * (전송량·지연 절감). 실패 시 throw(호출 측에서 graceful 처리).
 */
export async function countCapturesThisWeek(): Promise<WeeklyStats> {
  const supabase = getSupabase();

  const weekStart = mondayOfWeekKst(new Date());
  const weekEnd = addDays(weekStart, DAYS_PER_WEEK - 1); // 일요일
  const { fromUtc, toUtc } = weekBoundsUtc(weekStart);

  try {
    const { count, error } = await supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      // RLS로도 본인 행만 보이지만, 카운트 범위를 이번 주로 한정한다.
      .gte('created_at', fromUtc)
      .lt('created_at', toUtc);

    if (error) {
      throw new Error(`이번 주 캡처 수 조회 실패: ${error.message}`);
    }

    return {
      count: count ?? 0,
      goal: WEEKLY_GOAL,
      weekStart,
      weekEnd,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '이번 주 캡처 통계를 불러오는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[stats] countCapturesThisWeek 실패:', message);
    throw new Error(message);
  }
}
