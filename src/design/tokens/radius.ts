/**
 * 반경 토큰 — 디자인시스템.md §2.4
 * 로고 둥근 사각형(rx=20)과 동일한 xl(20) 사용.
 */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
