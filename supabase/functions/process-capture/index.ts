// supabase/functions/process-capture/index.ts
//
// Memsum — 캡처 후처리 Edge Function (Deno).
// 온디바이스 1차 OCR로 얻은 거친 텍스트를 서버에서 gpt-4o-mini로 후처리한다:
//   (1) 오타·띄어쓰기 교정 (2) 이벤트(제목·날짜·시간·장소) 추출 → JSON.
// 결과를 captures 테이블(0001_init.sql)에 기록한다.
//
// OpenAI 키는 절대 클라이언트에 두지 않고 이 Edge Function의 시크릿으로만 사용한다
// (CLAUDE.md §7, ADR-003).
//
// ─────────────────────────────────────────────────────────────────────────────
// 배포 (OpenAI 키·access token 발급 후):
//   supabase secrets set OPENAI_API_KEY=sk-...           # 서버 전용 시크릿
//   supabase functions deploy process-capture            # 배포
//   supabase functions serve process-capture --env-file ./supabase/.env  # 로컬
//
// 런타임에 자동 주입되는 시크릿: SUPABASE_URL, SUPABASE_ANON_KEY
// (supabase functions deploy 시 플랫폼이 기본 제공. 추가 설정 불필요)
// 별도 설정이 필요한 시크릿: OPENAI_API_KEY
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

// ── 상수 ─────────────────────────────────────────────────────────────────────

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

// 지수 백오프: 1s, 2s, 4s, 8s, 16s — 최대 5회 (기능명세 §7.2).
const BACKOFF_DELAYS_MS = [1000, 2000, 4000, 8000, 16000] as const;

// OpenAI 단일 호출 타임아웃. 백오프 누적 대기와 별개로 무한 대기를 막는다.
const OPENAI_TIMEOUT_MS = 30000;

// KST. starts_at/ends_at 해석 기준 타임존을 프롬프트에 명시한다.
const TIMEZONE = "Asia/Seoul";

// 캡처 카테고리 6종. DB check 제약(0005_category.sql)·src/lib/categories.ts와 동일.
// 단일 진실은 클라이언트 categories.ts지만, Deno↔RN 경계라 여기 의도적으로 복제한다.
const CATEGORY_KEYS = [
  "marketing",
  "event",
  "receipt",
  "shopping",
  "info",
  "etc",
] as const;

type CategoryKey = (typeof CATEGORY_KEYS)[number];

// 미분류 폴백 카테고리.
const DEFAULT_CATEGORY: CategoryKey = "etc";

// 화이트리스트 검증용 Set.
const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORY_KEYS);

// ── 타입 ─────────────────────────────────────────────────────────────────────

type SourcePlatform = "ios" | "android";

interface ProcessCaptureBody {
  readonly capture_id?: string;
  readonly ocr_text: string;
  readonly image_url?: string;
  readonly source_platform: SourcePlatform;
}

interface ExtractedEvent {
  readonly title: string;
  readonly starts_at: string;
  readonly ends_at: string | null;
  readonly location: string | null;
}

interface OpenAiResult {
  readonly clean_text: string;
  readonly title: string;
  readonly summary: string;
  readonly event: ExtractedEvent | null;
  readonly category: CategoryKey;
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

// 본문 수동 검증 (Deno 환경 단순 유지를 위해 zod 미사용).
function parseBody(raw: unknown): ProcessCaptureBody {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("요청 본문이 JSON 객체가 아닙니다.");
  }
  const body = raw as Record<string, unknown>;

  if (typeof body.ocr_text !== "string" || body.ocr_text.trim().length === 0) {
    throw new Error("ocr_text는 비어 있지 않은 문자열이어야 합니다.");
  }
  if (body.source_platform !== "ios" && body.source_platform !== "android") {
    throw new Error("source_platform은 'ios' 또는 'android'여야 합니다.");
  }
  if (body.capture_id !== undefined && typeof body.capture_id !== "string") {
    throw new Error("capture_id는 문자열이어야 합니다.");
  }
  if (body.image_url !== undefined && typeof body.image_url !== "string") {
    throw new Error("image_url은 문자열이어야 합니다.");
  }

  return {
    ocr_text: body.ocr_text,
    source_platform: body.source_platform,
    capture_id: body.capture_id as string | undefined,
    image_url: body.image_url as string | undefined,
  };
}

// ── OpenAI 후처리 ─────────────────────────────────────────────────────────────

