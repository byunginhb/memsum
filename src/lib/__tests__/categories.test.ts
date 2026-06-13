import { CATEGORY_KEYS, normalizeCategory } from '../categories';

// 카테고리 정규화는 process-capture 응답·구버전 행을 안전한 6종으로 좁히는 경계 로직이라
// 회귀 시 잘못된 묶음/크래시로 이어진다. 핵심 분기를 고정한다.

describe('normalizeCategory', () => {
  it('유효한 6종 키는 그대로 통과시킨다', () => {
    for (const key of CATEGORY_KEYS) {
      expect(normalizeCategory(key, false)).toBe(key);
      expect(normalizeCategory(key, true)).toBe(key);
    }
  });

  it('알 수 없는 값은 이벤트 유무로 폴백한다 (event/etc)', () => {
    expect(normalizeCategory('unknown', true)).toBe('event');
    expect(normalizeCategory('unknown', false)).toBe('etc');
  });

  it('null·undefined·빈 문자열도 폴백한다', () => {
    expect(normalizeCategory(null, true)).toBe('event');
    expect(normalizeCategory(null, false)).toBe('etc');
    expect(normalizeCategory(undefined, false)).toBe('etc');
    expect(normalizeCategory('', false)).toBe('etc');
  });

  it('항상 6종 화이트리스트 안의 값을 반환한다', () => {
    const inputs: (string | null | undefined)[] = [null, undefined, '', 'xyz', 'EVENT'];
    for (const raw of inputs) {
      expect(CATEGORY_KEYS).toContain(normalizeCategory(raw, false));
      expect(CATEGORY_KEYS).toContain(normalizeCategory(raw, true));
    }
  });
});
