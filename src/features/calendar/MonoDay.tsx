import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import type { SemanticColorName } from '@/design/tokens';

export type MonoDayProps = {
  /** "12". */
  day: string;
  color?: SemanticColorName;
  /** 오늘이면 형광펜 바탕 + 잉크 글씨(형광펜은 배경 전용 규칙). */
  marked?: boolean;
};

/**
 * 큰 mono 날짜 숫자 — 캘린더 타임라인 왼쪽 열·연결 안내 프레임.
 *
 * 명세 타입 스케일에 큰 mono가 없어 monoLg(JetBrains Mono)에 title 크기·행간만 빌린다.
 * 숫자 전용이라 한글 대체 문제는 없다.
 */
export function MonoDay({ day, color = 'textPrimary', marked = false }: MonoDayProps): ReactNode {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, marked ? { backgroundColor: colors.marker } : null]}>
      <Text variant="monoLg" color={marked ? 'onMarker' : color} style={styles.day}>
        {day}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  day: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
  },
});
