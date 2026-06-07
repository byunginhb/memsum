// src/lib/weekly-report.ts
//
// Memsum — 주간 리포트 데이터 레이어 (Hero Moment).
// weekly-report Edge Function 호출 + items.imagePath → 썸네일 서명 URL 채움 + 정규화.
// report_feedback up/down upsert(supabase-js, RLS).
//
// 썸네일 서명 로직은 captures.ts(attachThumbnails)와 동일하지만, 공유 파일 수정 회피를
// 위해 여기서 batch 서명 로직을 자체 복제한다(작은 중복 < 결합도 증가).
//
// 모든 호출은 익명 세션 + RLS에 의존한다. 세션이 없으면 함수가 401을 주므로
// 명확한 메시지로 표면화한다.

import { FunctionsHttpError } from '@supabase/supabase-js';

import type {
  ReportFeedback,
  WeeklyReport,
  WeeklyReportItem,
} from '@/features/report/types';
import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 호출할 Edge Function 이름. */
const FUNCTION_NAME = 'weekly-report';

/** report_feedback 테이블 이름. */
const FEEDBACK_TABLE = 'report_feedback';

/** 캡처 원본 버킷 id (0002_storage.sql). captures.ts와 동일. */
const BUCKET = 'captures-raw';

/** 썸네일 서명 URL 만료(초). 1시간. 화면 1회 렌더에 충분. */
const THUMBNAIL_TTL_SEC = 60 * 60;

// ── 내부 타입(Edge Function snake_case 응답) ──────────────────────────────────

type RawReportItem = {
  capture_id?: unknown;
  rank?: unknown;
  title?: unknown;
  summary?: unknown;
  image_path?: unknown;
};

type RawWeeklyReport = {
  week_start?: unknown;
  week_end?: unknown;
  total_captures?: unknown;
  items?: unknown;
};

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * Edge Function이 non-2xx로 반환한 본문에서 { error } 메시지를 추출한다.
 * (api.ts extractFunctionErrorMessage와 동일 패턴 — 공유 파일 수정 회피로 자체 복제.)
 */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === 'string' && body.error.length > 0) {
        return body.error;
      }
    } catch {
      // 본문이 JSON이 아니거나 비어 있으면 기본 메시지로 폴백.
    }
    return 'weekly-report 처리 중 서버 오류가 발생했습니다.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'weekly-report 호출에 실패했습니다.';
}

/**
 * 여러 경로의 썸네일 서명 URL을 batch(createSignedUrls)로 1회에 만든다.
 * 경로→URL 맵을 반환. 실패·누락 경로는 맵에 없다(호출 측 null 폴백).
 * 썸네일 실패는 치명적이지 않다(리포트는 보여야 한다) → graceful.
 */
async function signPaths(paths: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (paths.length === 0) return result;

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, THUMBNAIL_TTL_SEC);

    if (error || !data) {
      console.warn(
        '[weekly-report] 썸네일 batch 서명 실패:',
        error?.message ?? '알 수 없는 오류',
      );
      return result;
    }

    for (const entry of data) {
      if (entry.path && entry.signedUrl && !entry.error) {
        result.set(entry.path, entry.signedUrl);
      }
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    console.warn('[weekly-report] signPaths 실패:', message);
    return result;
  }
}

/** 한 raw 항목 → WeeklyReportItem 정규화(thumbnailUrl·feedback은 후속 단계에서 채움). */
function normalizeItem(raw: unknown, index: number): WeeklyReportItem {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as RawReportItem;
  return {
    captureId: typeof r.capture_id === 'string' ? r.capture_id : '',
    rank: typeof r.rank === 'number' ? r.rank : index + 1,
    title: typeof r.title === 'string' ? r.title : '',
    summary: typeof r.summary === 'string' ? r.summary : '',
    imagePath: typeof r.image_path === 'string' ? r.image_path : null,
    thumbnailUrl: null,
    feedback: null,
  };
}

