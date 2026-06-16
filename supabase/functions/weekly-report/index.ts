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

// OpenAI 샘플링 온도. 0.6: 리마인드 톤에 자연스러운 변주를 주되, json_object 강제 +
// capture_id 화이트리스트 + 사후 검증(normalizeOpenAiItems)이 형식·구조를 잡으므로
// 창의성은 summary 문장 표현에만 작용한다. 0.7+는 사실 가드레일 위반 위험이 커 비권장.
const REPORT_TEMPERATURE = 0.6;

// 캡처 카테고리 6종(process-capture·src/lib/categories.ts와 동일).
// Deno↔RN 경계라 의도적으로 복제한다. 카테고리별 리마인드 톤을 입히기 위해
// 후보 payload에 category를 함께 실어 모델에 전달한다.
const CATEGORY_KEYS = [
  "marketing",
  "event",
  "receipt",
  "shopping",
  "info",
  "etc",
] as const;
const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORY_KEYS);

// KST. 주(월~일) 경계 계산 기준 타임존.
const TIMEZONE = "Asia/Seoul";
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

// ── 타입 ─────────────────────────────────────────────────────────────────────

// 리포트 문구(title/summary) 언어. 클라이언트 앱 로케일을 그대로 받는다(기본 ko).
type Locale = "ko" | "en";
const DEFAULT_LOCALE: Locale = "ko";

interface WeeklyReportBody {
  readonly week_start?: string;
  readonly locale: Locale;
}

