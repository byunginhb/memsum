import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import type { SemanticColorName, TextVariant } from '@/design/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** 가로를 꽉 채운다(시트 하단 주 버튼 등). */
  fullWidth?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** 바깥 레이아웃(여백·flex). */
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/** 높이 — 모두 최소 터치 44 이상. */
const SIZE_HEIGHT: Record<ButtonSize, number> = {
  sm: 44,
  md: 48,
  lg: 56,
};

const SIZE_PADDING: Record<ButtonSize, number> = {
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

const SIZE_TEXT: Record<ButtonSize, TextVariant> = {
  sm: 'bodyStrong',
  md: 'bodyStrong',
  lg: 'headline',
};

/** 비활성 시 불투명도. */
const DISABLED_OPACITY = 0.4;

type VariantColors = {
  bg: SemanticColorName | 'transparent';
  fg: SemanticColorName;
};

/**
 * variant → 의미 색. 대비: primary 코발트/흰 글씨 8:1, accent 형광펜/잉크 글씨,
 * destructive 빨강/onPrimary(라이트 흰·다크 잉크) 모두 AA 이상.
 */
const VARIANT_COLORS: Record<ButtonVariant, VariantColors> = {
  primary: { bg: 'primary', fg: 'onPrimary' },
  secondary: { bg: 'primaryMuted', fg: 'primary' },
  ghost: { bg: 'transparent', fg: 'primary' },
  destructive: { bg: 'danger', fg: 'onPrimary' },
  accent: { bg: 'marker', fg: 'onMarker' },
};

/**
 * Button — 주 버튼은 코발트. 눌림은 PressableScale(scale 0.97 스프링).
 * 햅틱은 쓰지 않는다(명세: 스캔 완료·리포트 1위 공개만).
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  onPress,
  accessibilityLabel,
  style,
  children,
}: ButtonProps): ReactNode {
  const { colors } = useTheme();
  const isInactive = disabled || loading;
  const vc = VARIANT_COLORS[variant];
  const bg = vc.bg === 'transparent' ? 'transparent' : colors[vc.bg];

  return (
    <PressableScale
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      containerStyle={[fullWidth ? styles.fullWidth : null, style]}
      style={[
        styles.base,
        {
          height: SIZE_HEIGHT[size],
          paddingHorizontal: SIZE_PADDING[size],
          backgroundColor: bg,
          opacity: isInactive ? DISABLED_OPACITY : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors[vc.fg]} />
      ) : (
        <View style={styles.content}>
          {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
          {typeof children === 'string' || typeof children === 'number' ? (
            <Text variant={SIZE_TEXT[size]} color={vc.fg} numberOfLines={1}>
              {children}
            </Text>
          ) : (
            children
          )}
          {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    alignSelf: 'stretch',
  },
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: radius.md,
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
});
