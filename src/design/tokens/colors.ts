/**
 * 색상 토큰 (의미 기반) — docs/design/redesign-2026-10.md §2 "형광펜 & 코발트"
 *
 * palette: 원시 색 팔레트. UI 코드에서 직접 참조 금지(의미 토큰만 사용).
 * lightColors / darkColors: 의미 토큰. useTheme()를 통해서만 접근한다.
 */
export const palette = {
  ink: '#0D0E12',
  ink2: '#565A63',
  paper: '#F2F3F0',
  paperRaised: '#FAFAF8',
  white: '#FFFFFF',
  stone: '#E6E8E3',

  inkSurface: '#16171C',
  inkElevated: '#1E1F25',
  inkMuted: '#22232A',
  paper2: '#9EA2AC',

  cobalt: '#1530FF',
  cobaltDeep: '#0E22CC',
  cobaltLight: '#7083FF',
  cobaltLighter: '#8E9DFF',
  cobaltMist: '#DCE0FF',
  cobaltNight: '#1C2250',

  // 형광펜. 배경 전용 — 그 위 글자는 항상 ink.
  marker: '#E8FF3A',

  green: '#0B6E3B',
  greenLight: '#3DDC84',
  red: '#B42318',
  redLight: '#FF6B5E',
  amber: '#9A5000',
  amberLight: '#FFB547',
} as const;

/**
 * 의미 색 토큰의 형태(키 집합). light/dark가 동일 키를 공유하도록 강제한다.
 * 기존 키는 화면 호환을 위해 유지하고, 리디자인에서 필요한 키를 뒤에 추가했다.
 */
export type SemanticColors = {
  /** 코발트. 주요 버튼·링크·스캔선. */
  primary: string;
  /** 선택 상태 배경. */
  primaryMuted: string;
  /** 눌림/강조 시 한 단계 진한 코발트. */
  primaryHover: string;
  onPrimary: string;

  /** paper — 화면 바탕. */
  bgBase: string;
  /** 시트·떠 있는 면 전용. 목록은 카드로 감싸지 않는다. */
  bgSurface: string;
  /** 모달·토스트. */
  bgElevated: string;
  /** 입력칸·스켈레톤. */
  bgMuted: string;

  /** ink — 본문. */
  textPrimary: string;
  /** ink2 — 보조. */
  textSecondary: string;
  /** 형광펜(accent) 위 글자. 항상 ink. */
  textOnAccent: string;
  textDisabled: string;

  /** rule — 1px 머리카락 구분선. */
  border: string;
  borderStrong: string;

  /** 모달/Sheet 뒤 딤 오버레이(스크림). */
  scrim: string;

  /** 형광펜. 배경으로만 쓴다(글자색 금지). */
  accent: string;
  success: string;
  danger: string;
  warning: string;
  info: string;

  // ── 리디자인 추가 키 ──────────────────────────────────────────────
  /** accent와 같은 형광펜. 의도를 드러내는 별칭(Marked·ScanReveal 박스). */
  marker: string;
  /** 형광펜 위 글자(= textOnAccent). */
  onMarker: string;
  /** 플로팅 탭바 알약 바탕(라이트=ink, 다크=한 단계 밝은 면). */
  barBg: string;
  /** 탭바 위 활성 아이콘. */
  barFg: string;
  /** 탭바 위 비활성 아이콘. */
  barFgMuted: string;
};

export const lightColors: SemanticColors = {
  primary: palette.cobalt,
  primaryMuted: palette.cobaltMist,
  primaryHover: palette.cobaltDeep,
  onPrimary: palette.white,

  bgBase: palette.paper,
  bgSurface: palette.paperRaised,
  bgElevated: palette.white,
  bgMuted: palette.stone,

  textPrimary: palette.ink,
  textSecondary: palette.ink2,
  textOnAccent: palette.ink,
  textDisabled: 'rgba(13, 14, 18, 0.34)',

  border: 'rgba(13, 14, 18, 0.10)',
  borderStrong: 'rgba(13, 14, 18, 0.22)',

  scrim: 'rgba(13, 14, 18, 0.40)',

  accent: palette.marker,
  success: palette.green,
  danger: palette.red,
  warning: palette.amber,
  info: palette.cobalt,

  marker: palette.marker,
  onMarker: palette.ink,
  barBg: palette.ink,
  barFg: palette.paper,
  barFgMuted: 'rgba(242, 243, 240, 0.56)',
};

export const darkColors: SemanticColors = {
  primary: palette.cobaltLight,
  primaryMuted: palette.cobaltNight,
  primaryHover: palette.cobaltLighter,
  onPrimary: palette.ink,

  bgBase: palette.ink,
  bgSurface: palette.inkSurface,
  bgElevated: palette.inkElevated,
  bgMuted: palette.inkMuted,

  textPrimary: palette.paper,
  textSecondary: palette.paper2,
  textOnAccent: palette.ink,
  textDisabled: 'rgba(242, 243, 240, 0.32)',

  border: 'rgba(242, 243, 240, 0.10)',
  borderStrong: 'rgba(242, 243, 240, 0.24)',

  scrim: 'rgba(0, 0, 0, 0.60)',

  accent: palette.marker,
  success: palette.greenLight,
  danger: palette.redLight,
  warning: palette.amberLight,
  info: palette.cobaltLight,

  marker: palette.marker,
  onMarker: palette.ink,
  // 다크 바탕이 ink라 같은 색이면 탭바가 사라진다 → 한 단계 밝은 면.
  barBg: palette.inkElevated,
  barFg: palette.paper,
  barFgMuted: 'rgba(242, 243, 240, 0.56)',
};

/** 의미 색 토큰 키 (useTheme 반환 객체의 키). */
export type SemanticColorName = keyof SemanticColors;
