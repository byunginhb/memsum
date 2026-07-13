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
  ivory100: '#FFF8F0',
  ivory200: '#F5EFE4',

  // 컨셉 "Calm Glass" 베이스 — 라벤더·아이보리 온기를 되살린 barely-lavender.
  // 이슈 #9 D5: 쿨 무채색(#F6F4FC) → 따뜻한 라벤더-아이보리 틴트로 재조정.
  quartz: '#F7F4F8', // Brand Base — 웜 라벤더빛 흰색 (was #F6F4FC 쿨)
  quartzMuted: '#EFEAF0', // 라벤더 틴트 muted 표면 (was #EDEAF7 쿨)
  night: '#1C1826', // 따뜻한 보라-검정 (최상위 텍스트)
  slate: '#5E5777', // 바이올렛 그레이 (보조 텍스트)
  mist: '#A89EBB', // 연라벤더 그레이 (비활성·캡션)
  lavLine: '#E4DFF4', // 라벤더 틴트 구분선

  coral400: '#F2A65A', // Accent — 웹과 통일된 코랄
  coral600: '#E08C3E',

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

  // 컨셉 "Calm Glass" — 웜 라벤더-아이보리 베이스(Quartz) + 아이보리 틴트 표면.
  // 이슈 #9 D5: 순백 표면을 미세 아이보리로 데워 무채색 표류를 되돌린다(대비 유지).
  bgBase: palette.quartz,
  bgSurface: '#FFFDFB', // 아주 옅은 아이보리 표면 (was 순백 #FFFFFF)
  bgElevated: '#FFFFFF', // 중요 카드는 순백으로 베이스 대비를 살려 위계 강조
  bgMuted: palette.quartzMuted,

  textPrimary: palette.night,
  // 보조 텍스트 — Slate(#5E5777)는 모든 라이트 배경에서 WCAG AA(4.5:1) 이상.
  textSecondary: palette.slate,
  textOnAccent: '#FFFFFF',
  textDisabled: palette.mist,

  border: palette.lavLine,
  borderStrong: '#D6D0E8',

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

  // 이슈 #9 D5: 다크 베이스에도 라벤더 온기를 미세 주입(violet 쪽으로 R·B 소폭 상향).
  bgBase: '#17151F', // was #16161E — 보라빛 온기 강화
  bgSurface: '#201E2C', // was #1E1E2A
  bgElevated: '#282637', // was #262635
  bgMuted: '#2B2839', // was #2A2A3A

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
