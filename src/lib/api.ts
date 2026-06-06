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

import type {
  ProcessCaptureInput,
  ProcessCaptureResult,
  CaptureEvent,
} from '@/features/capture/types';
import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 호출할 Edge Function 이름. */
const FUNCTION_NAME = 'process-capture';

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * Edge Function이 non-2xx로 반환한 본문에서 { error } 메시지를 추출한다.
 *
 * 왜: invoke는 non-2xx 시 error를 FunctionsHttpError로 주고 실제 메시지는
 * Response(context) 본문에 들어 있다. 이를 풀어 사용자에게 원인을 표면화한다.
 */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === 'string' && body.error.length > 0) {
        return body.error;
      }
    } catch {
      // 본문이 JSON이 아니거나 비어 있으면 아래 기본 메시지로 폴백.
    }
    return 'process-capture 처리 중 서버 오류가 발생했습니다.';
  }

  if (error instanceof Error) {
    return error.message;
  }
  return 'process-capture 호출에 실패했습니다.';
}

/**
 * 함수 응답(unknown)을 ProcessCaptureResult 계약으로 정규화한다.
 * 서버 응답 형태가 어긋나도 호출 측이 안전하게 소비하도록 방어한다.
 */
function normalizeResult(raw: unknown): ProcessCaptureResult {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('process-capture 응답이 비어 있거나 형식이 올바르지 않습니다.');
  }
  const obj = raw as Record<string, unknown>;

  if (typeof obj.capture_id !== 'string' || obj.capture_id.length === 0) {
    throw new Error('process-capture 응답에 capture_id가 없습니다.');
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
 * @throws 세션이 없거나(미인증), 함수가 오류를 반환하거나, 응답 형식이 어긋날 때.
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

  if (sessionError) {
    console.error('[api] 세션 조회 실패:', sessionError.message);
    throw new Error('세션 확인에 실패했습니다. 다시 로그인해 주세요.');
  }
  if (!session) {
    throw new Error('로그인 세션이 없습니다. 먼저 인증이 필요합니다.');
  }

  try {
    const { data, error } = await supabase.functions.invoke<ProcessCaptureResult>(
      FUNCTION_NAME,
      {
        // snake_case 계약(process-capture/index.ts). invoke가 Record를 JSON 직렬화한다.
        body: {
          ocr_text: input.ocrText,
          source_platform: input.sourcePlatform,
          image_url: input.imageUrl,
          capture_id: input.captureId,
        },
      },
    );

    if (error) {
      const message = await extractFunctionErrorMessage(error);
      throw new Error(message);
    }

    return normalizeResult(data);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'process-capture 호출 중 알 수 없는 오류가 발생했습니다.';
    console.error('[api] processCapture 실패:', message);
    throw new Error(message);
  }
}