function buildSystemPrompt(nowIso: string): string {
  // 왜: 모델이 상대 날짜("다음 주 화")를 절대 시각으로 변환하려면 기준 현재 시각이 필요하다.
  return [
    "당신은 한국어 스크린샷 OCR 텍스트를 정제하고 일정 이벤트를 추출하는 어시스턴트입니다.",
    `현재 시각은 ${nowIso} (${TIMEZONE}, KST) 입니다. 모든 상대 날짜·시간은 이 기준으로 해석합니다.`,
    "",
    "입력으로 거친 OCR 텍스트가 주어집니다. 다음을 수행하세요:",
    "1. 오타·띄어쓰기·줄바꿈을 교정한 정제 텍스트(clean_text)를 만듭니다. 원문에 없는 내용을 추가하지 않습니다.",
    "2. 한 줄 제목(title)과 한 줄 요약(summary)을 한국어로 생성합니다.",
    "3. 일정/약속/행사 등 캘린더 이벤트가 감지되면 event 객체로 추출합니다. 없으면 event는 null 입니다.",
    "4. 캡처 내용을 아래 6종 중 하나로 분류해 category에 넣습니다(반드시 이 중 하나):",
    "   - marketing: 광고·프로모션·할인·쿠폰·브랜드 캠페인 자료",
    "   - event: 약속·일정·행사·예약·초대 등 날짜/시간이 핵심인 내용",
    "   - receipt: 영수증·결제 내역·주문 확인·청구서",
    "   - shopping: 상품·장바구니·위시리스트·쇼핑몰 화면",
    "   - info: 기사·정보·팁·노하우·읽을거리(아티클)",
    "   - etc: 위 어디에도 명확히 속하지 않는 기타",
    "",
    "한국식 날짜·시간 표현을 해석합니다. 예: '다음 주 화 오후 2시', '6/15 토 14시', '내일 오전 10시 반'.",
    `starts_at·ends_at은 ISO8601 형식이며 KST 오프셋(+09:00)을 포함합니다. 예: '2026-06-15T14:00:00+09:00'.`,
    "종료 시각이 명시되지 않으면 ends_at은 null, 장소가 없으면 location은 null 입니다.",
    "",
    "반드시 아래 JSON 스키마로만 응답합니다. 그 외 텍스트를 출력하지 않습니다:",
    '{',
    '  "clean_text": string,',
    '  "title": string,',
    '  "summary": string,',
    '  "event": null | { "title": string, "starts_at": string, "ends_at": string | null, "location": string | null },',
    '  "category": "marketing" | "event" | "receipt" | "shopping" | "info" | "etc"',
    '}',
  ].join("\n");
}

// OpenAI 응답 JSON을 안전하게 OpenAiResult로 정규화한다.
function normalizeOpenAiResult(parsed: unknown, fallbackText: string): OpenAiResult {
  const obj = (typeof parsed === "object" && parsed !== null)
    ? (parsed as Record<string, unknown>)
    : {};

  const cleanText = typeof obj.clean_text === "string" ? obj.clean_text : fallbackText;
  const title = typeof obj.title === "string" ? obj.title : "";
  const summary = typeof obj.summary === "string" ? obj.summary : "";

  let event: ExtractedEvent | null = null;
  const rawEvent = obj.event;
  if (
    typeof rawEvent === "object" &&
    rawEvent !== null &&
    typeof (rawEvent as Record<string, unknown>).title === "string" &&
    typeof (rawEvent as Record<string, unknown>).starts_at === "string"
  ) {
    const e = rawEvent as Record<string, unknown>;
    event = {
      title: e.title as string,
      starts_at: e.starts_at as string,
      ends_at: typeof e.ends_at === "string" ? e.ends_at : null,
      location: typeof e.location === "string" ? e.location : null,
    };
  }

  // 카테고리 화이트리스트 검증. enum 6종이면 그대로, 아니면 폴백:
  // 이벤트가 잡혔으면 'event', 아니면 'etc'(src/lib/categories.ts normalizeCategory 동일 규칙).
  const rawCategory = obj.category;
  const category: CategoryKey =
    typeof rawCategory === "string" && CATEGORY_SET.has(rawCategory)
      ? (rawCategory as CategoryKey)
      : event !== null
        ? "event"
        : DEFAULT_CATEGORY;

  return { clean_text: cleanText, title, summary, event, category };
}

// OpenAI Chat Completions 1회 호출. 재시도가 필요한 상태(429/5xx)면 retryable=true로 throw.
async function callOpenAiOnce(
  apiKey: string,
  ocrText: string,
  nowIso: string,
): Promise<OpenAiResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

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
        temperature: 0.2,
        messages: [
          { role: "system", content: buildSystemPrompt(nowIso) },
          { role: "user", content: ocrText },
        ],
      }),
      signal: controller.signal,
    });

    if (response.status === 429 || response.status >= 500) {
      const detail = await response.text().catch(() => "");
      // billing_not_active·insufficient_quota·invalid_api_key 는 429여도 영구 오류라
      // 재시도해봐야 소용없다. 즉시 실패시켜 백오프 대기(최대 15s)를 낭비하지 않는다.
      const permanent = /billing_not_active|insufficient_quota|invalid_api_key|account_deactivated/i
        .test(detail);
      const err = new Error(`OpenAI ${permanent ? "설정" : "일시"} 오류 (${response.status}): ${detail}`);
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

    return normalizeOpenAiResult(parsed, ocrText);
  } finally {
    clearTimeout(timeout);
  }
}

