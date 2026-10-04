// src/lib/api.ts
//
// Memsum — process-capture Edge Function 클라이언트 (Week 3, W3-B).
// 온디바이스 OCR로 얻은 거친 텍스트를 서버(gpt-4o-mini)로 후처리해
// 정제 텍스트·제목·요약·이벤트를 받는다.
//
// supabase.functions.invoke가 세션 JWT(Authorization)와 apikey를 자동 첨부하므로
// 헤더를 수동으로 구성하지 않는다. 함수 입력 키는 snake_case 계약을 따른다
// (supabase/functions/process-capture/index.ts: { ocr_text, source_platform, image_url?, capture_id? }).

import { FunctionsHttpError } from '@supabase/supabase-js';
import { getCalendars } from 'expo-localization';

import type {
  ProcessCaptureInput,
  ProcessCaptureResult,
  CaptureEvent,
} from '@/features/capture/types';
import { getLocale } from '@/i18n';
import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 호출할 Edge Function 이름. */
const FUNCTION_NAME = 'process-capture';

// ── 오류 ─────────────────────────────────────────────────────────────────────

/**
 * process-capture가 돌려주는 일반화된 오류 코드(서버는 원문을 로그에만 남긴다).
 * network: 응답 자체를 못 받음 / invalid_response: 응답 형식 불일치 / unknown: 미분류.
 */
export type ProcessCaptureErrorCode =
  | 'unauthorized'
  | 'bad_request'
  | 'forbidden_image_path'
  | 'rate_limited'
  | 'server_misconfigured'
  | 'processing_failed'
  | 'network'
  | 'invalid_response'
  | 'unknown';

const KNOWN_SERVER_CODES: ReadonlySet<string> = new Set([
  'unauthorized',
  'bad_request',
  'forbidden_image_path',
  'rate_limited',
  'server_misconfigured',
  'processing_failed',
]);

/** 화면은 code로 문구를 고른다(message는 로그용 — 사용자에게 노출하지 않는다). */
export class ProcessCaptureError extends Error {
  readonly code: ProcessCaptureErrorCode;

  constructor(code: ProcessCaptureErrorCode) {
    super(`process-capture 실패: ${code}`);
    this.name = 'ProcessCaptureError';
    this.code = code;
  }
}

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * invoke 오류 → 오류 코드. non-2xx면 본문 { error: code }를, 그 외(연결 실패 등)는 network.
 */
async function toProcessCaptureError(error: unknown): Promise<ProcessCaptureError> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === 'string' && KNOWN_SERVER_CODES.has(body.error)) {
        return new ProcessCaptureError(body.error as ProcessCaptureErrorCode);
      }
    } catch {
      // 본문이 JSON이 아니거나 비어 있으면 unknown.
    }
    return new ProcessCaptureError('unknown');
  }
  return new ProcessCaptureError('network');
}

/**
 * 기기 시간대(IANA, 예 "Asia/Seoul"). 서버가 "내일 3시" 같은 상대 일정을 이 기준으로 해석한다.
 * 얻지 못하면 undefined — 서버 기본값(Asia/Seoul)을 쓴다.
 */
function deviceTimeZone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (typeof zone === 'string' && zone.length > 0) return zone;
  } catch {
    // Intl 시간대 미지원 엔진 — 아래 expo-localization으로 대체.
  }
  try {
    return getCalendars()[0]?.timeZone ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * 함수 응답(unknown)을 ProcessCaptureResult 계약으로 정규화한다.
 * 서버 응답 형태가 어긋나도 호출 측이 안전하게 소비하도록 방어한다.
 */
function normalizeResult(raw: unknown): ProcessCaptureResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new ProcessCaptureError('invalid_response');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.capture_id !== 'string' || obj.capture_id.length === 0) {
    throw new ProcessCaptureError('invalid_response');
  }

  let event: CaptureEvent | null = null;
  const rawEvent = obj.event;
  if (
    typeof rawEvent === 'object' &&
    rawEvent !== null &&
    typeof (rawEvent as Record<string, unknown>).title === 'string' &&
    typeof (rawEvent as Record<string, unknown>).starts_at === 'string'
  ) {
    const e = rawEvent as Record<string, unknown>;
    event = {
      title: e.title as string,
      starts_at: e.starts_at as string,
      ends_at: typeof e.ends_at === 'string' ? e.ends_at : null,
      location: typeof e.location === 'string' ? e.location : null,
    };
  }

  return {
    capture_id: obj.capture_id,
    clean_text: typeof obj.clean_text === 'string' ? obj.clean_text : '',
    title: typeof obj.title === 'string' ? obj.title : '',
    summary: typeof obj.summary === 'string' ? obj.summary : '',
    event,
  };
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * process-capture Edge Function을 호출해 OCR 텍스트를 후처리한다.
 *
 * @throws ProcessCaptureError — 세션 없음(unauthorized)·서버 오류 코드·응답 형식 불일치.
 */
export async function processCapture(
  input: ProcessCaptureInput,
): Promise<ProcessCaptureResult> {
  const supabase = getSupabase();

  // 함수는 Authorization 헤더가 없으면 401을 반환한다. 사전에 세션을 확인해
  // 명확한 메시지를 준다(invoke가 자동 첨부하는 JWT는 이 세션에서 온다).
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    console.error('[api] 세션 없음/조회 실패:', sessionError?.message);
    throw new ProcessCaptureError('unauthorized');
  }

  try {
    const { data, error } = await supabase.functions.invoke<ProcessCaptureResult>(
      FUNCTION_NAME,
      {
        // snake_case 계약(process-capture/index.ts). invoke가 Record를 JSON 직렬화한다.
        // locale: 앱 언어를 넘겨 title·summary를 사용자 언어로 생성하게 한다(기본 ko).
        // time_zone: 상대 날짜("내일 3시") 해석 기준. 해외 사용자 일정이 KST로 틀어지던 문제.
        body: {
          ocr_text: input.ocrText,
          source_platform: input.sourcePlatform,
          image_url: input.imageUrl,
          capture_id: input.captureId,
          locale: getLocale(),
          time_zone: deviceTimeZone(),
        },
      },
    );

    if (error) {
      throw await toProcessCaptureError(error);
    }

    return normalizeResult(data);
  } catch (error) {
    console.error('[api] processCapture 실패:', error);
    throw error instanceof ProcessCaptureError ? error : new ProcessCaptureError('unknown');
  }
}
