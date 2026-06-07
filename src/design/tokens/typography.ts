/**
 * 타이포그래피 토큰 — 디자인시스템.md §2.2
 *
 * 한국어: Pretendard Variable / 영어·숫자: Inter Variable.
 * 폴백: iOS `-apple-system`, Android `Roboto` (useFonts 실패 시 시스템 폰트).
 */
export const fontFamily = {
  sans: 'Pretendard-Variable',
  sansEn: 'Inter-Variable',
  mono: 'JetBrainsMono',
} as const;

/**
 * RN fontWeight 타입과 호환되도록 리터럴 유니온으로 고정.
 * '800'은 design.md §7.3 "weight 800 금지(과한 굵기 회피)"에 따라 의도적으로 제외한다.
 */
type FontWeight = '400' | '500' | '600' | '700';

type TypeScale = {
  size: number;
  line: number;
  weight: FontWeight;
  /** 자간(em). RN letterSpacing(pt)으로 쓰려면 letterSpacingFor()로 변환. design.md §7.2. */
  tracking: number;
};

export const typography = {
  caption: { size: 12, line: 16, weight: '500', tracking: 0 },
  bodySm: { size: 13, line: 18, weight: '400', tracking: 0 },
  body: { size: 15, line: 22, weight: '400', tracking: 0 },
  bodyMd: { size: 16, line: 24, weight: '500', tracking: 0 },
  title: { size: 18, line: 26, weight: '600', tracking: -0.01 },
  heading: { size: 22, line: 30, weight: '700', tracking: -0.015 },
  display: { size: 28, line: 36, weight: '700', tracking: -0.02 },
  // weight 800 금지(§7.3) — 큰 제목은 자간을 좁혀 밀도를 준다.
  hero: { size: 34, line: 42, weight: '700', tracking: -0.025 },
} as const satisfies Record<string, TypeScale>;

export type TypographyToken = keyof typeof typography;

/**
 * 자간을 RN letterSpacing(pt)으로 변환한다: pt = size × tracking(em).
 * 큰 제목(display/hero/heading/title)의 자간을 살짝 좁혀 가독성·밀도를 높인다.
 */
export function letterSpacingFor(token: TypographyToken): number {
  const scale = typography[token];
  return scale.size * scale.tracking;
}
