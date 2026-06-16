// supabase/functions/track-parcel/index.ts
//
// Memsum 택배 추적 — SweetTracker(스마트택배) API 프록시 Edge Function.
// 클라이언트는 운송장 번호(+택배사코드)만 넘기고, 실제 SweetTracker 호출은 서버에서 한다
// (API 키 노출 금지, CLAUDE.md §7). 응답에서 개인정보(수령인·주소·기사 연락처)는 제거한다.
//
// 두 가지 action:
//   - recommend: 운송장번호로 택배사 후보 추정(SMS에서 택배사 식별 보강).
//   - track:     택배사코드 + 운송장번호로 배송 상태 조회(level 1~6, 이벤트).
//
// 한국 택배 API는 며칠 후 도착 ETA를 주지 않는다 — level/상태 이벤트만 반환한다.

import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "../_shared/cors.ts";

const SWEETTRACKER_BASE = "https://info.sweettracker.co.kr/api/v1";
const REQUEST_TIMEOUT_MS = 10_000;
const KST_OFFSET = "+09:00";

type Action = "recommend" | "track";

interface RequestBody {
  readonly action: Action;
  readonly invoice_no: string;
  readonly carrier_code?: string;
}

// ── 응답 헬퍼 ─────────────────────────────────────────────────────────────────
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

// 운송장번호 정규화: 숫자만(하이픈·공백 제거). 9~14자리만 허용.
function normalizeInvoice(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 9 || digits.length > 14) return null;
  return digits;
}

function parseBody(raw: unknown): RequestBody {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("요청 본문이 JSON 객체가 아닙니다.");
  }
  const body = raw as Record<string, unknown>;
  if (body.action !== "recommend" && body.action !== "track") {
    throw new Error("action은 'recommend' 또는 'track'이어야 합니다.");
  }
  const invoice = normalizeInvoice(body.invoice_no);
  if (!invoice) {
    throw new Error("invoice_no는 9~14자리 숫자여야 합니다.");
  }
  if (body.action === "track" &&
      (typeof body.carrier_code !== "string" || body.carrier_code.length === 0)) {
    throw new Error("track action에는 carrier_code가 필요합니다.");
  }
  return {
    action: body.action,
    invoice_no: invoice,
    carrier_code: typeof body.carrier_code === "string" ? body.carrier_code : undefined,
  };
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`SweetTracker 응답 오류 (${res.status})`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// "YYYY-MM-DD HH:mm:ss"(KST 벽시계) → ISO8601 +09:00. 실패 시 null.
function kstStringToIso(timeString: unknown): string | null {
  if (typeof timeString !== "string") return null;
  const m = timeString.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)$/);
  if (!m) return null;
  const time = m[2].length === 5 ? `${m[2]}:00` : m[2];
  return `${m[1]}T${time}${KST_OFFSET}`;
}

