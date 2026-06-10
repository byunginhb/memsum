// src/lib/captures.ts
//
// Memsum — 캡처 데이터 레이어 (Week 4, W4-A).
// captures 테이블 조회(리스트·검색·상세) + 비공개 버킷 썸네일 서명 URL 채우기.
//
// 모든 조회는 익명 세션 + RLS("own captures": auth.uid() = user_id)에 의존한다.
// 따라서 수동 user_id 필터는 불필요하다(RLS가 본인 행만 노출). 세션이 없으면
// RLS가 빈 결과를 돌려주므로 에러가 아니라 빈 목록이 정상 동작이다.
//
// 썸네일: image_url은 captures-raw 버킷의 상대 경로({uid}/{capId}.jpg)다.
// 비공개 버킷이라 조회 시점에 서명 URL을 생성한다. N개를 개별 생성하면
// N round-trip이므로 createSignedUrls(복수형 batch API)로 1회에 채운다.

import type { CaptureEvent } from '@/features/capture/types';
import type {
  CaptureListItem,
  CaptureListPage,
  ListCapturesArgs,
  SearchCapturesArgs,
} from '@/features/captures/types';
import { normalizeCategory } from '@/lib/categories';
import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 캡처 원본 버킷 id (0002_storage.sql). storage.ts와 동일. */
const BUCKET = 'captures-raw';

/** 썸네일 서명 URL 만료(초). 1시간. 리스트 1회 렌더링 동안 충분하다. */
const THUMBNAIL_TTL_SEC = 60 * 60;

/** 목록 기본 페이지 크기. */
const DEFAULT_LIST_LIMIT = 20;

/** 검색 기본 결과 수. */
const DEFAULT_SEARCH_LIMIT = 30;

/**
 * 조회 컬럼 화이트리스트. select('*')를 피하고 UI가 쓰는 컬럼만 가져온다
 * (불필요한 전송량·우발적 컬럼 노출 방지).
 */
const SELECT_COLUMNS =
  'id, image_url, ocr_text, parsed_event, source_platform, status, category, calendar_event_id, calendar_html_link, created_at';

// ── 내부 타입 ─────────────────────────────────────────────────────────────────

/**
 * captures.parsed_event jsonb 구조.
 * process-capture가 저장하는 형태: { title, summary, event | null }.
 * (event는 CaptureEvent 또는 null.)
 */
type ParsedEvent = {
  title?: string | null;
  summary?: string | null;
  event?: CaptureEvent | null;
};

/** captures 테이블 row(SELECT_COLUMNS 기준). 외부 입력이라 모두 nullable로 본다. */
type CaptureRow = {
  id: string;
  image_url: string | null;
  ocr_text: string | null;
  parsed_event: ParsedEvent | null;
  source_platform: string | null;
  status: string | null;
  category: string | null;
  calendar_event_id: string | null;
  calendar_html_link: string | null;
  created_at: string;
};

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * 제목 폴백: parsed_event.title → ocr_text 첫 줄 → 빈 문자열.
 * '(제목 없음)' 같은 i18n 라벨은 호출(표시) 측 책임이므로 여기서는 빈 문자열만 돌려준다.
 */
function deriveTitle(parsed: ParsedEvent | null, ocrText: string | null): string {
  const fromParsed = parsed?.title?.trim();
  if (fromParsed) return fromParsed;

  const firstLine = ocrText?.split('\n')[0]?.trim();
  if (firstLine) return firstLine;

  return '';
}

/**
 * captures row → CaptureListItem 정규화.
 * thumbnailUrl은 여기서 null로 두고, attachThumbnails가 batch로 채운다.
 */
function rowToItem(row: CaptureRow): CaptureListItem {
  const parsed = row.parsed_event ?? null;
  const event = parsed?.event ?? null;

  return {
    id: row.id,
    title: deriveTitle(parsed, row.ocr_text),
    summary: parsed?.summary?.trim() ?? '',
    ocrText: row.ocr_text ?? '',
    createdAt: row.created_at,
    thumbnailUrl: null,
    imagePath: row.image_url,
    hasEvent: event !== null,
    event,
    status: row.status ?? 'pending',
    category: normalizeCategory(row.category, event !== null),
    calendarEventId: row.calendar_event_id,
    calendarHtmlLink: row.calendar_html_link,
  };
}

/**
 * ILIKE 패턴 이스케이프.
 *
 * ILIKE 와일드카드는 %(임의 길이)와 _(임의 1글자)다. 사용자 입력에 이 문자가
 * 들어오면 의도치 않은 매칭이 되므로 백슬래시로 이스케이프한다. 백슬래시 자체도
 * 이스케이프 문자라 먼저 처리한다(순서 중요: \ → % → _).
 *
 * 인젝션 안전: supabase-js는 .or() 필터 값을 PostgREST 쿼리 문자열로 보낸다.
 * 콤마·괄호는 PostgREST 필터 구분자라 값에 그대로 들어가면 필터 구조가 깨질 수
 * 있다. 따라서 콤마·괄호는 공백으로 치환해 부분일치 검색 의미를 유지하면서
 * 필터 파싱을 안전하게 만든다.
 */
