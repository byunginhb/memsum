// supabase/functions/_shared/time-zone.ts
//
// 시간대 순수 유틸 — Deno 전역/외부 의존 없음(Jest에서도 그대로 테스트).
// process-capture가 "내일 3시" 같은 상대 일정을 사용자 기기 시간대 기준으로 해석하도록,
// 클라이언트가 보낸 IANA 시간대를 검증하고 현재 시각/오프셋 문자열을 만든다.

/** 시간대를 못 받았거나 잘못됐을 때의 기본값(1차 시장 — 구버전 클라이언트 호환). */
export const DEFAULT_TIME_ZONE = "Asia/Seoul";

/** IANA 시간대 이름 최대 길이(가장 긴 실제 이름 ~32자) — 비정상 입력 방어. */
const MAX_TIME_ZONE_LENGTH = 64;

/** 입력이 유효한 IANA 시간대면 그대로, 아니면 기본값. */
export function resolveTimeZone(raw: unknown): string {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_TIME_ZONE_LENGTH) {
    return DEFAULT_TIME_ZONE;
  }
  try {
    // 잘못된 이름이면 RangeError.
    new Intl.DateTimeFormat("en-US", { timeZone: raw });
    return raw;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

// 해당 시간대의 벽시계 시각(연·월·일·시·분·초).
function wallClock(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

const pad = (n: number): string => String(n).padStart(2, "0");

/** 그 시각의 UTC 오프셋 "+09:00" / "-04:00" / "+05:30" (서머타임 반영). */
export function utcOffset(date: Date, timeZone: string): string {
  const w = wallClock(date, timeZone);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  // 초 단위 절삭 오차를 없애려 원 시각도 초로 맞춰 비교한다.
  const actual = Math.floor(date.getTime() / 1000) * 1000;
  const offsetMin = Math.round((asUtc - actual) / 60000);
  const sign = offsetMin >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMin);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** 그 시간대의 벽시계 시각을 오프셋 포함 ISO8601로. 예: "2026-10-04T15:30:00+09:00". */
export function localIsoWithOffset(date: Date, timeZone: string): string {
  const w = wallClock(date, timeZone);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}` +
    utcOffset(date, timeZone);
}
