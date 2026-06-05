import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { haptic } from '@/design/theme/platform';
import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  onPress: () => void;
  accessibilityLabel?: string;
  children: ReactNode;
};

/** size별 높이 — 디자인시스템.md §3.1: sm 36 / md 44(iOS 최소 탭) / lg 52. */
const SIZE_HEIGHT: Record<ButtonSize, number> = {
  sm: 36,
  md: 44,
  lg: 52,
};

const SIZE_FONT: Record<ButtonSize, number> = {
  sm: typography.bodySm.size,
  md: typography.bodyMd.size,
  lg: typography.title.size,
};

const SIZE_PADDING: Record<ButtonSize, number> = {
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

type VariantColors = {
  bg: string;
  fg: string;
  border: string;
};

/** variant별 의미 색 매핑 — 모든 색은 테마 토큰에서 가져온다(하드코딩 금지). */
function variantColors(variant: ButtonVariant, colors: Theme['colors']): VariantColors {
  switch (variant) {
    case 'primary':
      return { bg: colors.primary, fg: colors.onPrimary, border: colors.primary };
    case 'secondary':
      return { bg: colors.primaryMuted, fg: colors.primary, border: colors.primaryMuted };
    case 'ghost':
      return { bg: 'transparent', fg: colors.primary, border: 'transparent' };
    case 'destructive':
      return { bg: colors.danger, fg: colors.onPrimary, border: colors.danger };
    case 'accent':
      return { bg: colors.accent, fg: colors.textOnAccent, border: colors.accent };
  }
}

/**
 * Button — 디자인시스템.md §3.1
 * iOS: Pressable opacity 0.7 + haptic('light') / Android: android_ripple.
 * a11y: role/label/state 필수.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  onPress,
  accessibilityLabel,
  children,
}: ButtonProps): ReactNode {
  const { colors } = useTheme();
  const isInactive = disabled || loading;
  const [pressed, setPressed] = useState(false);
  const vc = useMemo(() => variantColors(variant, colors), [variant, colors]);

  const containerStyle = useMemo<StyleProp<ViewStyle>>(
    () => ({
      height: SIZE_HEIGHT[size],
      paddingHorizontal: SIZE_PADDING[size],
      borderRadius: radius.md,
      backgroundColor: vc.bg,
      borderColor: vc.border,
      borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
      opacity: isInactive ? 0.5 : 1,
    }),
    [size, vc, variant, isInactive],
  );

  const handlePress = async (): Promise<void> => {
    if (isInactive) return;
    // iOS 탭 피드백. Android는 android_ripple로 시각 피드백 제공.
    if (Platform.OS === 'ios') {
      await haptic('light');
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      android_ripple={{ color: colors.primaryMuted }}
      // NativeWind로 래핑된 Pressable은 함수형 style에서 배경색이 누락된다.
      // Card와 동일하게 정적 배열 style을 사용하고 pressed는 상태로 처리한다.
      style={[
        styles.base,
        containerStyle,
        Platform.OS === 'ios' && pressed && !isInactive ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vc.fg} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          <Text style={[styles.label, { color: vc.fg, fontSize: SIZE_FONT[size] }]}>
            {children}
          </Text>
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: typography.bodyMd.weight,
    textAlign: 'center',
  },
});