function escapeLikePattern(raw: string): string {
  return raw
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[,()]/g, ' ');
}

/**
 * createSignedUrls(batch)로 여러 경로의 서명 URL을 1회에 만든다.
 * 경로→URL 맵을 돌려주며, 실패하거나 누락된 경로는 맵에 없다(호출 측에서 null 폴백).
 *
 * 왜 맵인가: createSignedUrls는 입력 순서대로 결과를 주지만, 중복 경로 제거 후
 * 다시 항목에 매핑하려면 경로 키가 더 안전하다.
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
      // 썸네일 실패는 치명적이지 않다(목록은 보여야 한다). graceful: 빈 맵.
      console.warn(
        '[captures] 썸네일 batch 서명 실패:',
        error?.message ?? '알 수 없는 오류',
      );
      return result;
    }

    for (const entry of data) {
      // 개별 경로 실패(entry.error)는 건너뛴다 → 해당 항목 thumbnailUrl=null.
      if (entry.path && entry.signedUrl && !entry.error) {
        result.set(entry.path, entry.signedUrl);
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : '알 수 없는 오류';
    console.warn('[captures] signPaths 실패:', message);
    return result;
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 항목들의 imagePath로 썸네일 서명 URL을 batch 생성해 채워 돌려준다(불변).
 * 실패하거나 경로가 없는 항목은 thumbnailUrl=null로 유지한다(graceful).
 */
export async function attachThumbnails(
  items: CaptureListItem[],
): Promise<CaptureListItem[]> {
  // 유효 경로만 모아 중복 제거(같은 경로 중복 서명 round-trip 낭비 방지).
  const uniquePaths = Array.from(
    new Set(
      items
        .map((item) => item.imagePath)
        .filter((path): path is string => path !== null && path.length > 0),
    ),
  );

  const urlByPath = await signPaths(uniquePaths);

  // 불변성: 새 배열·새 객체로 thumbnailUrl만 채운다.
  return items.map((item) => {
    const url = item.imagePath ? urlByPath.get(item.imagePath) ?? null : null;
    return { ...item, thumbnailUrl: url };
  });
}

/**
 * 캡처 목록을 created_at desc 커서 페이지네이션으로 조회한다.
 *
 * RLS가 본인 행만 노출하므로 user_id 필터는 두지 않는다.
 * nextCursor는 가져온 개수가 limit과 같을 때만(다음 페이지가 있을 수 있을 때만)
 * 마지막 항목의 created_at으로 채운다.
 */
export async function listCaptures(
  args: ListCapturesArgs = {},
): Promise<CaptureListPage> {
  const { cursor = null, limit = DEFAULT_LIST_LIMIT } = args;
  const supabase = getSupabase();

  try {
    let query = supabase
      .from('captures')
      .select(SELECT_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit);

    // 커서가 있으면 그 시각보다 과거(미만) 행만(중복 없는 다음 페이지).
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`캡처 목록 조회 실패: ${error.message}`);
    }

    const rows = (data ?? []) as CaptureRow[];
    const items = await attachThumbnails(rows.map(rowToItem));

    // limit만큼 채워졌을 때만 다음 페이지가 있을 수 있다.
    const nextCursor =
      items.length === limit ? items[items.length - 1].createdAt : null;

    return { items, nextCursor };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '캡처 목록을 불러오는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] listCaptures 실패:', message);
    throw new Error(message);
  }
}

/**
 * ocr_text 또는 parsed_event.title 부분일치(ILIKE) 검색 + 카테고리 필터.
 *
 * - query·category 둘 다 비면 즉시 [](네트워크 호출 없음).
 * - category만 있고 query가 비면 카테고리 단독 조회(ILIKE 없이 해당 묶음 전체).
 * - query가 있으면 ILIKE 부분일치, category가 함께 있으면 AND로 좁힌다.
 *
 * 와일드카드는 이스케이프해 사용자가 입력한 %, _ 를 리터럴로 취급한다(인젝션·오매칭 방지).
 * .or() 문법: PostgREST는 "col.ilike.패턴" 을 콤마로 OR 연결한다.
 * 패턴 양끝에 %를 붙여 부분일치로 만든다.
 */
export async function searchCaptures(
  args: SearchCapturesArgs,
): Promise<CaptureListItem[]> {
  const { query, limit = DEFAULT_SEARCH_LIMIT, category } = args;
  const trimmed = query.trim();

  // query·category 둘 다 없으면 검색 의미가 없다 → 즉시 빈 결과(호출 비용 0).
  if (trimmed.length === 0 && !category) return [];

  const supabase = getSupabase();

  try {
    let queryBuilder = supabase.from('captures').select(SELECT_COLUMNS);

    // query가 있을 때만 ILIKE OR 필터를 적용(카테고리 단독 조회는 텍스트 필터 없음).
    if (trimmed.length > 0) {
      const pattern = `%${escapeLikePattern(trimmed)}%`;
      const orFilter = `ocr_text.ilike.${pattern},parsed_event->>title.ilike.${pattern}`;
      queryBuilder = queryBuilder.or(orFilter);
    }

    // 카테고리 필터는 텍스트 필터와 AND로 결합된다.
    if (category) {
      queryBuilder = queryBuilder.eq('category', category);
    }

    const { data, error } = await queryBuilder
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`캡처 검색 실패: ${error.message}`);
    }

    const rows = (data ?? []) as CaptureRow[];
    return attachThumbnails(rows.map(rowToItem));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '캡처 검색 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] searchCaptures 실패:', message);
    throw new Error(message);
  }
}

