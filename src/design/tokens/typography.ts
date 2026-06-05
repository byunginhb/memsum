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

/** RN fontWeight 타입과 호환되도록 리터럴 유니온으로 고정. */
type FontWeight = '400' | '500' | '600' | '700' | '800';

type TypeScale = {
  size: number;
  line: number;
  weight: FontWeight;
};

export const typography = {
  caption: { size: 12, line: 16, weight: '500' },
  bodySm: { size: 13, line: 18, weight: '400' },
  body: { size: 15, line: 22, weight: '400' },
  bodyMd: { size: 16, line: 24, weight: '500' },
  title: { size: 18, line: 26, weight: '600' },
  heading: { size: 22, line: 30, weight: '700' },
  display: { size: 28, line: 36, weight: '700' },
  hero: { size: 34, line: 42, weight: '800' },
} as const satisfies Record<string, TypeScale>;

export type TypographyToken = keyof typeof typography;