/** 함수 응답(unknown) → WeeklyReport 계약 정규화 + 썸네일 서명 URL 채움(불변). */
async function normalizeReport(raw: unknown): Promise<WeeklyReport> {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('weekly-report 응답이 비어 있거나 형식이 올바르지 않습니다.');
  }
  const obj = raw as RawWeeklyReport;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items = rawItems
    .map((it, i) => normalizeItem(it, i))
    .filter((it) => it.captureId.length > 0);

  // 썸네일 서명 — 유효 경로만 중복 제거 후 batch 서명.
  const uniquePaths = Array.from(
    new Set(
      items
        .map((it) => it.imagePath)
        .filter((p): p is string => p !== null && p.length > 0),
    ),
  );
  const urlByPath = await signPaths(uniquePaths);

  const withThumbs = items.map((it) => ({
    ...it,
    thumbnailUrl: it.imagePath ? urlByPath.get(it.imagePath) ?? null : null,
  }));

  return {
    weekStart: typeof obj.week_start === 'string' ? obj.week_start : '',
    weekEnd: typeof obj.week_end === 'string' ? obj.week_end : '',
    totalCaptures: typeof obj.total_captures === 'number' ? obj.total_captures : 0,
    items: withThumbs,
  };
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 주간 리포트를 가져온다. weekStart 미지정 시 함수가 현재 주(KST 월요일)를 계산한다.
 *
 * @param weekStart "YYYY-MM-DD"(KST 월요일). 미지정 시 이번 주.
 * @throws 세션이 없거나, 함수가 오류를 반환하거나, 응답 형식이 어긋날 때.
 */
export async function getWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
  const supabase = getSupabase();

  // invoke가 자동 첨부하는 JWT가 이 세션에서 온다. 사전 확인으로 명확한 메시지 제공.
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('[weekly-report] 세션 조회 실패:', sessionError.message);
    throw new Error('세션 확인에 실패했습니다. 다시 로그인해 주세요.');
  }
  if (!session) {
    throw new Error('로그인 세션이 없습니다. 먼저 인증이 필요합니다.');
  }

  try {
    // week_start 미지정 시 빈 본문 → 함수가 현재 주를 계산한다.
    const requestBody = weekStart ? { week_start: weekStart } : {};
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: requestBody,
    });

    if (error) {
      const message = await extractFunctionErrorMessage(error);
      throw new Error(message);
    }

    return await normalizeReport(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'weekly-report 호출 중 알 수 없는 오류가 발생했습니다.';
    console.error('[weekly-report] getWeeklyReport 실패:', message);
    throw new Error(message);
  }
}

/**
 * 리포트 항목(캡처)에 up/down 피드백을 저장한다(report_feedback upsert).
 * 같은 (user, report, capture)는 1행만 — 재선택 시 rating 갱신.
 *
 * weeklyReportId 식별을 위해 weekStart로 본인 weekly_reports 행을 조회한다(RLS).
 * 실패는 graceful: 에러를 throw하되 호출 측(훅)이 낙관적 업데이트를 롤백한다.
 *
 * @throws 세션·리포트 조회·upsert 실패 시.
 */
export async function submitFeedback(
  weekStart: string,
  captureId: string,
  rating: Exclude<ReportFeedback, null>,
): Promise<void> {
  const supabase = getSupabase();

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error('로그인 세션이 없어 피드백을 저장할 수 없습니다.');
  }

  const userId = session.user.id;

  try {
    // 피드백을 연결할 weekly_reports 행 id 조회(RLS로 본인 행만 노출).
    const { data: report, error: reportError } = await supabase
      .from('weekly_reports')
      .select('id')
      .eq('week_start', weekStart)
      .maybeSingle();

    if (reportError) {
      throw new Error(`리포트 조회 실패: ${reportError.message}`);
    }
    if (!report) {
      throw new Error('대상 주간 리포트를 찾지 못했습니다.');
    }

    const { error: upsertError } = await supabase.from(FEEDBACK_TABLE).upsert(
      {
        user_id: userId,
        capture_id: captureId,
        weekly_report_id: (report as { id: string }).id,
        rating,
      },
      { onConflict: 'user_id,weekly_report_id,capture_id' },
    );

    if (upsertError) {
      throw new Error(`피드백 저장 실패: ${upsertError.message}`);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '피드백 저장 중 알 수 없는 오류가 발생했습니다.';
    console.error('[weekly-report] submitFeedback 실패:', message);
    throw new Error(message);
  }
}
