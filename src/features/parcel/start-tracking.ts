// src/features/parcel/start-tracking.ts
//
// 추적 시작·갱신 오케스트레이션(create → track → apply + 전이 알림).
// 캡처 감지 블록·수동 입력·폴링이 공유하는 단일 흐름(중복 제거).

import type {
  CreateParcelInput,
  ParcelTrack,
  ParcelTrackResult,
} from '@/features/parcel/types';
import { isDelivered, isOutForDelivery } from '@/lib/parcel';
import { applyTrackResult, createParcelTrack, trackParcel } from '@/lib/parcel-api';
import {
  presentParcelDelivered,
  presentParcelOutForDelivery,
} from '@/lib/notifications';

/**
 * 조회 결과의 상태 전이를 보고 필요한 로컬 알림을 띄우고, 알림 플래그 patch를 만든다.
 * - level5 + notifiedOutForDelivery=false → "오늘 도착 예상" 알림 + 플래그.
 * - delivered + notifiedDelivered=false → "배송 완료" 알림 + 플래그.
 * 알림 자체는 best-effort(권한 거부·실패해도 플래그는 올려 재알림을 막는다).
 */
async function notifyOnTransition(
  track: ParcelTrack,
  result: ParcelTrackResult,
): Promise<Partial<{ notifiedOutForDelivery: boolean; notifiedDelivered: boolean }>> {
  const patch: Partial<{ notifiedOutForDelivery: boolean; notifiedDelivered: boolean }> = {};
  const carrierName = track.carrierName ?? '';

  if (isDelivered(result.level, result.complete)) {
    if (!track.notifiedDelivered) {
      await presentParcelDelivered({
        trackId: track.id,
        carrierName,
        deliveredAt: result.deliveredAt,
      });
      patch.notifiedDelivered = true;
    }
    return patch;
  }

  if (isOutForDelivery(result.level) && !track.notifiedOutForDelivery) {
    await presentParcelOutForDelivery({
      trackId: track.id,
      carrierName,
      estimate: result.estimate,
    });
    patch.notifiedOutForDelivery = true;
  }
  return patch;
}

/**
 * 새 추적을 등록하고 즉시 1회 조회해 상태를 반영한다.
 * 등록 직후 결과의 전이 알림도 처리한다(예: 이미 배송출발/완료 상태로 캡처된 경우).
 * @returns 갱신된 ParcelTrack(실패 시 등록 행만, 그래도 null 아님) 또는 등록 실패 시 throw.
 */
export async function startParcelTracking(input: CreateParcelInput): Promise<ParcelTrack> {
  const created = await createParcelTrack(input);
  try {
    const result = await trackParcel(created.carrierCode, created.invoiceNo);
    const patch = await notifyOnTransition(created, result);
    const updated = await applyTrackResult(created.id, result, patch);
    return updated ?? created;
  } catch (error) {
    // 조회 실패는 비치명: 등록은 됐으므로 행을 반환하고, 다음 폴링/수동 새로고침에서 재시도한다.
    console.error('[parcel] 등록 후 초기 조회 실패:', error);
    return created;
  }
}

/**
 * 기존 추적을 1회 조회해 갱신한다(폴링·수동 새로고침 공용).
 * 상태 전이 시 로컬 알림 + 플래그 patch를 함께 처리한다.
 * @returns 갱신된 ParcelTrack(실패 시 null — 호출측은 기존 행 유지).
 */
export async function refreshParcelTracking(track: ParcelTrack): Promise<ParcelTrack | null> {
  const result = await trackParcel(track.carrierCode, track.invoiceNo);
  const patch = await notifyOnTransition(track, result);
  return applyTrackResult(track.id, result, patch);
}
