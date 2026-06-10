// supabase/functions/weekly-report/index.ts
//
// Memsum — 주간 5줄 리포트(Hero Moment) Edge Function (Deno).
// 한 주(week_start ~ week_end)의 캡처 중 "다시 볼 가치가 큰" 상위 5개를
// gpt-4o-mini로 선별·랭킹·한줄요약한다. 결과는 weekly_reports 테이블에 캐시한다.
//
// 동작 요약 (POST body: { week_start?: "YYYY-MM-DD" }):
//   1) JWT → userId 확보 (RLS 컨텍스트 유지).
//   2) weekly_reports 캐시 조회. 있으면 즉시 반환 (OpenAI 0회 — 비용·지연 절감).
//   3) 없으면 그 주 captures 조회.
//      - 캡처 < 5건: OpenAI 미호출. items:[] 캐시 후 반환(빈 상태는 화면이 안내).
//      - 캡처 ≥ 5건: gpt-4o-mini로 5개 선별·랭킹·한줄요약(json_object 강제).
//        OpenAI 실패(백오프 소진) 시 created_at desc 상위 5개로 폴백.
//   4) weekly_reports upsert(주당 1행, unique(user_id, week_start)) 후 반환.
//
// OpenAI 키는 절대 클라이언트에 두지 않고 이 Edge Function의 시크릿으로만 사용한다
// (CLAUDE.md §7). 키는 process-capture와 공유한다(OPENAI_API_KEY).
//
// ─────────────────────────────────────────────────────────────────────────────
// 배포:
//   supabase secrets set OPENAI_API_KEY=sk-...        # process-capture와 공유(이미 있으면 생략)
//   supabase functions deploy weekly-report           # 배포
//   supabase functions serve weekly-report --env-file ./supabase/.env  # 로컬
//
// 런타임 자동 주입 시크릿: SUPABASE_URL, SUPABASE_ANON_KEY
// 별도 설정 시크릿: OPENAI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

// 지수 백오프: 1s, 2s, 4s, 8s, 16s — 최대 5회 (process-capture와 동일 정책).
const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000] as const;

// OpenAI 단일 호출 타임아웃.
const OPENAI_TIMEOUT_MS = 30000;

// 주간 리포트가 성립하는 최소 캡처 수. 미만이면 OpenAI를 부르지 않는다.
const MIN_CAPTURES_FOR_REPORT = 5;

// 선별·노출할 리포트 항목 수(5줄 리포트).
const REPORT_ITEM_COUNT = 5;

// OpenAI 입력 토큰 절약: 캡처당 OCR 텍스트를 앞 N자만 보낸다.
const OCR_TRUNCATE_LEN = 300;

// 한 주 범위를 넘겨 후보를 받되, 입력 비용을 막기 위해 상한을 둔다.
const MAX_CANDIDATES = 50;

// KST. 주(월~일) 경계 계산 기준 타임존.
const TIMEZONE = "Asia/Seoul";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

// ── 타입 ─────────────────────────────────────────────────────────────────────

interface WeeklyReportBody {
  readonly week_start?: string;
}

// captures 테이블에서 후보로 가져오는 최소 컬럼.
interface CaptureCandidate {
  readonly id: string;
  readonly ocr_text: string | null;
  readonly parsed_event: { title?: string | null; summary?: string | null } | null;
  readonly image_url: string | null;
  readonly created_at: string;
}

// weekly_reports.items jsonb 한 항목.
interface ReportItemRow {
  readonly capture_id: string;
  readonly rank: number;
  readonly title: string;
  readonly summary: string;
  // 클라이언트가 썸네일 서명 URL을 만들 수 있게 원본 경로도 함께 둔다.
  readonly image_path: string | null;
}

