// src/lib/parcel-api.ts
//
// 택배 추적 데이터 레이어 — track-parcel Edge Function 호출 + parcel_tracks DB CRUD.
// 모든 호출은 익명 세션 + RLS에 의존(api.ts / weekly-report.ts 패턴).
// SweetTracker 키는 서버 시크릿이라, 미설정 시 함수가 503 not_configured를 반환한다.

import { FunctionsHttpError } from '@supabase/supabase-js';

import type {
  CreateParcelInput,
  ParcelCarrier,
  ParcelEvent,
  ParcelLevel,
  ParcelTrack,
  ParcelTrackResult,
} from '@/features/parcel/types';
import { getSupabase } from '@/lib/supabase';

const FUNCTION_NAME = 'track-parcel';
const TABLE = 'parcel_tracks';

/** SweetTracker 키 미설정(503 not_configured) — UI가 "준비 중"으로 안내. */
export class ParcelNotConfiguredError extends Error {
  constructor() {
    super('택배 추적이 아직 설정되지 않았어요.');
    this.name = 'ParcelNotConfiguredError';
  }
}

async function extractFunctionError(error: unknown): Promise<Error> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body?.error === 'not_configured') return new ParcelNotConfiguredError();
      if (typeof body?.error === 'string' && body.error.length > 0) {
        return new Error(body.error);
      }
    } catch {
      // 본문 파싱 실패 → 기본 메시지.
    }
    return new Error('택배 조회 중 서버 오류가 발생했어요.');
  }
  return error instanceof Error ? error : new Error('택배 조회에 실패했어요.');
}

async function requireSession(): Promise<void> {
  const supabase = getSupabase();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error('로그인 세션이 없어 택배를 추적할 수 없어요.');
  }
}

// ── Edge Function ─────────────────────────────────────────────────────────────

/** 운송장번호로 택배사 후보 추정. */
export async function recommendCarrier(invoiceNo: string): Promise<ParcelCarrier[]> {
  await requireSession();
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action: 'recommend', invoice_no: invoiceNo },
  });
  if (error) throw await extractFunctionError(error);
  const carriers = (data as { carriers?: unknown })?.carriers;
  if (!Array.isArray(carriers)) return [];
  return carriers
    .filter((c): c is ParcelCarrier => typeof c?.code === 'string' && c.code.length > 0)
    .map((c) => ({ code: c.code, name: typeof c.name === 'string' ? c.name : '' }));
}

/** 택배사코드+운송장으로 배송 상태 조회. */
export async function trackParcel(
  carrierCode: string,
  invoiceNo: string,
): Promise<ParcelTrackResult> {
  await requireSession();
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action: 'track', carrier_code: carrierCode, invoice_no: invoiceNo },
  });
  if (error) throw await extractFunctionError(error);
  return normalizeTrackResult(data, carrierCode, invoiceNo);
}

function clampLevel(raw: unknown): ParcelLevel {
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return (n > 6 ? 6 : n) as ParcelLevel;
}

function normalizeEvents(raw: unknown): ParcelEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .map((e) => ({
      level: typeof e.level === 'number' ? e.level : null,
      kind: typeof e.kind === 'string' ? e.kind : '',
      where: typeof e.where === 'string' ? e.where : '',
      timeString: typeof e.timeString === 'string' ? e.timeString : '',
    }));
}

function normalizeTrackResult(
  raw: unknown,
  carrierCode: string,
  invoiceNo: string,
): ParcelTrackResult {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const found = o.found !== false;
  return {
    found,
    message: typeof o.message === 'string' ? o.message : undefined,
    carrierCode: typeof o.carrier_code === 'string' ? o.carrier_code : carrierCode,
    invoiceNo: typeof o.invoice_no === 'string' && o.invoice_no.length > 0
      ? o.invoice_no
      : invoiceNo,
    level: clampLevel(o.level),
    complete: o.complete === true,
    statusText: typeof o.status_text === 'string' ? o.status_text : '',
    lastWhere: typeof o.last_where === 'string' ? o.last_where : '',
    estimate: typeof o.estimate === 'string' ? o.estimate : null,
    lastEventAt: typeof o.last_event_at === 'string' ? o.last_event_at : null,
    deliveredAt: typeof o.delivered_at === 'string' ? o.delivered_at : null,
    events: normalizeEvents(o.events),
  };
}

