/** U+2060 WORD JOINER — 폭이 없고 읽히지 않으며, 양옆에서 줄바꿈을 막는다. */
export const WORD_JOINER = '⁠';

// 한글 음절 바로 뒤에 한글 음절이 붙어 있는 자리(= 공백 없는 한글 연속의 내부).
const HANGUL_PAIR = /([가-힣])(?=[가-힣])/g;

/**
 * 공백 없는 한글 음절 사이에 WORD JOINER를 넣어, 줄바꿈이 공백(어절 경계)에서만 일어나게 한다.
 *
 * 안드로이드·웹은 한글을 음절마다 끊을 수 있는 글자로 다뤄 "결/혼식"처럼 단어 중간에서 줄이 바뀐다
 * (iOS는 lineBreakStrategyIOS="hangul-word"로 해결). 한글 연속에만 넣으므로 URL·운송장처럼
 * 공백 없는 영숫자 문자열의 줄바꿈 동작은 그대로다.
 */
export function keepHangulWords(text: string): string {
  return text.replace(HANGUL_PAIR, `$1${WORD_JOINER}`);
}
