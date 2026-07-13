import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';

export type BrandDotVariant = 'single' | 'mini';
export type BrandDotTone = 'primary' | 'accent';

type BrandDotProps = {
  /** 'single' 단일 원점(기본) / 'mini' 3×3 미니 9점(우하단 코랄). */
  variant?: BrandDotVariant;
  /** single 변형의 색. 기본 primary(라벤더), accent(코랄) 옵션. mini는 항상 라벤더+우하단 코랄. */
  tone?: BrandDotTone;
  /** single: 점 지름 / mini: 글리프 전체 폭(정방형). 미지정 시 토큰 기반 기본값. */
  size?: number;
};

/** 단일 브랜드 점 기본 지름 — 캡션 옆 마커용(spacing.sm=8 기준, 4px 그리드). */
const DEFAULT_SINGLE_SIZE = spacing.sm;
/** 미니 9점 글리프 기본 폭 — 캡션 옆 마커용(spacing.lg=16 기준). */
const DEFAULT_MINI_SIZE = spacing.lg;
/** 미니 그리드 열/행 수 (3×3). */
const GRID = 3;
/** 미니 글리프에서 각 점이 차지하는 폭 비율. */
const MINI_DOT_RATIO = 0.24;

/**
 * BrandDot — 9점 로고 모티프를 UI 마커로 단일화(design.md §26 · 이슈 #9 D2).
 *
 * 정사각형 라벤더 마커를 대체하는 원형 브랜드 점. 섹션 라벨·필드 라벨 등
 * 캡션 앞에 붙어 브랜드 마크(원형 점 + 코랄 액센트)를 UI 전역에서 일관 재생산한다.
 * 색은 모두 useTheme 토큰만 사용(hex 직접 금지).
 */
export function BrandDot({
  variant = 'single',
  tone = 'primary',
  size,
}: BrandDotProps): ReactNode {
  const { colors } = useTheme();

  if (variant === 'mini') {
    const glyph = size ?? DEFAULT_MINI_SIZE;
    const dot = Math.round(glyph * MINI_DOT_RATIO);
    // 3점 사이 2칸 간격을 남은 폭으로 균등 분배(flexWrap gap 공유).
    const gap = (glyph - GRID * dot) / (GRID - 1);
    const accentIndex = GRID * GRID - 1; // 우하단
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: glyph, flexDirection: 'row', flexWrap: 'wrap', gap }}
      >
        {Array.from({ length: GRID * GRID }, (_, i) => (
          <View
            key={i}
            style={{
              width: dot,
              height: dot,
              borderRadius: radius.full,
              backgroundColor: i === accentIndex ? colors.accent : colors.primary,
            }}
          />
        ))}
      </View>
    );
  }

  const diameter = size ?? DEFAULT_SINGLE_SIZE;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: diameter,
        height: diameter,
        borderRadius: radius.full,
        backgroundColor: tone === 'accent' ? colors.accent : colors.primary,
      }}
    />
  );
}
