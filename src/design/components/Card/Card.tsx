import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { elevation, radius, spacing } from '@/design/tokens';

export type CardVariant = 'flat' | 'elevated' | 'outlined' | 'highlight';

type CardProps = {
  variant?: CardVariant;
  /** true면 padding md(12), 기본은 lg(16) — 디자인시스템.md §3.2. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** highlight variant 좌측 코랄 보더 두께 — 디자인시스템.md §3.2: 4px(재발견 표시). */
const HIGHLIGHT_BORDER_WIDTH = 4;

function variantStyle(variant: CardVariant, colors: Theme['colors']): ViewStyle {
  switch (variant) {
    case 'flat':
      return { backgroundColor: colors.bgSurface };
    case 'elevated':
      return { backgroundColor: colors.bgElevated, ...elevation[3] };
    case 'outlined':
      return {
        backgroundColor: colors.bgSurface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      };
    case 'highlight':
      return {
        backgroundColor: colors.bgSurface,
        borderLeftWidth: HIGHLIGHT_BORDER_WIDTH,
        borderLeftColor: colors.accent,
      };
  }
}

/**
 * Card — 디자인시스템.md §3.2
 * radius xl(20) 고정. highlight는 코랄 좌측 보더 4px.
 */
export function Card({ variant = 'flat', compact = false, style, children }: CardProps): ReactNode {
  const { colors } = useTheme();
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      padding: compact ? spacing.md : spacing.lg,
      borderRadius: radius.xl,
      ...variantStyle(variant, colors),
    }),
    [variant, compact, colors],
  );

  return <View style={[containerStyle, style]}>{children}</View>;
}