// 클라이언트로 돌려주는 응답(weekly_reports 행 형태).
interface WeeklyReportResponse {
  readonly week_start: string;
  readonly week_end: string;
  readonly total_captures: number;
  readonly items: ReportItemRow[];
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

// "YYYY-MM-DD" 형식 검증.
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseBody(raw: unknown): WeeklyReportBody {
  // 본문이 비어 있거나 객체가 아니면 week_start 미지정으로 본다(현재 주).
  if (typeof raw !== "object" || raw === null) {
    return {};
  }
  const body = raw as Record<string, unknown>;
  if (body.week_start === undefined) {
    return {};
  }
  if (typeof body.week_start !== "string" || !isIsoDate(body.week_start)) {
    throw new Error("week_start는 'YYYY-MM-DD' 형식이어야 합니다.");
  }
  return { week_start: body.week_start };
}

// 주어진(또는 현재) 시점이 속한 주의 월요일(KST)을 "YYYY-MM-DD"로 반환.
// 왜: 화면이 "이번 주"를 물으면 KST 월요일을 캐시 키로 삼아 한 주 1행을 보장한다.
function mondayOfWeekKst(base: Date): string {
  // UTC 시각에 KST 오프셋을 더해 "KST 벽시계"를 UTC 필드로 흉내낸다.
  const kst = new Date(base.getTime() + KST_OFFSET_MS);
  const day = kst.getUTCDay(); // 0=일 … 6=토
  // 월요일까지 되돌릴 일수: 일요일(0)은 6, 그 외 day-1.
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(kst.getTime() - diffToMonday * MS_PER_DAY);
  return formatDateUtc(monday);
}

// "YYYY-MM-DD" + 일수 → "YYYY-MM-DD".
function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return formatDateUtc(new Date(d.getTime() + days * MS_PER_DAY));
}

// Date(UTC 필드 기준) → "YYYY-MM-DD".
function formatDateUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// week_start(KST 월요일 00:00) ~ 다음 주 월요일 00:00 의 UTC ISO 경계.
// captures.created_at(timestamptz) 범위 필터에 사용한다.
function weekBoundsUtc(weekStart: string): { fromUtc: string; toUtc: string } {
  const startKstMs = new Date(`${weekStart}T00:00:00Z`).getTime() - KST_OFFSET_MS;
  const endKstMs = startKstMs + DAYS_PER_WEEK * MS_PER_DAY;
  return {
    fromUtc: new Date(startKstMs).toISOString(),
    toUtc: new Date(endKstMs).toISOString(),
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}

// 후보의 표시용 폴백 제목: parsed_event.title → ocr_text 첫 줄 → 빈 문자열.
function fallbackTitle(c: CaptureCandidate): string {
  const fromParsed = c.parsed_event?.title?.trim();
  if (fromParsed) return fromParsed;
  const firstLine = c.ocr_text?.split("\n")[0]?.trim();
  return firstLine ?? "";
}

function fallbackSummary(c: CaptureCandidate): string {
  return c.parsed_event?.summary?.trim() ?? "";
}

// ── OpenAI 선별·랭킹 ───────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return [
    "당신은 사용자의 한 주치 스크린샷 캡처 목록에서 '다시 볼 가치가 가장 큰' 항목을 선별하는 큐레이터입니다.",
    `목록에서 가장 의미 있는 항목 ${REPORT_ITEM_COUNT}개를 고르고, 중요도 순으로 1~${REPORT_ITEM_COUNT} 랭크를 매깁니다.`,
    "각 항목에는 한 줄 제목(title)과 한 줄 요약(summary)을 한국어로 작성합니다. 원문에 없는 사실을 지어내지 않습니다.",
    "약속·일정·할 일·중요 정보가 담긴 캡처를 단순 스크린샷보다 우선합니다.",
    "",
    "입력은 캡처 배열입니다. 각 항목은 { capture_id, text } 형태이며 text는 OCR 텍스트(일부)입니다.",
    `반드시 입력에 존재하는 capture_id만 사용하고, 정확히 ${REPORT_ITEM_COUNT}개를 선택합니다.`,
    "",
    "반드시 아래 JSON 스키마로만 응답합니다. 그 외 텍스트를 출력하지 않습니다:",
    "{",
    '  "items": [',
    '    { "capture_id": string, "rank": number, "title": string, "summary": string }',
    "  ]",
    "}",
  ].join("\n");
}

// OpenAI 응답을 검증해 ReportItemRow[]로 정규화한다.
// 입력에 없는 capture_id는 버리고, 누락 시 created_at desc 폴백으로 보충한다.
function normalizeOpenAiItems(
  parsed: unknown,
  candidates: CaptureCandidate[],
): ReportItemRow[] {
  const byId = new Map(candidates.map((c) => [c.id, c]));
  const obj = (typeof parsed === "object" && parsed !== null)
    ? (parsed as Record<string, unknown>)
    : {};
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const selected: ReportItemRow[] = [];
  const seen = new Set<string>();

  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as Record<string, unknown>;
    const captureId = typeof r.capture_id === "string" ? r.capture_id : "";
    const candidate = byId.get(captureId);
    if (!candidate || seen.has(captureId)) continue;

    const title = typeof r.title === "string" && r.title.trim().length > 0
      ? r.title.trim()
      : fallbackTitle(candidate);
    const summary = typeof r.summary === "string"
      ? r.summary.trim()
      : fallbackSummary(candidate);

    seen.add(captureId);
    selected.push({
      capture_id: captureId,
      // rank는 응답 순서로 1부터 재부여(모델이 준 rank는 신뢰하지 않음).
      rank: selected.length + 1,
      title,
      summary,
      image_path: candidate.image_url,
    });
    if (selected.length >= REPORT_ITEM_COUNT) break;
  }

  // 모델이 5개 미만을 줬거나 잘못된 id가 많았으면 created_at desc로 보충.
  if (selected.length < REPORT_ITEM_COUNT) {
    for (const c of candidates) {
      if (selected.length >= REPORT_ITEM_COUNT) break;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      selected.push(toFallbackItem(c, selected.length + 1));
    }
  }

  return selected;
}

