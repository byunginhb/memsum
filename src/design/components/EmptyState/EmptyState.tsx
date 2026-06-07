import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, radius, spacing, typography } from '@/design/tokens';
import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
};

type EmptyStateProps = {
  /** lucide 아이콘 이름. illustration 미지정 시 원형 배경 아이콘으로 표시. */
  icon?: IconName;
  /**
   * 커스텀 일러스트레이션 ReactNode (예: <DotsGrid animated />).
   * 지정 시 icon보다 우선 표시.
   */
  illustration?: ReactNode;
  /** 주 제목. 짧고 직관적으로 — 디자인시스템.md §3.10. */
  title: string;
  /** 부가 설명. 선택. */
  body?: string;
  /** CTA 버튼 정보. 선택. */
  action?: EmptyStateAction;
};

/** 아이콘 원형 배경 크기 — Empty State 아이콘 컨테이너. */
const ICON_CONTAINER_SIZE = 72;

/**
 * EmptyState — 디자인시스템.md §3.10
 * 일러스트(로고 9점 그리드 모티프) · 제목 · 설명 · CTA 중앙 정렬.
 * illustration prop이 있으면 icon 대신 사용 (DotsGrid 등 주입 가능).
 * a11y: 전체 영역 accessibilityRole="none"(정보 영역), 내부 텍스트는 자동 읽힘.
 */
export function EmptyState({
  icon,
  illustration,
  title,
  body,
  action,
}: EmptyStateProps): ReactNode {
  const { colors } = useTheme();

  const hasVisual = illustration != null || icon != null;

  return (
    <View
      style={styles.container}
      accessibilityRole="none"
    >
      {/* 비주얼 — illustration 우선, 없으면 icon 원형 배경 */}
      {hasVisual ? (
        <View style={styles.visualSlot}>
          {illustration != null ? (
            illustration
          ) : icon != null ? (
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.bgMuted, borderRadius: radius.full },
              ]}
            >
              <Icon name={icon} size={32} color="textSecondary" />
            </View>
          ) : null}
        </View>
      ) : null}

      {/* 텍스트 영역 */}
      <View style={styles.textBlock}>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary },
          ]}
          accessibilityRole="header"
        >
          {title}
        </Text>

        {body ? (
          <Text
            style={[
              styles.body,
              { color: colors.textSecondary },
            ]}
          >
            {body}
          </Text>
        ) : null}
      </View>

      {/* CTA 버튼 */}
      {action ? (
        <View style={styles.actionSlot}>
          <Button
            variant="primary"
            size="md"
            onPress={action.onPress}
            accessibilityLabel={action.label}
          >
            {action.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing['4xl'],
    gap: spacing.xl,
  },
  visualSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.title.size,
    fontWeight: typography.title.weight,
    lineHeight: typography.title.line,
    letterSpacing: letterSpacingFor('title'),
    textAlign: 'center',
  },
  body: {
    fontSize: typography.body.size,
    fontWeight: typography.body.weight,
    lineHeight: typography.body.line,
    textAlign: 'center',
  },
  actionSlot: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
});
