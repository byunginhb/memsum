import { keepHangulWords, WORD_JOINER } from '@/design/components/Text/keep-hangul-words';

describe('keepHangulWords', () => {
  it('공백 없는 한글 음절 사이에만 WORD JOINER를 넣고, 공백·영숫자는 건드리지 않는다', () => {
    const out = keepHangulWords('결혼식 10월 18일 https://a.b/c 1234-5678');
    expect(out).toBe(
      `결${WORD_JOINER}혼${WORD_JOINER}식 10월 18일 https://a.b/c 1234-5678`,
    );
    // 넣은 글자를 빼면 원문과 같다(보이는 글자·읽히는 글자는 바뀌지 않는다).
    expect(out.split(WORD_JOINER).join('')).toBe('결혼식 10월 18일 https://a.b/c 1234-5678');
    expect(keepHangulWords('a')).toBe('a');
  });
});
