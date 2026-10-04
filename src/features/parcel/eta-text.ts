// src/features/parcel/eta-text.ts
//
// level(+estimate) → 사용자 대면 도착 추정 문구. 단정형 금지(가능성형 i18n 카피).
// 카드·상세가 공유하는 단일 표현 규칙(중복 방지).

import type { ParcelLevel } from '@/features/parcel/types';
import { levelToEtaKey } from '@/lib/parcel';
import { t } from '@/i18n';

/**
 * 도착 추정 문구를 만든다. level 6(완료)은 추정이 아니라 실제 도착 시각을 쓰므로 null.
 * level 5 + estimate가 있으면 시간대를 보간한다("오늘 {time} 도착 예상이에요").
 */
export function parcelEtaText(level: ParcelLevel, estimate: string | null): string | null {
  const hasEstimate = typeof estimate === 'string' && estimate.length > 0;
  const key = levelToEtaKey(level, hasEstimate);
  if (!key) return null;
  if (key === 'parcel.eta.todayWithTime' && hasEstimate) {
    return t(key, { time: estimate as string });
  }
  return t(key);
}

/**
 * 배송 시각 표시 포맷(ko-KR). ISO(+09:00) 또는 SweetTracker "YYYY-MM-DD HH:mm:ss" 모두 수용.
 * 파싱 실패 시 원문을 그대로 반환(원시 타임스탬프 노출 방지 + 빈 화면 방지).
 */
export function formatParcelTime(value: string | null | undefined): string {
  if (!value) return '';
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** 두 자리 0 채움. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * 타임라인 mono 열용 짧은 시각. 예: { date: "10.04", time: "14:32" }.
 * 숫자만 쓰므로 JetBrains Mono로 그대로 그릴 수 있다(한글 없음). 파싱 실패 시 null.
 */
export function formatParcelStamp(
  value: string | null | undefined,
): { date: string; time: string } | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: `${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}
