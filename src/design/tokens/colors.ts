/**
 * 색상 토큰 (의미 기반) — 디자인시스템.md §2.1
 *
 * palette: 원시 색 팔레트. UI 코드에서 직접 참조 금지(의미 토큰만 사용).
 * lightColors / darkColors: 의미 토큰. useTheme()를 통해서만 접근한다.
 */
export const palette = {
  lavender50: '#F4F1FD',
  lavender100: '#E5E1F9',
  lavender300: '#B5ABEE',
  lavender500: '#7C6FE8', // Brand Primary
  lavender700: '#5A4FCC',
  lavender900: '#2E2670',

  ivory50: '#FFFCF7',
  ivory100: '#FFF8F0', // Brand Base
  ivory200: '#F5EFE4',

  coral400: '#FFB84D', // Accent
  coral600: '#E89A2E',

  gray50: '#FAFAFB',
  gray100: '#F2F2F5',
  gray300: '#D4D4DC',
  gray500: '#6D6D80',
  gray700: '#3F3F50',
  gray900: '#2D2D3D',

  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
} as const;

/**
 * 의미 색 토큰의 형태(키 집합). light/dark가 동일 키를 공유하도록 강제한다.
 * 값은 string(hex)으로 넓혀, light/dark가 서로 다른 hex를 가질 수 있게 한다.
 */
export type SemanticColors = {
  primary: string;
  primaryMuted: string;
  primaryHover: string;
  onPrimary: string;

  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  bgMuted: string;

  textPrimary: string;
  textSecondary: string;
  textOnAccent: string;
  textDisabled: string;

  border: string;
  borderStrong: string;

  /** 모달/Sheet 뒤 딤 오버레이(스크림). design.md §20. */
  scrim: string;

  accent: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
};

export const lightColors: SemanticColors = {
  primary: palette.lavender500,
  primaryMuted: palette.lavender100,
  primaryHover: palette.lavender700,
  onPrimary: '#FFFFFF',

  bgBase: palette.ivory100,
  bgSurface: '#FFFFFF',
  bgElevated: '#FFFFFF',
  bgMuted: palette.ivory200,

  textPrimary: palette.gray900,
  // 보조 텍스트. gray500(#6D6D80)은 bgMuted 위에서 약 4.4:1로 WCAG AA(4.5)에
  // 살짝 못 미쳐, 위계를 해치지 않는 선에서 한 단계 어둡게 조정(모든 라이트 배경 4.9:1+).
  textSecondary: '#66667A',
  textOnAccent: '#FFFFFF',
  textDisabled: palette.gray300,

  border: palette.gray100,
  borderStrong: palette.gray300,

  scrim: 'rgba(0, 0, 0, 0.4)',

  accent: palette.coral400,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
  info: palette.info,
};

export const darkColors: SemanticColors = {
  primary: palette.lavender300,
  primaryMuted: '#2A2557',
  primaryHover: palette.lavender500,
  onPrimary: palette.gray900,

  bgBase: '#16161E',
  bgSurface: '#1E1E2A',
  bgElevated: '#262635',
  bgMuted: '#2A2A3A',

  textPrimary: '#F5F5F8',
  textSecondary: '#A0A0B5',
  textOnAccent: palette.gray900,
  textDisabled: '#4A4A5A',

  border: '#2E2E3E',
  borderStrong: '#3F3F50',

  scrim: 'rgba(0, 0, 0, 0.6)',

  accent: palette.coral400,
  success: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
  info: '#60A5FA',
};

/** 의미 색 토큰 키 (useTheme 반환 객체의 키). */
export type SemanticColorName = keyof SemanticColors;