// SweetTracker trackingInfo 응답을 개인정보 제거 + 정규화. 조회 실패는 found:false.
function normalizeTracking(payload: unknown, carrierCode: string): unknown {
  const obj = (typeof payload === "object" && payload !== null)
    ? (payload as Record<string, unknown>)
    : {};

  // SweetTracker는 조회 불가/미등록 시 { status:false, msg, code } 형태로 응답.
  if (obj.status === false || (typeof obj.code === "string" && obj.invoiceNo === undefined)) {
    return {
      found: false,
      message: typeof obj.msg === "string" ? obj.msg : "배송 정보를 찾지 못했어요.",
    };
  }

  const level = typeof obj.level === "number"
    ? obj.level
    : Number.parseInt(String(obj.level ?? ""), 10) || 0;
  const complete = obj.complete === true || obj.completeYN === "Y";

  const rawDetails = Array.isArray(obj.trackingDetails) ? obj.trackingDetails : [];
  // 개인정보(manName/telno/telno2) 제외하고 상태 이벤트만 노출.
  const events = rawDetails
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => ({
      level: typeof d.level === "number" ? d.level : Number.parseInt(String(d.level ?? ""), 10) || null,
      kind: typeof d.kind === "string" ? d.kind : "",
      where: typeof d.where === "string" ? d.where : "",
      timeString: typeof d.timeString === "string" ? d.timeString : "",
    }));

  const lastDetail = (typeof obj.lastDetail === "object" && obj.lastDetail !== null)
    ? (obj.lastDetail as Record<string, unknown>)
    : null;
  const lastTimeString = lastDetail && typeof lastDetail.timeString === "string"
    ? lastDetail.timeString
    : (events[0]?.timeString ?? null);

  return {
    found: true,
    carrier_code: carrierCode,
    invoice_no: typeof obj.invoiceNo === "string" ? obj.invoiceNo : "",
    level,
    complete,
    status_text: lastDetail && typeof lastDetail.kind === "string"
      ? lastDetail.kind
      : (events[0]?.kind ?? ""),
    last_where: lastDetail && typeof lastDetail.where === "string"
      ? lastDetail.where
      : (events[0]?.where ?? ""),
    estimate: typeof obj.estimate === "string" ? obj.estimate : null,
    last_event_at: kstStringToIso(lastTimeString),
    delivered_at: complete ? kstStringToIso(lastTimeString) : null,
    events,
  };
}

// SweetTracker recommend 응답 → 택배사 후보 [{code,name}].
function normalizeRecommend(payload: unknown): { code: string; name: string }[] {
  const obj = (typeof payload === "object" && payload !== null)
    ? (payload as Record<string, unknown>)
    : {};
  const arr = Array.isArray(obj.Recommend)
    ? obj.Recommend
    : (Array.isArray(payload) ? payload : []);
  return arr
    .filter((c): c is Record<string, unknown> => typeof c === "object" && c !== null)
    .map((c) => ({
      code: typeof c.Code === "string" ? c.Code : String(c.Code ?? ""),
      name: typeof c.Name === "string" ? c.Name : "",
    }))
    .filter((c) => c.code.length > 0);
}

// ── 핸들러 ────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("POST 메서드만 지원합니다.", 405);
  }

  // 키 없는 공개 프록시 남용 방지 — 인증 필수(다른 함수와 동일 패턴).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return errorResponse("인증 토큰이 없습니다.", 401);
  }
  // fail-closed — env 누락 시 검증을 건너뛰지 않고 중단한다(process-capture/weekly-report 동일 패턴).
  // 키 없는 공개 프록시 남용 방지(SweetTracker 1일 20회 제한 소진 방어).
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return errorResponse("서버 설정 오류: SUPABASE_URL/SUPABASE_ANON_KEY가 설정되지 않았습니다.", 500);
  }
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return errorResponse("유효하지 않은 인증 토큰입니다.", 401);
  }

  const apiKey = Deno.env.get("SWEETTRACKER_API_KEY");
  if (!apiKey) {
    // 키 미설정 — 앱이 깨지지 않도록 명확한 코드로 안내(사용자가 콘솔에서 발급 후 secrets 설정).
    return jsonResponse({ error: "not_configured" }, 503);
  }

  let body: RequestBody;
  try {
    body = parseBody(await req.json());
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "잘못된 요청입니다.", 400);
  }

  try {
    const k = encodeURIComponent(apiKey);
    const inv = encodeURIComponent(body.invoice_no);
    if (body.action === "recommend") {
      const payload = await fetchJson(`${SWEETTRACKER_BASE}/recommend?t_key=${k}&t_invoice=${inv}`);
      return jsonResponse({ carriers: normalizeRecommend(payload) }, 200);
    }
    const code = encodeURIComponent(body.carrier_code ?? "");
    const payload = await fetchJson(
      `${SWEETTRACKER_BASE}/trackingInfo?t_key=${k}&t_code=${code}&t_invoice=${inv}`,
    );
    return jsonResponse(normalizeTracking(payload, body.carrier_code ?? ""), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "택배 조회 중 오류가 발생했습니다.";
    console.error("track-parcel 실패:", message);
    return errorResponse(message, 502);
  }
});
