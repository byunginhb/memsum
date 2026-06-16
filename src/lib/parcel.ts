// src/lib/parcel.ts
//
// 택배 추적 순수 헬퍼 — SMS 텍스트 파싱·운송장 마스킹·level 매핑.
// I/O 없음(유닛 테스트 용이). 네트워크/DB는 parcel-api.ts 담당.
//
// 한국 택배 API는 며칠 후 도착 ETA를 주지 않는다 → level 기반 "추정"만 하고 단정형은 쓰지 않는다.

import type {
  ParcelCarrier,
  ParcelExtraction,
  ParcelLevel,
} from '@/features/parcel/types';

/**
 * SMS에서 흔한 택배사 표기 → 표준 표시명. 권위 t_code는 recommend로 확정하므로
 * 여기서는 "후보 매칭용 이름 힌트"만 만든다(코드 하드코딩으로 인한 오류 회피).
 */
const CARRIER_HINTS: readonly { pattern: RegExp; name: string }[] = [
  { pattern: /(CJ\s*대한통운|대한통운|CJ\s*GLS|CJ택배)/i, name: 'CJ대한통운' },
  { pattern: /(우체국|등기소포|우편)/, name: '우체국택배' },
  { pattern: /(한진택배|한진)/, name: '한진택배' },
  { pattern: /(롯데\s*글로벌|롯데택배|롯데)/, name: '롯데택배' },
  { pattern: /(로젠택배|로젠)/, name: '로젠택배' },
  { pattern: /(쿠팡\s*로지스틱스|쿠팡|CLS)/i, name: '쿠팡' },
  // CU를 GS보다 먼저 판별한다 — "CU반값택배"의 '반값택배'가 GS 패턴에 먼저 걸리지 않도록.
  { pattern: /(CU\s*반값택배|CU\s*편의점|CU\s*알뜰|CU택배|CVSnet|씨유)/i, name: 'CU 편의점택배' },
  { pattern: /(GS\s*Postbox|GS25|GS\s*반값|반값택배|GS택배)/i, name: 'GS Postbox' },
  { pattern: /(경동택배|경동)/, name: '경동택배' },
  { pattern: /(대신택배|대신)/, name: '대신택배' },
  { pattern: /(일양로지스|일양)/, name: '일양로지스' },
];

/** 택배 관련 키워드(택배 SMS 판별용). */
const PARCEL_KEYWORDS = /(택배|배송|운송장|송장|등기번호|배달|상품.*출발|도착예정|집화)/;

/**
 * 운송장 번호 후보 정규식.
 * 1순위: "송장/운송장/등기 (번호) : 1234567890" 형태(라벨 동반).
 * 2순위: 9~14자리 숫자 시퀀스(하이픈 포함 가능).
 */
const INVOICE_LABELED =
  /(?:운송장|송장|등기)\s*(?:번호)?\s*[:\-]?\s*([0-9][0-9\- ]{8,16}[0-9])/;
const INVOICE_BARE = /(?<![0-9])([0-9][0-9\- ]{8,16}[0-9])(?![0-9])/;

/** 숫자만 남기고 9~14자리면 반환. */
function digitsOnly(raw: string): string | null {
  const d = raw.replace(/[^0-9]/g, '');
  return d.length >= 9 && d.length <= 14 ? d : null;
}

/** 텍스트에서 택배사 이름 힌트 추출(대괄호 우선, 없으면 키워드 매칭). */
function extractCarrierHint(text: string): string | null {
  // [택배사명] 대괄호 우선.
  const bracket = text.match(/\[([^\]]{1,20})\]/);
  const scope = bracket ? bracket[1] : text;
  for (const { pattern, name } of CARRIER_HINTS) {
    if (pattern.test(scope) || pattern.test(text)) return name;
  }
  return null;
}

/** 택배 SMS로 보이는지 휴리스틱 판별(오탐 최소화). */
export function isLikelyParcelSms(text: string): boolean {
  if (!text || text.length < 6) return false;
  const hasKeyword = PARCEL_KEYWORDS.test(text) || extractCarrierHint(text) !== null;
  if (!hasKeyword) return false;
  // 키워드 + 운송장 후보 숫자가 있어야 진짜 택배로 본다.
  return extractInvoice(text) !== null;
}