// captures 테이블에서 후보로 가져오는 최소 컬럼.
// category: process-capture가 분류해 둔 6종. 카테고리별 리마인드 톤을 입히기 위해
//   후보 payload에 함께 싣는다(과거 행/누락 대비 string | null로 받고 사용 시 정규화).
interface CaptureCandidate {
  readonly id: string;
  readonly ocr_text: string | null;
  readonly parsed_event: { title?: string | null; summary?: string | null } | null;
  readonly image_url: string | null;
  readonly category: string | null;
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
  // 본문이 비어 있거나 객체가 아니면 week_start 미지정(현재 주) + 기본 로케일로 본다.
  if (typeof raw !== "object" || raw === null) {
    return { locale: DEFAULT_LOCALE };
  }
  const body = raw as Record<string, unknown>;
  // locale 미지정/이상값은 기본 ko로 폴백한다(구버전 클라이언트 호환).
  const locale: Locale = body.locale === "en" ? "en" : DEFAULT_LOCALE;
  if (body.week_start === undefined) {
    return { locale };
  }
  if (typeof body.week_start !== "string" || !isIsoDate(body.week_start)) {
    throw new Error("week_start는 'YYYY-MM-DD' 형식이어야 합니다.");
  }
  return { week_start: body.week_start, locale };
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

// 저장된 category를 화이트리스트 6종으로 좁힌다. 누락/이상값은 'etc'(중립 톤).
function normalizeCategory(raw: string | null): string {
  return raw !== null && CATEGORY_SET.has(raw) ? raw : "etc";
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

function buildSystemPrompt(locale: Locale): string {
  if (locale === "en") {
    return buildSystemPromptEn();
  }
  return [
    "당신은 사용자의 한 주치 스크린샷 캡처에서 '다시 볼 가치가 가장 큰' 항목을 골라,",
    "잊고 있던 것을 따뜻하게 다시 떠올려주는 Memsum의 큐레이터입니다.",
    "",
    "[역할]",
    `- 목록에서 가장 의미 있는 항목 ${REPORT_ITEM_COUNT}개를 골라 중요도 순으로 1~${REPORT_ITEM_COUNT} 랭크를 매깁니다.`,
    "- 각 항목에 한 줄 제목(title)과 한 줄 요약(summary)을 한국어로 씁니다.",
    "- 약속·일정·할 일·다시 찾게 될 정보가 담긴 캡처를 단순 스크린샷보다 우선합니다.",
    "",
    "[입력 형식]",
    "- 입력은 캡처 배열입니다. 각 항목: { capture_id, category, title_hint, summary_hint, text }.",
    "  - category: 캡처 분류(marketing/event/receipt/shopping/info/etc). 톤 선택의 기준입니다.",
    "  - title_hint, summary_hint: 사전 추출된 제목·요약 힌트(빈 문자열일 수 있음).",
    "  - text: OCR 원문 일부입니다.",
    `- 반드시 입력에 존재하는 capture_id만 사용하고, 정확히 ${REPORT_ITEM_COUNT}개를 선택합니다.`,
    "",
    "[title 작성 규칙]",
    "- 무엇에 관한 캡처인지 한눈에 알 수 있는 짧은 명사형 제목(12자 내외, 최대 24자).",
    "- title_hint가 있으면 다듬어 쓰고, 없으면 text에서 핵심을 뽑습니다. 이모지·과한 따옴표 금지.",
    "",
    "[summary 작성 규칙 — 카테고리에 맞춘 따뜻한 한 줄]",
    "- summary는 '요약'이 아니라, 사용자가 잊고 있었을 그 캡처를 다시 떠올리게 하는 한 마디입니다.",
    "- 35자 내외(최대 45자), 부드러운 존댓말. 카테고리별로 톤을 다르게 합니다(결만 맞추고 문장은 매번 새로 쓸 것):",
    "  - info(정보·아티클): 잊고 있던 정보를 되살려주는 따뜻한 리마인드. 이 결을 가장 분명하게 살립니다.",
    "    예) '전세 계약 정보, 나중에 다시 보고 싶으셨죠? 여기 챙겨뒀어요.'",
    "    핵심 뉘앙스: '까먹을 뻔했는데 덕분에 다시 보게 되어 다행이에요.'",
    "  - shopping(쇼핑): 고민하던 것을 부담 없이 환기. 압박·세일 문구가 아니라 가볍게.",
    "    예) '담아두셨던 그 이어폰, 아직 마음에 두고 계세요?'",
    "  - event(약속·이벤트): 다가오는 일정을 안심시키듯 환기.",
    "    예) '18일 워크숍 약속, 잊지 않으셨죠?'",
    "  - marketing·receipt·etc: 감정 톤을 입히지 말고 담백하게, 사실 중심의 차분한 한 줄.",
    "    (업무 자료·결제 내역·분류가 불확실한 항목에 사적인 감정 톤은 오히려 어색합니다.)",
    "    예) marketing '여름 프리퀀시 이벤트 안내', receipt '치과 진료비 결제 내역'.",
    "",
    "[사실 가드레일 — 어김 없이]",
    "- title_hint·summary_hint·text에 실제로 있는 내용만 씁니다. 원문에 없는 날짜·금액·장소·수치·고유명사를 지어내지 않습니다.",
    "- 과장·홍보성 미사여구·없는 감정 부풀리기 금지. 단정 못 할 건 단정하지 않습니다.",
    "- 정보가 빈약하면 톤을 억지로 끼우지 말고, title을 차분히 보여주는 담백한 summary로 둡니다.",
    "",
    "[반복 방지 — 5줄이 지루해지지 않게]",
    "- 5개 summary가 같은 문장 틀로 복붙된 것처럼 보이면 안 됩니다. 문장 시작·서술어·어미를 서로 다르게 씁니다.",
    "- '~죠?'처럼 되묻는 말끝은 5줄 중 최대 2번까지만. 같은 단어(특히 '다시')를 모든 줄에 반복하지 않습니다.",
    "",
    "[출력]",
    "- 반드시 아래 JSON 스키마로만 응답합니다. 그 외 텍스트를 출력하지 않습니다.",
    "{",
    '  "items": [',
    '    { "capture_id": string, "rank": number, "title": string, "summary": string }',
    "  ]",
    "}",
  ].join("\n");
}

// 영어 사용자용 — 한국어판과 동일한 "따뜻한 리마인드" 결을 자연스러운 영어로 옮긴 프롬프트.
function buildSystemPromptEn(): string {
  return [
    "You are Memsum's curator. From a user's screenshots this week, you pick the ones most worth a",
    "second look, and warmly bring back to mind the things they'd half-forgotten.",
    "",
    "[Role]",
    `- Choose the ${REPORT_ITEM_COUNT} most meaningful items from the list and rank them 1–${REPORT_ITEM_COUNT} by importance.`,
    "- Write a one-line title and a one-line summary for each, in natural English.",
    "- Favor captures with plans, appointments, to-dos, or info they'll want to find again over plain screenshots.",
    "",
    "[Input format]",
    "- Input is an array of captures. Each item: { capture_id, category, title_hint, summary_hint, text }.",
    "  - category: the capture's class (marketing/event/receipt/shopping/info/etc). It guides the tone.",
    "  - title_hint, summary_hint: pre-extracted title/summary hints (may be empty strings).",
    "  - text: part of the raw OCR text.",
    `- Use only capture_ids that exist in the input, and select exactly ${REPORT_ITEM_COUNT}.`,
    "",
    "[Title rules]",
    "- A short noun phrase (about 3–6 words, max ~40 characters) that says at a glance what the capture is about.",
    "- Refine title_hint if present; otherwise pull the gist from text. No emojis, and avoid wrapping the title in quotation marks.",
    "",
    "[Summary rules — one warm line tuned to the category]",
    "- The summary isn't a recap; it's one line that brings the capture back to mind — something they'd forgotten.",
    "- Keep it short (one sentence, ideally under ~90 characters), gentle and friendly. Vary the tone by category (match the feel, but write a fresh sentence every time):",
    "  - info (articles, knowledge): a warm reminder that revives something they'd set aside. Lean into this feel the most.",
    "    e.g. 'That lease guide you meant to revisit — saved right here for you.'",
    "    The nuance: 'you almost let it slip, but here it is again.'",
    "  - shopping: gently bring back what they were mulling over — light, never pushy or salesy.",
    "    e.g. 'Those earbuds you saved — still on your mind?'",
    "  - event (plans, appointments): a reassuring nudge about something coming up.",
    "    e.g. 'Your workshop on the 18th — you've got it, right?'",
    "  - marketing, receipt, etc: no emotional tone. Keep it plain and factual, one calm line.",
    "    (A personal, sentimental tone feels off on work files, payment records, or unclear items.)",
    "    e.g. marketing 'Summer rewards event details', receipt 'Dental visit payment record'.",
    "",
    "[Factual guardrails — no exceptions]",
    "- Write only what is actually in title_hint, summary_hint, or text. Never invent dates, amounts, places, numbers, or names that aren't there.",
    "- No hype, no promotional flourish, no manufactured emotion. Don't assert what you can't be sure of.",
    "- If a capture is thin on detail, don't force a tone — leave a plain summary that calmly states the title.",
    "",
    `[Avoid repetition — so the ${REPORT_ITEM_COUNT} lines don't get dull]`,
    `- The ${REPORT_ITEM_COUNT} summaries must not read like the same template pasted over. Vary the openings, verbs, and endings.`,
    "- Use a rhetorical question ending ('…right?') at most twice. Don't repeat the same word (especially 'again') on every line.",
    "",
    "[Output]",
    "- Respond ONLY with the JSON schema below. Output no other text.",
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
  locale: Locale,
): Promise<ReportItemRow[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  // 카테고리 인지 + 토큰 절약: capture_id, category, 사전 추출 힌트(title/summary),
  // 잘린 OCR 텍스트를 전달한다. category·힌트는 process-capture가 이미 만든 값이라
  // 모델이 재추론할 필요가 없어 사실 안정성↑·토큰↓.
  const userPayload = candidates.map((c) => ({
    capture_id: c.id,
    category: normalizeCategory(c.category),
    title_hint: c.parsed_event?.title?.trim() ?? "",
    summary_hint: c.parsed_event?.summary?.trim() ?? "",
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
        temperature: REPORT_TEMPERATURE,
        messages: [
          { role: "system", content: buildSystemPrompt(locale) },
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
  locale: Locale,
): Promise<ReportItemRow[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < BACKOFF_DELAYS_MS.length; attempt++) {
    try {
      return await callOpenAiOnce(apiKey, candidates, locale);
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
    // (1) 캐시 조회 — 로케일이 일치하면 OpenAI 0회로 즉시 반환.
    //     로케일이 다르면(사용자가 언어를 바꿈) 같은 주라도 해당 언어로 다시 생성한다.
    //     legacy 행(locale null)은 ko로 간주(마이그레이션 이전 데이터 호환).
    const { data: cached, error: cacheError } = await supabase
      .from("weekly_reports")
      .select("week_start, week_end, total_captures, items, locale")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (cacheError) {
      throw new Error(`weekly_reports 캐시 조회 실패: ${cacheError.message}`);
    }
    if (cached) {
      const cachedLocale =
        (cached as { locale?: string | null }).locale === "en" ? "en" : "ko";
      if (cachedLocale === body.locale) {
        return jsonResponse(toResponse(cached), 200);
      }
    }

    // (2) 그 주 캡처 후보 조회(최신순, 상한 MAX_CANDIDATES).
    const { fromUtc, toUtc } = weekBoundsUtc(weekStart);
    const { data: rows, error: capError } = await supabase
      .from("captures")
      .select("id, ocr_text, parsed_event, image_url, category, created_at")
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
        items = await callOpenAiWithRetry(openAiKey, candidates, body.locale);
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
          locale: body.locale,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_start" },
      )
      // locale도 함께 재조회 — 캐시 select(위)와 컬럼 목록을 대칭으로 맞춘다.
      .select("week_start, week_end, total_captures, items, locale")
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
