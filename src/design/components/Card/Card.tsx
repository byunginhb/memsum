import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { PressableStateCallbackType, ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { elevation, radius, spacing } from '@/design/tokens';

import type { CardPadding, CardProps, CardVariant } from './Card.types';

export type { CardPadding, CardProps, CardVariant } from './Card.types';

/** highlight variant 좌측 코랄 보더 두께 — design.md §15: 4px(재발견 표시). */
const HIGHLIGHT_BORDER_WIDTH = 4;

/** onPress 시 iOS pressed 상태 불투명도 — design.md §15. */
const PRESSED_OPACITY = 0.7;

/** padding 단계 → spacing 토큰 매핑 — design.md §15. */
const PADDING_SPACING: Record<CardPadding, number> = {
  compact: spacing.md,
  normal: spacing.lg,
  spacious: spacing['2xl'],
};

/**
 * 적용할 padding 단계를 해석한다.
 * 우선순위: padding prop > (deprecated) compact===true → 'compact' > 'normal'.
 */
function resolvePadding(padding: CardPadding | undefined, compact: boolean): CardPadding {
  if (padding) return padding;
  return compact ? 'compact' : 'normal';
}

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
 * Card — design.md §15
 * radius xl(20) 고정. highlight는 코랄 좌측 보더 4px.
 * onPress가 주어지면 Pressable로 감싸 탭 가능해지고, 없으면 비대화형 View로 렌더해
 * 불필요한 Pressable 래핑을 피한다.
 */
export function Card({
  variant = 'flat',
  padding,
  compact = false,
  onPress,
  accessibilityRole = 'button',
  style,
  children,
}: CardProps): ReactNode {
  const { colors } = useTheme();

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      padding: PADDING_SPACING[resolvePadding(padding, compact)],
      borderRadius: radius.xl,
      ...variantStyle(variant, colors),
    }),
    [variant, padding, compact, colors],
  );

  // iOS: pressed 시 불투명도 감소. Android: 네이티브 ripple로 피드백.
  const pressableStyle = useCallback(
    ({ pressed }: PressableStateCallbackType): ViewStyle => ({
      ...containerStyle,
      opacity: Platform.OS === 'ios' && pressed ? PRESSED_OPACITY : 1,
    }),
    [containerStyle],
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole}
        android_ripple={{ color: colors.border }}
        style={(state) => [pressableStyle(state), style]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[containerStyle, style]}>{children}</View>;
}
