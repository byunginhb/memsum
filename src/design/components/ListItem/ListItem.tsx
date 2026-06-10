import { useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';

type ListItemProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  showDivider?: boolean;
  /**
   * 스크린리더 라벨. 미지정 시 title을 쓴다. trailing의 시각 정보(개수 등)를
   * 음성에도 합쳐 전달할 때 사용(예: "마케팅 자료 2장"). design.md §35.
   */
  accessibilityLabel?: string;
};

/** 1줄(subtitle 없음) 행 높이 — design.md §17 (≥44 탭타깃 충족). */
const SINGLE_LINE_HEIGHT = 56;

/** 2줄(subtitle 있음) 행 높이 — design.md §17. */
const TWO_LINE_HEIGHT = 72;

/** iOS 탭 시 opacity. SearchBar/Button과 동일. */
const PRESSED_OPACITY = 0.7;

/**
 * 디바이더 좌측 들여쓰기 — design.md §17.
 * iOS: 본문 정렬에 맞춰 좌측 spacing.lg(16) 들여쓰기 / Android: 풀너비(0).
 * Platform.select 인라인 대신 상수로 추출(매직값 방지).
 */
const BORDER_LEFT_INSET = Platform.select({ ios: spacing.lg, default: 0 }) ?? 0;

/**
 * ListItem — design.md §17
 * leading/title/subtitle/trailing 행. onPress 있으면 Pressable(iOS opacity / Android ripple),
 * 없으면 View(예: trailing이 Switch라 단독 토글하는 경우 — 호출측 책임).
 * a11y: onPress 시 role=button, label=title.
 */
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  showDivider = false,
  accessibilityLabel,
}: ListItemProps): ReactNode {
  const { colors } = useTheme();
  const [pressed, setPressed] = useState(false);

  const hasSubtitle = typeof subtitle === 'string' && subtitle.length > 0;
  const rowHeight = hasSubtitle ? TWO_LINE_HEIGHT : SINGLE_LINE_HEIGHT;

  const content = (
    <View style={styles.row}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.body}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {hasSubtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </View>
  );

  const divider = showDivider ? (
    <View
      style={[
        styles.divider,
        {
          backgroundColor: colors.border,
          marginLeft: BORDER_LEFT_INSET,
        },
      ]}
    />
  ) : null;

  // onPress 없으면 정적 View(Switch류 trailing이 단독 토글하는 케이스).
  if (!onPress) {
    return (
      <View>
        <View style={[styles.container, { minHeight: rowHeight }]}>{content}</View>
        {divider}
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        android_ripple={{ color: colors.primaryMuted }}
        style={[
          styles.container,
          { minHeight: rowHeight },
          Platform.OS === 'ios' && pressed ? styles.pressed : null,
        ]}
      >
        {content}
      </Pressable>
      {divider}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('bodyMd'),
  },
  subtitle: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    letterSpacing: letterSpacingFor('bodySm'),
    marginTop: spacing.xs,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