// ── parcel_tracks DB ──────────────────────────────────────────────────────────

function normalizeRow(raw: unknown): ParcelTrack {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof o.id === 'string' ? o.id : '',
    captureId: typeof o.capture_id === 'string' ? o.capture_id : null,
    carrierCode: typeof o.carrier_code === 'string' ? o.carrier_code : '',
    carrierName: typeof o.carrier_name === 'string' ? o.carrier_name : null,
    invoiceNo: typeof o.invoice_no === 'string' ? o.invoice_no : '',
    level: clampLevel(o.level),
    statusText: typeof o.status_text === 'string' ? o.status_text : null,
    lastWhere: typeof o.last_where === 'string' ? o.last_where : null,
    estimate: typeof o.estimate === 'string' ? o.estimate : null,
    events: normalizeEvents(o.events),
    lastEventAt: typeof o.last_event_at === 'string' ? o.last_event_at : null,
    lastCheckedAt: typeof o.last_checked_at === 'string' ? o.last_checked_at : null,
    deliveredAt: typeof o.delivered_at === 'string' ? o.delivered_at : null,
    state: o.state === 'delivered' || o.state === 'stopped' ? o.state : 'active',
    notifiedOutForDelivery: o.notified_out_for_delivery === true,
    notifiedDelivered: o.notified_delivered === true,
    createdAt: typeof o.created_at === 'string' ? o.created_at : '',
  };
}

const ROW_COLUMNS =
  'id, capture_id, carrier_code, carrier_name, invoice_no, level, status_text, last_where, estimate, events, last_event_at, last_checked_at, delivered_at, state, notified_out_for_delivery, notified_delivered, created_at';

/** 추적 등록(중복은 기존 행 반환). */
export async function createParcelTrack(input: CreateParcelInput): Promise<ParcelTrack> {
  const supabase = getSupabase();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('로그인 세션이 없어 택배를 추적할 수 없어요.');
  }
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        user_id: session.user.id,
        capture_id: input.captureId ?? null,
        carrier_code: input.carrierCode,
        carrier_name: input.carrierName ?? null,
        invoice_no: input.invoiceNo,
      },
      { onConflict: 'user_id,carrier_code,invoice_no' },
    )
    .select(ROW_COLUMNS)
    .single();
  if (error || !data) {
    throw new Error(`택배 등록 실패: ${error?.message ?? '알 수 없는 오류'}`);
  }
  return normalizeRow(data);
}

/** 활성/최근(완료 포함, 중단 제외) 추적 목록. */
export async function listParcelTracks(): Promise<ParcelTrack[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(TABLE)
    .select(ROW_COLUMNS)
    .neq('state', 'stopped')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[parcel] 목록 조회 실패:', error.message);
    return [];
  }
  return (data ?? []).map(normalizeRow);
}

/** 조회 결과를 행에 반영(상태·이벤트·시각·완료 갱신). */
export async function applyTrackResult(
  id: string,
  result: ParcelTrackResult,
  patch: Partial<{ notifiedOutForDelivery: boolean; notifiedDelivered: boolean }> = {},
): Promise<ParcelTrack | null> {
  const supabase = getSupabase();
  const nowIso = new Date().toISOString();
  const delivered = result.complete || result.level >= 6;
  const update: Record<string, unknown> = {
    level: result.level,
    status_text: result.statusText,
    last_where: result.lastWhere,
    estimate: result.estimate,
    events: result.events,
    last_event_at: result.lastEventAt,
    last_checked_at: nowIso,
    delivered_at: result.deliveredAt,
    state: delivered ? 'delivered' : 'active',
  };
  if (patch.notifiedOutForDelivery !== undefined) {
    update.notified_out_for_delivery = patch.notifiedOutForDelivery;
  }
  if (patch.notifiedDelivered !== undefined) {
    update.notified_delivered = patch.notifiedDelivered;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(update)
    .eq('id', id)
    .select(ROW_COLUMNS)
    .single();
  if (error || !data) {
    console.error('[parcel] 갱신 실패:', error?.message);
    return null;
  }
  return normalizeRow(data);
}

/** 추적 중단(아카이브). */
export async function stopParcelTrack(id: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from(TABLE).update({ state: 'stopped' }).eq('id', id);
}

/** 추적 삭제. */
export async function deleteParcelTrack(id: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from(TABLE).delete().eq('id', id);
}
