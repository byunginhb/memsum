// Google Calendar REST(events.insert) 래퍼.
// CaptureEvent(GPT 후처리 결과)를 primary 캘린더에 일정으로 등록한다.
//
// 토큰 관리(저장/갱신/재시도)는 calendar-store의 책임이고, 이 파일은 순수하게
// "주어진 accessToken으로 1회 등록"만 담당한다. 그래서 401(만료/무효)을
// CalendarUnauthorizedError로 구분해 던져, 스토어가 refresh 후 재시도할지 판단하게 한다.
//
// 보안: accessToken은 시크릿이므로 어떤 경로로도 console.error/log에 남기지 않는다.

import type { CaptureEvent } from '@/features/capture/types';
import type {
  GoogleCalendarEventInput,
  GoogleCalendarEventResult,
} from '@/features/calendar/types';

/** events.insert 엔드포인트. 항상 사용자의 기본(primary) 캘린더에 등록한다. */
const EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/**
 * 일정 타임존. 앱이 한국 사용자 기준이고 starts_at이 KST(+09:00)로 들어오므로
 * 캘린더 이벤트도 동일 타임존으로 고정한다.
 */
const TIME_ZONE = 'Asia/Seoul';

/** 종료 시각이 없을 때 기본 일정 길이(1시간). */
const DEFAULT_DURATION_MS = 60 * 60 * 1000;

/** KST 오프셋(ms). dateTime을 +09:00 벽시계 표기로 통일하는 데 쓴다. */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Google Calendar 이벤트 본문 설명. 캘린더에 직접 노출되는 고정 문구라 i18n 예외. */
const EVENT_DESCRIPTION = 'Memsum에서 자동으로 추가한 일정이에요.';

/** 결정적 이벤트 id 접두사. base32hex(a-v,0-9) 유효 문자만 사용한다. */
const EVENT_ID_PREFIX = 'memsum';

/** Google Calendar 이벤트 id 최대 길이(base32hex, 5~1024). */
const EVENT_ID_MAX_LENGTH = 1024;

/** OAuth 만료/무효 토큰 응답(401) 식별용. */
const UNAUTHORIZED_STATUS = 401;

/** 동일 id 이벤트가 이미 존재할 때의 응답(409) 식별용. */
const CONFLICT_STATUS = 409;

/**
 * accessToken이 만료·무효일 때(HTTP 401) 던진다.
 * 스토어가 이 타입을 잡아 refreshToken으로 갱신 후 재시도할지 결정한다.
 */
export class CalendarUnauthorizedError extends Error {
  constructor(message = '구글 캘린더 인증이 만료되었어요. 다시 연결해 주세요.') {
    super(message);
    // TS에서 Error 상속 시 instanceof가 깨지지 않도록 프로토타입 명시 복원.
    this.name = 'CalendarUnauthorizedError';
    Object.setPrototypeOf(this, CalendarUnauthorizedError.prototype);
  }
}

/**
 * 같은 결정적 id의 이벤트가 이미 캘린더에 있을 때(HTTP 409) 던진다.
 * 스토어가 이 타입을 잡으면 "이미 등록됨"으로 간주해 중복 생성을 막는다(멱등 보장).
 */
export class CalendarConflictError extends Error {
  constructor(message = '이미 캘린더에 등록된 일정이에요.') {
    super(message);
    this.name = 'CalendarConflictError';
    Object.setPrototypeOf(this, CalendarConflictError.prototype);
  }
}

/**
 * captureId(Supabase uuid)에서 결정적 캘린더 이벤트 id를 만든다.
 * Google Calendar event id는 base32hex(소문자 a-v·숫자 0-9, 길이 5~1024)만 허용한다.
 * uuid의 16진수(0-9a-f)는 모두 유효 문자이고, 하이픈 등 비허용 문자는 제거한다.
 * why 결정적: events.insert에 같은 id를 주면 중복 호출이 409로 거부돼(멱등),
 * DB 반영 실패 후 재시도해도 캘린더에 같은 일정이 두 번 생기지 않는다.
 */
export function makeCalendarEventId(captureId: string): string {
  const sanitized = captureId.replace(/[^0-9a-v]/gi, '').toLowerCase();
  return (EVENT_ID_PREFIX + sanitized).slice(0, EVENT_ID_MAX_LENGTH);
}

/** 값이 https URL이면 그 문자열을, 아니면 null을 돌려준다(딥링크 안전 가드용). */
function asHttpsUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    return new URL(value).protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

/** epoch ms를 KST(+09:00) 벽시계 ISO8601 문자열로 변환한다(start/end 표기 통일용). */
function toKstIso(epochMs: number): string {
  const kst = new Date(epochMs + KST_OFFSET_MS);
  const pad = (n: number): string => String(n).padStart(2, '0');
  const y = kst.getUTCFullYear();
  const mo = pad(kst.getUTCMonth() + 1);
  const d = pad(kst.getUTCDate());
  const h = pad(kst.getUTCHours());
  const mi = pad(kst.getUTCMinutes());
  const s = pad(kst.getUTCSeconds());
  return `${y}-${mo}-${d}T${h}:${mi}:${s}+09:00`;
}

