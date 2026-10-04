import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';

import type { CardPadding, CardProps, CardVariant } from './Card.types';

export type { CardPadding, CardProps, CardVariant } from './Card.types';

/** highlight 왼쪽 형광펜 막대 두께. */
const HIGHLIGHT_BORDER_WIDTH = 4;

const PADDING_SPACING: Record<CardPadding, number> = {
  compact: spacing.md,
  normal: spacing.lg,
  spacious: spacing['2xl'],
};

function variantStyle(variant: CardVariant, colors: Theme['colors']): ViewStyle {
  switch (variant) {
    case 'flat':
      return { backgroundColor: colors.bgSurface };
    case 'elevated':
      return { backgroundColor: colors.bgElevated };
    case 'outline':
    case 'outlined':
      return {
        backgroundColor: 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
      };
    case 'highlight':
      return {
        backgroundColor: colors.bgSurface,
        borderLeftWidth: HIGHLIGHT_BORDER_WIDTH,
        borderLeftColor: colors.marker,
      };
  }
}

/**
 * Card — 시트 안 묶음처럼 "떠 있는 면"이 필요할 때만 쓴다. 목록은 카드로 감싸지 말고
 * ListItem 구분선으로 나눈다(명세 §2). 반경 lg(16), 그림자 없음.
 */
export function Card({
  variant = 'flat',
  padding,
  compact = false,
  onPress,
  accessibilityRole = 'button',
  accessibilityLabel,
  style,
  children,
}: CardProps): ReactNode {
  const { colors } = useTheme();

  const containerStyle: ViewStyle = {
    padding: PADDING_SPACING[padding ?? (compact ? 'compact' : 'normal')],
    borderRadius: radius.lg,
    ...variantStyle(variant, colors),
  };

  if (onPress) {
    return (
      <PressableScale
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        style={[containerStyle, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