// created_at desc 상위 5개 폴백 항목 생성(OpenAI 미사용 시).
function buildFallbackItems(candidates: CaptureCandidate[]): ReportItemRow[] {
  return candidates
    .slice(0, REPORT_ITEM_COUNT)
    .map((c, i) => toFallbackItem(c, i + 1));
}

function toFallbackItem(c: CaptureCandidate, rank: number): ReportItemRow {
  return {
    capture_id: c.id,
    rank,
    title: fallbackTitle(c),
    summary: fallbackSummary(c),
    image_path: c.image_url,
  };
}

// OpenAI Chat Completions 1회 호출. 재시도 가능 상태(429/5xx)면 retryable=true throw.
async function callOpenAiOnce(
  apiKey: string,
  candidates: CaptureCandidate[],
): Promise<ReportItemRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  // 토큰 절약: capture_id + 잘린 OCR 텍스트만 전달.
  const userPayload = candidates.map((c) => ({
    capture_id: c.id,
    text: truncate(c.ocr_text ?? "", OCR_TRUNCATE_LEN),
  }));

  try {
    const response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: JSON.stringify({ captures: userPayload }) },
        ],
      }),
      signal: controller.signal,
    });

    if (response.status === 429 || response.status >= 500) {
      const detail = await response.text().catch(() => "");
      // 영구 오류(과금/쿼터/키)는 재시도 무의미 — 즉시 실패시켜 백오프 낭비 방지.
      const permanent = /billing_not_active|insufficient_quota|invalid_api_key|account_deactivated/i
        .test(detail);
      const err = new Error(
        `OpenAI ${permanent ? "설정" : "일시"} 오류 (${response.status}): ${detail}`,
      );
      (err as Error & { retryable?: boolean }).retryable = !permanent;
      throw err;
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`OpenAI 호출 실패 (${response.status}): ${detail}`);
    }

    const payload = await response.json();
    const content: unknown = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      throw new Error("OpenAI 응답에 message.content가 없습니다.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("OpenAI 응답을 JSON으로 파싱하지 못했습니다.");
    }

    return normalizeOpenAiItems(parsed, candidates);
  } finally {
    clearTimeout(timeout);
  }
}

