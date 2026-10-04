// 웹 대체 구현 — 웹(개발용 미리보기)에는 Vision/ML Kit가 없다.
// 같은 이름으로 export만 맞춰 번들이 깨지지 않게 하고, 호출되면 "글자 없음"으로 끝낸다
// (캡처 파이프라인은 빈 텍스트를 "저장하지 않음"으로 조용히 처리한다).

export type OcrResult = {
  text: string;
  confidence?: number;
  lines?: OcrLine[];
};

export type OcrBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrLine = OcrBox & { text: string };

export async function recognizeText(_source: { assetId?: string; uri?: string }): Promise<OcrResult> {
  return { text: '' };
}

export default {};
