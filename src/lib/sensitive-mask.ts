// 화면 표시용 민감 숫자 가리기(원격 #6). 저장된 원문은 바꾸지 않는다 — 표시 레이어 전용.

/**
 * 카드번호 모양(16자리 연속 또는 4-4-4-4, 하이픈·공백 구분). 앞 4자리만 남긴다.
 * why 카드번호만: 계좌번호는 은행마다 자릿수·구분이 달라 오탐(주문번호·전화번호)이 많다.
 * 16자리 고정인 카드번호는 오탐 없이 잡힌다.
 */
const CARD_NUMBER_RE = /\b(\d{4})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;

/** 원문을 가려야 하는 분류(영수증·쇼핑 캡처에 카드번호가 찍혀 나온다). */
const SENSITIVE_CATEGORIES: ReadonlySet<string> = new Set(['receipt', 'shopping']);

export type MaskResult = {
  text: string;
  /** 실제로 가린 곳이 있는지 — "가렸어요" 안내는 이때만 띄운다. */
  masked: boolean;
};

export function maskCardNumbers(text: string): MaskResult {
  const masked = text.replace(CARD_NUMBER_RE, '$1-****-****-****');
  return { text: masked, masked: masked !== text };
}

/** 분류가 민감 분류일 때만 가린다. */
export function maskForCategory(text: string, category: string): MaskResult {
  if (!SENSITIVE_CATEGORIES.has(category)) return { text, masked: false };
  return maskCardNumbers(text);
}
