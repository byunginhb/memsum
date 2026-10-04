/**
 * 반경 토큰 — docs/design/redesign-2026-10.md §2
 * sm 6 / md 10(썸네일) / lg 16 / sheet 24 / pill 999.
 * xl·2xl·full은 구 화면 호환용 별칭이다.
 */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  sheet: 24,
  pill: 999,
  /** @deprecated lg를 쓴다. */
  xl: 16,
  /** @deprecated sheet를 쓴다. */
  '2xl': 24,
  /** @deprecated pill을 쓴다. */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
