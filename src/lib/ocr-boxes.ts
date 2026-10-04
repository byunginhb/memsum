import type { OcrBox, OcrLine } from '../../modules/vision-ocr';

/**
 * 캡처 시트 스캔 연출(ScanReveal)에 넘길 글자 상자 상한.
 * why 8: 상자가 많으면 연출이 어수선해지고, 위쪽 몇 줄이면 "읽고 있다"는 느낌이 충분하다.
 */
export const MAX_OCR_BOXES = 8;

/**
 * OCR 줄 좌표 → 위에서부터 최대 MAX_OCR_BOXES개의 상자(글자는 버린다).
 * 크기 0인 상자와 범위를 벗어난 값은 뺀다(구버전·이상 응답 방어).
 */
export function topOcrBoxes(lines: readonly OcrLine[] | undefined): OcrBox[] {
  if (!lines) return [];
  return lines
    .filter(
      (line) =>
        [line.x, line.y, line.width, line.height].every(Number.isFinite) &&
        line.width > 0 &&
        line.height > 0,
    )
    .map(({ x, y, width, height }) => ({ x, y, width, height }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .slice(0, MAX_OCR_BOXES);
}