/**
 * CaptureEvent(GPT 후처리 결과)를 events.insert 요청 바디로 변환한다.
 * 종료 시각이 없으면 시작 시각 + 1시간으로 채운다.
 *
 * why 시각 정규화: start/end 모두 toKstIso로 +09:00 표기를 통일한다. starts_at에
 * 오프셋이 빠져 있어도(상류 계약상 +09:00이지만 방어적으로) 파싱 후 KST로 재직렬화해
 * start(+09:00)·end(UTC Z) 표기가 섞이던 문제를 없앤다.
 *
 * @param eventId 결정적 이벤트 id(멱등 등록용). 지정 시 요청 바디 id로 넣는다.
 * @throws starts_at·ends_at이 유효한 날짜 문자열이 아니면 에러.
 */
export function mapEventToCalendarInput(
  event: CaptureEvent,
  eventId?: string,
): GoogleCalendarEventInput {
  const startMs = Date.parse(event.starts_at);
  // 시작 시각이 파싱 불가하면 종료 시각 계산도 불가하므로 즉시 중단한다.
  if (Number.isNaN(startMs)) {
    throw new Error(
      `일정 시작 시각을 해석할 수 없어요: "${event.starts_at}"`,
    );
  }

  // ends_at이 있으면 파싱해 사용하고(파싱 실패 시 기본 길이로 폴백), 없으면 시작 + 기본 길이.
  let endMs = startMs + DEFAULT_DURATION_MS;
  if (event.ends_at) {
    const parsedEnd = Date.parse(event.ends_at);
    // 종료가 시작보다 빠르거나 파싱 불가면 기본 길이로 보정(잘못된 일정 방지).
    if (!Number.isNaN(parsedEnd) && parsedEnd > startMs) {
      endMs = parsedEnd;
    }
  }

  return {
    ...(eventId ? { id: eventId } : {}),
    summary: event.title,
    description: EVENT_DESCRIPTION,
    location: event.location ?? undefined,
    start: { dateTime: toKstIso(startMs), timeZone: TIME_ZONE },
    end: { dateTime: toKstIso(endMs), timeZone: TIME_ZONE },
  };
}

/**
 * 변환된 이벤트를 primary 캘린더에 등록한다.
 *
 * @param accessToken 유효한 OAuth access token(절대 로그에 남기지 않는다).
 * @throws CalendarUnauthorizedError 401(토큰 만료/무효)인 경우.
 * @throws Error 그 외 실패(상태코드·응답 본문 포함). 응답 본문에는 토큰이 없으므로 로깅 안전.
 */
export async function insertEvent(
  accessToken: string,
  input: GoogleCalendarEventInput,
): Promise<GoogleCalendarEventResult> {
  let response: Response;
  try {
    response = await fetch(EVENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
  } catch (error) {
    // 네트워크 자체 실패(오프라인 등). error 객체에는 토큰이 포함되지 않는다.
    console.error('[google-calendar] events.insert 네트워크 오류:', error);
    throw new Error('네트워크 오류로 일정을 등록하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }

  // 토큰 만료/무효는 스토어가 갱신·재시도할 수 있도록 전용 타입으로 구분한다.
  if (response.status === UNAUTHORIZED_STATUS) {
    throw new CalendarUnauthorizedError();
  }

  // 같은 결정적 id의 이벤트가 이미 있으면(멱등 재시도) 전용 타입으로 구분한다.
  if (response.status === CONFLICT_STATUS) {
    throw new CalendarConflictError();
  }

  if (!response.ok) {
    // 응답 본문은 Google API 에러 메시지(민감정보 없음)라 진단용으로 안전하게 읽는다.
    let body = '';
    try {
      body = await response.text();
    } catch {
      body = '(응답 본문을 읽지 못함)';
    }
    console.error(
      `[google-calendar] events.insert 실패 (status=${response.status}):`,
      body,
    );
    throw new Error(
      `구글 캘린더 등록에 실패했어요. (status=${response.status})`,
    );
  }

  let json: { id?: string; htmlLink?: string | null };
  try {
    json = (await response.json()) as { id?: string; htmlLink?: string | null };
  } catch (error) {
    console.error('[google-calendar] events.insert 응답 파싱 오류:', error);
    throw new Error('구글 캘린더 응답을 해석하지 못했어요.');
  }

  // 외부 응답이므로 id를 런타임 검증한다(타입 단언만 신뢰하지 않는다).
  // id가 없거나 빈 문자열이면 등록 성공으로 볼 수 없다(이후 딥링크·중복방지에 id 필수).
  if (typeof json.id !== 'string' || json.id.length === 0) {
    console.error('[google-calendar] events.insert 응답에 유효한 id가 없습니다.');
    throw new Error('구글 캘린더 등록 결과가 올바르지 않아요.');
  }

  return {
    id: json.id,
    // htmlLink는 https URL일 때만 통과시킨다(임의 스킴 딥링크 트리거 방지 — 신뢰 경계 검증).
    htmlLink: asHttpsUrl(json.htmlLink),
  };
}
