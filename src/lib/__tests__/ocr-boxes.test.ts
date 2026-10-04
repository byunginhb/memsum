import { MAX_OCR_BOXES, topOcrBoxes } from '../ocr-boxes';

const line = (y: number, x = 0.1, width = 0.5, height = 0.03) => ({
  text: `y${y}`,
  x,
  y,
  width,
  height,
});

describe('topOcrBoxes', () => {
  it('lines가 없으면 빈 배열', () => {
    expect(topOcrBoxes(undefined)).toEqual([]);
  });

  it('위에서부터(같은 높이는 왼쪽부터) 정렬하고 글자는 뺀다', () => {
    const boxes = topOcrBoxes([line(0.5), line(0.1, 0.6), line(0.1, 0.2)]);
    expect(boxes).toEqual([
      { x: 0.2, y: 0.1, width: 0.5, height: 0.03 },
      { x: 0.6, y: 0.1, width: 0.5, height: 0.03 },
      { x: 0.1, y: 0.5, width: 0.5, height: 0.03 },
    ]);
  });

  it(`최대 ${MAX_OCR_BOXES}개만 남긴다`, () => {
    const many = Array.from({ length: 12 }, (_, i) => line(1 - i * 0.05));
    const boxes = topOcrBoxes(many);
    expect(boxes).toHaveLength(MAX_OCR_BOXES);
    expect(boxes[0]?.y).toBeCloseTo(0.45);
  });

  it('크기 0·숫자 아님 상자는 뺀다', () => {
    expect(topOcrBoxes([line(0.1, 0.1, 0), line(0.2, Number.NaN), line(0.3)])).toHaveLength(1);
  });
});
