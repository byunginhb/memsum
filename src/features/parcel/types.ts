// src/features/parcel/types.ts
//
// 택배 추적 기능(한국 한정·옵션) 클라이언트 계약.
// track-parcel Edge Function 응답 / parcel_tracks 테이블 행과 1:1 대응한다.

/** 배송 진행 단계. 0=미조회, 1 준비 · 2 집화 · 3 배송중 · 4 지점도착 · 5 배송출발 · 6 배송완료. */
export type ParcelLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 추적 생명주기 상태. */
export type ParcelState = 'active' | 'delivered' | 'stopped';

/** 택배사 후보(추천/선택용). code는 SweetTracker t_code. */
export interface ParcelCarrier {
  readonly code: string;
  readonly name: string;
}

/** SMS 텍스트에서 추출한 택배 단서. carrierNameHint는 표시·후보 매칭용(권위 코드는 recommend로 확정). */
export interface ParcelExtraction {
  readonly invoiceNo: string;
  readonly carrierNameHint: string | null;
}

/** 단일 배송 이벤트(개인정보 제거됨 — 위치 허브명·상태만). */
export interface ParcelEvent {
  readonly level: number | null;
  readonly kind: string;
  readonly where: string;
  readonly timeString: string;
}

/** track-parcel(track) 응답 정규화 형태. */
export interface ParcelTrackResult {
  readonly found: boolean;
  readonly message?: string;
  readonly carrierCode: string;
  readonly invoiceNo: string;
  readonly level: ParcelLevel;
  readonly complete: boolean;
  readonly statusText: string;
  readonly lastWhere: string;
  readonly estimate: string | null;
  readonly lastEventAt: string | null;
  readonly deliveredAt: string | null;
  readonly events: ParcelEvent[];
}

/** parcel_tracks 테이블 행(클라이언트 camelCase). */
export interface ParcelTrack {
  readonly id: string;
  readonly captureId: string | null;
  readonly carrierCode: string;
  readonly carrierName: string | null;
  readonly invoiceNo: string;
  readonly level: ParcelLevel;
  readonly statusText: string | null;
  readonly lastWhere: string | null;
  readonly estimate: string | null;
  readonly events: ParcelEvent[];
  readonly lastEventAt: string | null;
  readonly lastCheckedAt: string | null;
  readonly deliveredAt: string | null;
  readonly state: ParcelState;
  readonly notifiedOutForDelivery: boolean;
  readonly notifiedDelivered: boolean;
  readonly createdAt: string;
}

/** 새 추적 등록 입력. */
export interface CreateParcelInput {
  readonly captureId?: string | null;
  readonly carrierCode: string;
  readonly carrierName?: string | null;
  readonly invoiceNo: string;
}