/** 운송장 번호만 추출(라벨 우선 → 맨숫자). 실패 시 null. */
export function extractInvoice(text: string): string | null {
  const labeled = text.match(INVOICE_LABELED);
  if (labeled) {
    const d = digitsOnly(labeled[1]);
    if (d) return d;
  }
  const bare = text.match(INVOICE_BARE);
  if (bare) {
    const d = digitsOnly(bare[1]);
    if (d) return d;
  }
  return null;
}

/** SMS에서 택배 단서(운송장+택배사힌트) 추출. 운송장 없으면 null. */
export function extractParcel(text: string): ParcelExtraction | null {
  const invoiceNo = extractInvoice(text);
  if (!invoiceNo) return null;
  return { invoiceNo, carrierNameHint: extractCarrierHint(text) };
}

/**
 * 운송장 번호 마스킹. 앞 4자리 노출, 뒤 2~4자리 노출, 가운데 별표.
 * 10자리 → 1234****90 / 13자리 → 1234*****5678.
 */
export function maskInvoice(invoiceNo: string): string {
  const d = invoiceNo.replace(/[^0-9]/g, '');
  if (d.length <= 6) return d;
  const front = 4;
  const back = d.length >= 12 ? 4 : 2;
  const stars = Math.max(2, d.length - front - back);
  return `${d.slice(0, front)}${'*'.repeat(stars)}${d.slice(d.length - back)}`;
}

/**
 * recommend 후보 + SMS 택배사 힌트로 최종 택배사 결정.
 * 힌트와 이름이 겹치는 후보 → 후보 1개 → 그 외엔 null(사용자 선택 필요).
 */
export function resolveCarrier(
  candidates: ParcelCarrier[],
  hint: string | null,
): ParcelCarrier | null {
  if (candidates.length === 0) return null;
  if (hint) {
    // 1순위: 정확/근접 매칭(양방향 포함). "CU 편의점택배"가 그대로 후보에 있으면 그것.
    //   recommend가 후보를 못 좁혀 전체 택배사를 줄 때 약한 토큰("CU"→"CUBEFLOW")에 오매칭되지 않도록
    //   완전 포함을 먼저 본다.
    const strong = candidates.find(
      (c) => c.name === hint || c.name.includes(hint) || hint.includes(c.name),
    );
    if (strong) return strong;
    // 2순위: 핵심 토큰 매칭 — 단 후보가 정확히 1개일 때만(복수면 모호 → 사용자 선택).
    const token = hint
      .replace(/택배|대한통운|로지스틱스|편의점|Postbox|글로벌|특송/gi, '')
      .trim();
    if (token.length >= 2) {
      const tokenMatches = candidates.filter((c) => c.name.includes(token));
      if (tokenMatches.length === 1) return tokenMatches[0];
    }
  }
  return candidates.length === 1 ? candidates[0] : null;
}

/** level → 상태 문구 i18n 키. */
export function levelToStatusKey(level: ParcelLevel): string {
  const map: Record<number, string> = {
    1: 'parcel.status.level1',
    2: 'parcel.status.level2',
    3: 'parcel.status.level3',
    4: 'parcel.status.level4',
    5: 'parcel.status.level5',
    6: 'parcel.status.level6',
  };
  return map[level] ?? 'parcel.status.level1';
}

/**
 * level(+estimate 유무) → 도착 추정 문구 i18n 키.
 * level 6은 도착 추정이 아니라 실제 도착 시각을 쓰므로 null.
 */
export function levelToEtaKey(
  level: ParcelLevel,
  hasEstimate: boolean,
): string | null {
  if (level >= 6) return null;
  if (level === 5) return hasEstimate ? 'parcel.eta.todayWithTime' : 'parcel.eta.todayNoTime';
  if (level === 3 || level === 4) return 'parcel.eta.todayOrTomorrow';
  return 'parcel.eta.unknown';
}

/** 배송 출발(오늘 도착 예상) 신호 — 알림 트리거. */
export function isOutForDelivery(level: ParcelLevel): boolean {
  return level === 5;
}

/** 배송 완료 판정. */
export function isDelivered(level: ParcelLevel, complete: boolean): boolean {
  return level >= 6 || complete;
}
