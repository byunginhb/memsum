/**
 * 타이포그래피 토큰 — docs/design/redesign-2026-10.md §3
 *
 * Wanted Sans(정적 4굵기) + JetBrains Mono Medium.
 * 안드로이드는 fontWeight로 굵기를 고르지 못하므로 굵기마다 별도 fontFamily 이름을 쓴다.
 * 화면에서는 이 토큰을 직접 쓰기보다 공용 `<Text variant=…>`를 쓴다(폰트 미로딩 대체 동작 포함).
 */
export const fontFamily = {
  regular: 'WantedSans-Regular',
  semibold: 'WantedSans-SemiBold',
  bold: 'WantedSans-Bold',
  black: 'WantedSans-Black',
  /** 라틴·숫자 전용. 한글이 섞이면 Text가 Wanted Sans로 바꾼다. */
  mono: 'JetBrainsMono-Medium',
  /** @deprecated regular를 쓴다. 구 코드 호환용. */
  sans: 'WantedSans-Regular',
} as const;

export type FontFamilyName = (typeof fontFamily)[keyof typeof fontFamily];

/** RN fontWeight 리터럴. 폰트 미로딩 시 시스템 폰트 굵기 대체에 쓴다. */
type FontWeight = '400' | '500' | '600' | '700' | '900';

type TypeScale = {
  size: number;
  line: number;
  /** 시스템 폰트 대체용 굵기. 커스텀 폰트가 로드되면 family가 굵기를 결정한다. */
  weight: FontWeight;
  family: FontFamilyName;
  /** 자간(em). RN letterSpacing(pt)으로 쓰려면 letterSpacingFor()로 변환. */
  tracking: number;
};

export const typography = {
  /** 주간 숫자, 리포트 순위. */
  mega: { size: 56, line: 56, weight: '900', family: fontFamily.black, tracking: -0.04 },
  /** 화면 헤드라인. */
  display: { size: 34, line: 38, weight: '900', family: fontFamily.black, tracking: -0.03 },
  title: { size: 22, line: 28, weight: '700', family: fontFamily.bold, tracking: -0.02 },
  headline: { size: 17, line: 24, weight: '600', family: fontFamily.semibold, tracking: -0.01 },
  body: { size: 15, line: 22, weight: '400', family: fontFamily.regular, tracking: 0 },
  bodyStrong: { size: 15, line: 22, weight: '600', family: fontFamily.semibold, tracking: 0 },
  caption: { size: 13, line: 18, weight: '400', family: fontFamily.regular, tracking: 0 },
  /** 머리표(eyebrow)·시각·개수. 대문자/숫자. */
  mono: { size: 12, line: 16, weight: '500', family: fontFamily.mono, tracking: 0.02 },
  /** 운송장·시각. */
  monoLg: { size: 15, line: 20, weight: '500', family: fontFamily.mono, tracking: 0 },

  // ── 구 스케일 호환(화면 이전 전까지만). 새 코드에서 쓰지 않는다. ──
  /** @deprecated caption을 쓴다. */
  bodySm: { size: 13, line: 18, weight: '400', family: fontFamily.regular, tracking: 0 },
  /** @deprecated bodyStrong을 쓴다. */
  bodyMd: { size: 15, line: 22, weight: '600', family: fontFamily.semibold, tracking: 0 },
  /** @deprecated title을 쓴다. */
  heading: { size: 22, line: 28, weight: '700', family: fontFamily.bold, tracking: -0.02 },
  /** @deprecated display를 쓴다. */
  hero: { size: 34, line: 38, weight: '900', family: fontFamily.black, tracking: -0.03 },
} as const satisfies Record<string, TypeScale>;

export type TypographyToken = keyof typeof typography;

/** 공용 Text가 받는 variant(명세 §3 표). 구 호환 키는 제외. */
export type TextVariant =
  | 'mega'
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'mono'
  | 'monoLg';

/** 자간을 RN letterSpacing(pt)으로 변환한다: pt = size × tracking(em). */
export function letterSpacingFor(token: TypographyToken): number {
  const scale = typography[token];
  return scale.size * scale.tracking;
}