/**
 * 단건 캡처 조회. 없거나(RLS로 미노출 포함) 행이 0개면 null.
 */
export async function getCapture(id: string): Promise<CaptureListItem | null> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('captures')
      .select(SELECT_COLUMNS)
      .eq('id', id)
      // 0행일 때 에러 대신 null을 받기 위해 maybeSingle 사용.
      .maybeSingle();

    if (error) {
      throw new Error(`캡처 조회 실패: ${error.message}`);
    }

    if (!data) return null;

    const [item] = await attachThumbnails([rowToItem(data as CaptureRow)]);
    return item ?? null;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '캡처를 불러오는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] getCapture 실패:', message);
    throw new Error(message);
  }
}

/**
 * 이벤트(parsed_event.event)가 감지된 캡처만 최신순으로 조회한다(캘린더 탭용).
 *
 * PostgREST `.not('parsed_event->event','is',null)` 로 jsonb 하위키가 null이 아닌 행만 거른다.
 * (category='event'로 거르면 날짜 있는 마케팅 전단 등 일부 이벤트를 놓치므로 event 존재로 판별.)
 * 등록 여부(calendar_event_id)는 결과의 각 항목으로 UI가 판단한다.
 */
export async function listEventCaptures(
  limit = DEFAULT_LIST_LIMIT,
): Promise<CaptureListItem[]> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from('captures')
      .select(SELECT_COLUMNS)
      .not('parsed_event->event', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`이벤트 캡처 조회 실패: ${error.message}`);
    }

    const rows = (data ?? []) as CaptureRow[];
    return attachThumbnails(rows.map(rowToItem));
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '이벤트 캡처를 불러오는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] listEventCaptures 실패:', message);
    throw new Error(message);
  }
}

/**
 * 단건 캡처를 영구 삭제한다(이미지 Storage 객체 + DB row).
 *
 * 이미지(있으면)를 먼저 best-effort로 지우고(실패해도 경고만 — 고아 이미지 < 고아 행),
 * captures row를 삭제한다. RLS로 본인 행만 지워지며 report_feedback은 FK cascade로 함께 정리된다.
 * 캘린더에 이미 등록된 일정(구글 캘린더 이벤트)은 사용자 캘린더에 그대로 둔다(이 앱 데이터만 삭제).
 */
export async function deleteCapture(
  captureId: string,
  imagePath: string | null,
): Promise<void> {
  const supabase = getSupabase();

  try {
    // 1) 이미지 Storage 객체 삭제(있으면). 실패는 치명적이지 않으므로 경고 후 진행.
    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([imagePath]);
      if (storageError) {
        console.warn('[captures] 이미지 삭제 실패(계속 진행):', storageError.message);
      }
    }

    // 2) captures row 삭제(RLS로 본인 행만). 명시적으로 id 한정.
    const { error } = await supabase.from('captures').delete().eq('id', captureId);
    if (error) {
      throw new Error(`캡처 삭제 실패: ${error.message}`);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '캡처를 삭제하는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] deleteCapture 실패:', message);
    throw new Error(message);
  }
}

/** 캘린더 등록 결과 기록 입력. */
export type MarkCalendarRegisteredArgs = {
  captureId: string;
  eventId: string;
  htmlLink: string | null;
  /** 동기화 시각 ISO8601. 호출 측이 등록 시점을 넘긴다. */
  syncedAt: string;
};

/**
 * 캡처에 구글 캘린더 등록 결과(event id·htmlLink·시각)와 status='calendar_added'를 기록한다.
 *
 * RLS로 본인 행만 갱신되며, 대상 행이 없으면(타인·삭제됨) 오류를 던진다.
 * 등록 자체(events.insert)는 이미 성공한 뒤이므로, 여기 실패는 "캘린더엔 등록됐으나
 * 앱 DB 반영 실패" 상태다. 호출 측(calendar-store)이 이를 사용자에게 구분해 안내한다.
 */
export async function markCaptureCalendarRegistered(
  args: MarkCalendarRegisteredArgs,
): Promise<void> {
  const { captureId, eventId, htmlLink, syncedAt } = args;
  const supabase = getSupabase();

  try {
    const { error } = await supabase
      .from('captures')
      .update({
        calendar_event_id: eventId,
        calendar_html_link: htmlLink,
        calendar_synced_at: syncedAt,
        status: 'calendar_added',
      })
      .eq('id', captureId);

    if (error) {
      throw new Error(`캘린더 등록 결과 저장 실패: ${error.message}`);
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '캘린더 등록 결과를 저장하는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[captures] markCaptureCalendarRegistered 실패:', message);
    throw new Error(message);
  }
}
