import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import type { SemanticColorName } from '@/design/tokens';

export type BadgeVariant = 'solid' | 'subtle' | 'dot';
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';

export type BadgeProps = {
  variant?: BadgeVariant;
  tone?: BadgeTone;
  /** dot variant에서는 children 없이도 사용 가능. */
  children?: ReactNode;
  /** 텍스트 왼쪽 아이콘 슬롯. */
  leftIcon?: ReactNode;
};

type ToneColors = {
  bg: SemanticColorName | 'transparent';
  fg: SemanticColorName;
  dot: SemanticColorName;
  /** subtle은 바탕을 칠하지 않고 rule 테두리만 두른다(알파 결합 대신). */
  outlined: boolean;
};

/**
 * tone × variant → 의미 색.
 * - solid: 진한 바탕 + 대비 글씨. accent(형광펜)는 바탕 전용이라 글씨는 항상 onMarker.
 * - subtle: 투명 바탕 + rule 테두리 + 톤 글씨. accent subtle은 글씨색으로 형광펜을 못 쓰므로 형광펜 바탕.
 */
function toneColors(tone: BadgeTone, variant: BadgeVariant): ToneColors {
  const subtle = variant === 'subtle';
  switch (tone) {
    case 'primary':
      return subtle
        ? { bg: 'primaryMuted', fg: 'primary', dot: 'primary', outlined: false }
        : { bg: 'primary', fg: 'onPrimary', dot: 'primary', outlined: false };
    case 'success':
    case 'warning':
    case 'danger':
      return subtle
        ? { bg: 'transparent', fg: tone, dot: tone, outlined: true }
        : { bg: tone, fg: 'onPrimary', dot: tone, outlined: false };
    case 'accent':
      return { bg: 'marker', fg: 'onMarker', dot: 'marker', outlined: false };
    case 'neutral':
    default:
      return subtle
        ? { bg: 'bgMuted', fg: 'textSecondary', dot: 'textSecondary', outlined: false }
        : { bg: 'textPrimary', fg: 'bgBase', dot: 'textSecondary', outlined: false };
  }
}

const DOT_SIZE = 8;

/**
 * Badge — 작은 상태 표시. 글자는 caption, 반경 sm(6)으로 각지게(알약 남발 회피).
 * dot variant는 원형 상태 점(children 불필요, 스크린리더 제외).
 */
export function Badge({
  variant = 'subtle',
  tone = 'neutral',
  children,
  leftIcon,
}: BadgeProps): ReactNode {
  const { colors } = useTheme();
  const tc = toneColors(tone, variant);

  if (variant === 'dot') {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={[styles.dot, { backgroundColor: colors[tc.dot] }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: tc.bg === 'transparent' ? 'transparent' : colors[tc.bg],
          borderWidth: tc.outlined ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.borderStrong,
        },
      ]}
    >
      {leftIcon ? <View style={styles.iconSlot}>{leftIcon}</View> : null}
      {children != null ? (
        typeof children === 'string' || typeof children === 'number' ? (
          <Text variant="caption" color={tc.fg} numberOfLines={1}>
            {children}
          </Text>
        ) : (
          children
        )
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
    paddingVertical: 2,
    borderRadius: radius.sm,
    gap: spacing.xs,
  },
  iconSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: radius.pill,
  },
});