// 지수 백오프 재시도. 마지막 시도 실패 시 마지막 오류를 throw.
async function callOpenAiWithRetry(
  apiKey: string,
  candidates: CaptureCandidate[],
): Promise<ReportItemRow[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < BACKOFF_DELAYS_MS.length; attempt++) {
    try {
      return await callOpenAiOnce(apiKey, candidates);
    } catch (error) {
      lastError = error;
      const retryable = (error as Error & { retryable?: boolean }).retryable === true;
      const isLastAttempt = attempt === BACKOFF_DELAYS_MS.length - 1;
      if (!retryable || isLastAttempt) {
        throw error;
      }
      await sleep(BACKOFF_DELAYS_MS[attempt]);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI 호출에 반복 실패했습니다.");
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("POST 메서드만 지원합니다.", 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("인증 토큰이 없습니다.", 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const openAiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse(
      "서버 설정 오류: SUPABASE_URL/SUPABASE_ANON_KEY가 설정되지 않았습니다.",
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // JWT 유효성 + auth.uid() 확보(upsert 시 user_id로 사용).
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return errorResponse("유효하지 않은 인증 토큰입니다.", 401);
  }
  const userId = userData.user.id;

  // 본문 파싱.
  let body: WeeklyReportBody;
  try {
    const raw = await req.json().catch(() => ({}));
    body = parseBody(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "잘못된 요청 본문입니다.";
    return errorResponse(message, 400);
  }

  // 주 경계 계산(week_start 미지정 시 현재 주 월요일 KST).
  const weekStart = body.week_start ?? mondayOfWeekKst(new Date());
  const weekEnd = addDays(weekStart, DAYS_PER_WEEK - 1); // 일요일

  try {
    // (1) 캐시 조회 — 있으면 OpenAI 0회로 즉시 반환.
    const { data: cached, error: cacheError } = await supabase
      .from("weekly_reports")
      .select("week_start, week_end, total_captures, items")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (cacheError) {
      throw new Error(`weekly_reports 캐시 조회 실패: ${cacheError.message}`);
    }
    if (cached) {
      return jsonResponse(toResponse(cached), 200);
    }

    // (2) 그 주 캡처 후보 조회(최신순, 상한 MAX_CANDIDATES).
    const { fromUtc, toUtc } = weekBoundsUtc(weekStart);
    const { data: rows, error: capError } = await supabase
      .from("captures")
      .select("id, ocr_text, parsed_event, image_url, created_at")
      // RLS로도 본인 행만 보이지만, 방어적으로 명시 필터를 둔다(defense in depth).
      .eq("user_id", userId)
      .gte("created_at", fromUtc)
      .lt("created_at", toUtc)
      .order("created_at", { ascending: false })
      .limit(MAX_CANDIDATES);

    if (capError) {
      throw new Error(`captures 조회 실패: ${capError.message}`);
    }

    const candidates = (rows ?? []) as CaptureCandidate[];

    // total_captures는 "그 주 전체 캡처 수"여야 한다(후보는 랭킹 입력용 상한 50).
    // 홈 통계카드의 "이번 주 N장"과 분모가 일치하도록 head:true·count:exact로 실수를 센다.
    const { count: weekCount, error: countError } = await supabase
      .from("captures")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", fromUtc)
      .lt("created_at", toUtc);
    if (countError) {
      throw new Error(`captures 카운트 실패: ${countError.message}`);
    }
    const totalCaptures = weekCount ?? candidates.length;

    // (3) 캡처 < 5건: OpenAI 미호출, 빈 items 캐시·반환.
    let items: ReportItemRow[];
    if (totalCaptures < MIN_CAPTURES_FOR_REPORT) {
      items = [];
    } else if (!openAiKey) {
      // 키 미설정이어도 화면이 빈 화면으로 깨지지 않도록 폴백으로 채운다.
      console.warn("[weekly-report] OPENAI_API_KEY 미설정 — created_at 폴백 사용.");
      items = buildFallbackItems(candidates);
    } else {
      // (4) gpt-4o-mini 선별·랭킹. 실패 시 created_at desc 상위 5 폴백.
      try {
        items = await callOpenAiWithRetry(openAiKey, candidates);
      } catch (error) {
        const message = error instanceof Error ? error.message : "알 수 없는 오류";
        console.error("[weekly-report] OpenAI 실패 — 폴백 사용:", message);
        items = buildFallbackItems(candidates);
      }
    }

    // (5) weekly_reports upsert(주당 1행). onConflict로 캐시 갱신.
    const selectedCaptureIds = items.map((it) => it.capture_id);
    const { data: upserted, error: upsertError } = await supabase
      .from("weekly_reports")
      .upsert(
        {
          user_id: userId,
          week_start: weekStart,
          week_end: weekEnd,
          total_captures: totalCaptures,
          selected_capture_ids: selectedCaptureIds,
          items,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" },
      )
      .select("week_start, week_end, total_captures, items")
      .single();

    if (upsertError || !upserted) {
      throw new Error(
        `weekly_reports 저장 실패: ${upsertError?.message ?? "알 수 없는 오류"}`,
      );
    }

    return jsonResponse(toResponse(upserted), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
    console.error("weekly-report 실패:", message);
    return errorResponse(message, 502);
  }
});

// DB 행(unknown) → 응답 계약으로 안전 정규화.
function toResponse(row: unknown): WeeklyReportResponse {
  const obj = (typeof row === "object" && row !== null)
    ? (row as Record<string, unknown>)
    : {};
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items: ReportItemRow[] = rawItems
    .filter((it): it is Record<string, unknown> => typeof it === "object" && it !== null)
    .map((it, i) => ({
      capture_id: typeof it.capture_id === "string" ? it.capture_id : "",
      rank: typeof it.rank === "number" ? it.rank : i + 1,
      title: typeof it.title === "string" ? it.title : "",
      summary: typeof it.summary === "string" ? it.summary : "",
      image_path: typeof it.image_path === "string" ? it.image_path : null,
    }))
    .filter((it) => it.capture_id.length > 0);

  return {
    week_start: typeof obj.week_start === "string" ? obj.week_start : "",
    week_end: typeof obj.week_end === "string" ? obj.week_end : "",
    total_captures: typeof obj.total_captures === "number" ? obj.total_captures : 0,
    items,
  };
}
