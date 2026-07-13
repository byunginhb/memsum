import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import type { PressableStateCallbackType, ViewStyle } from 'react-native';

import { haptic } from '@/design/theme/platform';
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
 *
 * elevation 위계 가이드(이슈 #9 D1 · 웹 DESIGN.md "color-block first, shadow rare"):
 * - 화면당 `elevated` 카드는 1~2개로 제한한다(그림자 남발 = 위계 소실 = 제네릭).
 * - 기본 정보 카드는 `flat`(표면색 대비) 또는 `outlined`(hairline 보더)로 둔다.
 * - `elevated`는 그 화면에서 가장 중요한 카드(주간 통계·Hero)에만 쓴다.
 * - `highlight`는 "재발견/하이라이트" 시그니처(코랄 좌측 보더)에만 쓴다.
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

  // 탭 가능한 카드 진입에 햅틱(iOS/Android 양쪽) — 손에 닿는 질감 일관화(이슈 #9 D6).
  const handlePress = (): void => {
    void haptic('light');
    onPress?.();
  };

  if (onPress) {
    return (
      <Pressable
        onPress={handlePress}
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
