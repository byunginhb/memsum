import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';

export type BadgeVariant = 'solid' | 'subtle' | 'dot';
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

type BadgeProps = {
  variant?: BadgeVariant;
  tone?: BadgeTone;
  /** dot variant에서는 children 없이도 사용 가능. */
  children?: ReactNode;
  /** 텍스트 왼쪽 아이콘 슬롯. */
  leftIcon?: ReactNode;
};

type ToneColors = {
  bg: string;
  fg: string;
  dot: string;
};

/**
 * tone별 색 계산 — 의미 토큰 기반.
 * solid: 진한 배경 + 밝은 텍스트, subtle: 연한 배경 + 진한 텍스트.
 */
function toneColors(tone: BadgeTone, variant: BadgeVariant, colors: Theme['colors']): ToneColors {
  switch (tone) {
    case 'primary':
      return {
        bg: variant === 'subtle' ? colors.primaryMuted : colors.primary,
        fg: variant === 'subtle' ? colors.primary : colors.onPrimary,
        dot: colors.primary,
      };
    case 'success':
      return {
        // TODO: 알파 토큰화 — `${color}22` 결합 대신 semantic alpha 토큰 도입
        bg: variant === 'subtle' ? `${colors.success}22` : colors.success,
        fg: variant === 'subtle' ? colors.success : colors.onPrimary,
        dot: colors.success,
      };
    case 'warning':
      return {
        // TODO: 알파 토큰화 — `${color}22` 결합 대신 semantic alpha 토큰 도입
        bg: variant === 'subtle' ? `${colors.warning}22` : colors.warning,
        fg: variant === 'subtle' ? colors.warning : colors.onPrimary,
        dot: colors.warning,
      };
    case 'danger':
      return {
        // TODO: 알파 토큰화 — `${color}22` 결합 대신 semantic alpha 토큰 도입
        bg: variant === 'subtle' ? `${colors.danger}22` : colors.danger,
        fg: variant === 'subtle' ? colors.danger : colors.onPrimary,
        dot: colors.danger,
      };
    case 'accent':
      return {
        // TODO: 알파 토큰화 — `${color}22` 결합 대신 semantic alpha 토큰 도입
        bg: variant === 'subtle' ? `${colors.accent}22` : colors.accent,
        fg: variant === 'subtle' ? colors.accent : colors.textOnAccent,
        dot: colors.accent,
      };
    case 'neutral':
    default:
      return {
        bg: variant === 'subtle' ? colors.bgMuted : colors.textSecondary,
        fg: variant === 'subtle' ? colors.textSecondary : colors.bgSurface,
        dot: colors.textSecondary,
      };
  }
}

/** dot variant 직경 — 상태 표시용 소형 원. */
const DOT_SIZE = 8;

/**
 * Badge — 디자인시스템.md §3.5
 * variants: solid | subtle | dot
 * tones: neutral | primary | success | warning | danger | accent
 * dot variant는 원형 소형 상태 표시자 (children 불필요).
 */
export function Badge({
  variant = 'subtle',
  tone = 'neutral',
  children,
  leftIcon,
}: BadgeProps): ReactNode {
  const { colors } = useTheme();
  const tc = toneColors(tone, variant, colors);

  if (variant === 'dot') {
    return (
      <View
        // 순수 시각 요소 — 스크린리더에서 제외 (상태 의미는 인접 텍스트가 전달)
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.dot, { backgroundColor: tc.dot }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: tc.bg },
      ]}
    >
      {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
      {children ? (
        <Text style={[styles.label, { color: tc.fg }]} numberOfLines={1}>
          {children}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption.size,
    fontWeight: typography.caption.weight,
    lineHeight: typography.caption.line,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.full,
  },
});