// 지수 백오프(1,2,4,8,16s) 재시도. 마지막 시도 실패 시 마지막 오류를 throw.
async function callOpenAiWithRetry(
  apiKey: string,
  ocrText: string,
  nowIso: string,
): Promise<OpenAiResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < BACKOFF_DELAYS_MS.length; attempt++) {
    try {
      return await callOpenAiOnce(apiKey, ocrText, nowIso);
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

  // 루프는 항상 return/throw로 종료되지만, 타입 안전을 위해 보강.
  throw lastError instanceof Error
    ? lastError
    : new Error("OpenAI 호출에 반복 실패했습니다.");
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("POST 메서드만 지원합니다.", 405);
  }

  // 인증: Authorization 헤더를 그대로 Supabase 클라이언트에 전달해 RLS 컨텍스트 유지.
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
  if (!openAiKey) {
    return errorResponse(
      "서버 설정 오류: OPENAI_API_KEY 시크릿이 설정되지 않았습니다. `supabase secrets set OPENAI_API_KEY=...` 필요.",
      500,
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // JWT 유효성 확인 + auth.uid() 확보 (새 insert 시 user_id로 사용).
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return errorResponse("유효하지 않은 인증 토큰입니다.", 401);
  }
  const userId = userData.user.id;

  // 본문 파싱·검증.
  let body: ProcessCaptureBody;
  try {
    const raw = await req.json();
    body = parseBody(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "잘못된 요청 본문입니다.";
    return errorResponse(message, 400);
  }

  // OpenAI 후처리 → 결과를 captures에 기록. 실패 시 status='failed' 기록 후 5xx.
  try {
    const nowIso = new Date().toLocaleString("sv-SE", { timeZone: TIMEZONE })
      .replace(" ", "T") + "+09:00";

    const result = await callOpenAiWithRetry(openAiKey, body.ocr_text, nowIso);

    // captures 스키마(0001)에는 title/summary/embedding 컬럼이 없다.
    // → 전체 추출 JSON을 parsed_event(jsonb)에 저장하고, ocr_text는 정제본으로 갱신한다.
    const parsedEvent = {
      title: result.title,
      summary: result.summary,
      event: result.event,
    };

    let captureId: string;

    if (body.capture_id) {
      // 기존 row 업데이트. RLS로 본인 row만 갱신 가능.
      const { data, error } = await supabase
        .from("captures")
        .update({
          ocr_text: result.clean_text,
          parsed_event: parsedEvent,
          category: result.category,
          status: "ocr_done",
        })
        .eq("id", body.capture_id)
        .eq("user_id", userId)
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(
          `captures 업데이트 실패: ${error?.message ?? "대상 row를 찾지 못했습니다."}`,
        );
      }
      captureId = data.id;
    } else {
      // 새 row insert. image_url은 NOT NULL이므로 미제공 시 빈 문자열 placeholder.
      const { data, error } = await supabase
        .from("captures")
        .insert({
          user_id: userId,
          image_url: body.image_url ?? "",
          ocr_text: result.clean_text,
          parsed_event: parsedEvent,
          category: result.category,
          source_platform: body.source_platform,
          status: "ocr_done",
        })
        .select("id")
        .single();

      if (error || !data) {
        throw new Error(`captures 생성 실패: ${error?.message ?? "알 수 없는 오류"}`);
      }
      captureId = data.id;
    }

    return jsonResponse(
      {
        capture_id: captureId,
        clean_text: result.clean_text,
        title: result.title,
        summary: result.summary,
        event: result.event,
        category: result.category,
      },
      200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
    console.error("process-capture 실패:", message);

    // 기존 capture가 지정된 경우, 실패 상태를 best-effort로 기록한다.
    // (이 갱신 자체가 실패해도 원래 오류 응답을 우선한다.)
    if (body.capture_id) {
      try {
        await supabase
          .from("captures")
          .update({ status: "failed" })
          .eq("id", body.capture_id)
          .eq("user_id", userId);
      } catch (markError) {
        console.error("status='failed' 기록 실패:", markError);
      }
    }

    return errorResponse(message, 502);
  }
});
