// src/features/parcel/polling.ts
//
// 폴링 간격 정책(순수 함수 — 테스트 용이). SweetTracker 동일 운송장 1일 20회 제한을 의식한다.
// level≤2(준비/집화) → 12h, level3~4(배송중/지점) → 3h, level5(배송출발) → 1h.
// 완료/중단은 폴링하지 않는다.

import type { ParcelLevel, ParcelTrack } from '@/features/parcel/types';

const HOUR_MS = 60 * 60 * 1000;

/** level → 다음 조회까지 최소 간격(ms). 완료(6)는 폴링 안 함(Infinity). */
export function pollIntervalMs(level: ParcelLevel): number {
  if (level >= 6) return Number.POSITIVE_INFINITY;
  if (level === 5) return 1 * HOUR_MS;
  if (level === 3 || level === 4) return 3 * HOUR_MS;
  // level 0~2: 변화가 드물어 길게.
  return 12 * HOUR_MS;
}

/**
 * 지금 이 추적을 조회해야 하는지 판단한다.
 * - 중단/완료 상태는 제외(이미 끝남).
 * - lastCheckedAt이 없으면(=한 번도 확인 안 함) 즉시 조회.
 * - level별 간격이 지났으면 조회.
 */
export function shouldRefresh(track: ParcelTrack, now: number): boolean {
  if (track.state !== 'active') return false;
  if (track.level >= 6) return false;
  if (!track.lastCheckedAt) return true;
  const last = new Date(track.lastCheckedAt).getTime();
  if (Number.isNaN(last)) return true;
  return now - last >= pollIntervalMs(track.level);
}
