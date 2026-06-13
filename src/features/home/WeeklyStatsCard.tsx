import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { ProgressBar } from '@/design/components/ProgressBar/ProgressBar';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';

import type { WeeklyStats } from './types';

/** 로딩 플레이스홀더 placeholder 텍스트(숫자 자리)— 색상만으로 정보 전달 금지. */
const LOADING_DASH = '—';

type WeeklyStatsCardProps = {
  /** 이번 주 통계. 아직 로드 전이면 null. */
  stats: WeeklyStats | null;
  /** 첫 로드 중 여부(스켈레톤/플레이스홀더 표시). */
  isLoading: boolean;
  /** 탭 시 동작(주간 리포트 진입). 없으면 비탭 정적 카드로 동작. */
  onPress?: () => void;
};

/**
 * WeeklyStatsCard — 홈 "이번 주 캡처" 통계 카드(design.md §26).
 *
 * elevated 카드 안에 제목 + 큰 숫자(display) + 진행바 + "{count}/{goal}" 텍스트.
 * 색상만으로 정보를 전달하지 않도록 진행바 옆에 숫자 텍스트를 함께 둔다(§35).
 * 로딩 중에는 숫자를 대시로 두고 진행바를 빈 상태(0)로 보여준다.
 * a11y: 카드 전체에 "이번 주 N장, 목표 M장" 합성 라벨을 붙인다.
 */
export function WeeklyStatsCard({
  stats,
  isLoading,
  onPress,
}: WeeklyStatsCardProps): ReactNode {
  const { colors, isDark } = useTheme();
  // "리포트 보기" 링크 색: 라이트에서 primary(#7C6FE8) on 흰 카드는 3.97:1로 AA에 못 미쳐,
  // 라이트는 더 진한 primaryHover(lavender700)로 대비를 올린다(다크는 primary 유지).
  const linkColorName = isDark ? 'primary' : 'primaryHover';

  const count = stats?.count ?? 0;
  const goal = stats?.goal ?? 0;
  // 로드 전(stats=null)에는 숫자를 대시로 — 0과 "아직 모름"을 구분한다.
  const showPlaceholder = stats === null;
  // 탭 가능 여부: onPress가 있으면 주간 리포트로 가는 버튼처럼 동작한다.
  const interactive = typeof onPress === 'function';
  const showStatsA11y = !(isLoading || showPlaceholder);

  const countLabel = showPlaceholder
    ? LOADING_DASH
    : t('home.weeklyStats.count', { count });
  const progressLabel = t('home.weeklyStats.progress', { count, goal });
  const a11yLabel = t('home.weeklyStats.a11y', { count, goal });

  const card = (
    <Card variant="elevated">
      {/* 카드 전체를 Pressable로 감쌀 때는 a11y를 바깥 Pressable이 들고 가므로
          내부 View는 비접근(accessible=false)으로 두어 라벨 중복 낭독을 막는다. */}
      <View
        accessible={!interactive}
        accessibilityLabel={!interactive && showStatsA11y ? a11yLabel : undefined}
      >
        <Text
          style={[styles.title, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {t('home.weeklyStats.title')}
        </Text>

        <Text
          style={[styles.count, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {countLabel}
        </Text>

        <View style={styles.progressRow}>
          <ProgressBar value={count} max={goal} label={progressLabel} />
        </View>

        <Text
          style={[styles.progressText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {progressLabel}
        </Text>

        {interactive ? (
          <View style={styles.reportLinkRow}>
            <Text
              style={[styles.reportLink, { color: colors[linkColorName] }]}
              numberOfLines={1}
            >
              {t('home.weeklyStats.viewReport')}
            </Text>
            <Icon name="chevron-right" size={16} color={linkColorName} />
          </View>
        ) : null}
      </View>
    </Card>
  );

  if (!interactive) return card;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={showStatsA11y ? a11yLabel : t('home.weeklyStats.title')}
      accessibilityHint={t('home.weeklyStats.viewReportHint')}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {card}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('bodyMd'),
  },
  count: {
    fontSize: typography.display.size,
    lineHeight: typography.display.line,
    fontWeight: typography.display.weight,
    letterSpacing: letterSpacingFor('display'),
    marginTop: spacing.xs,
  },
  progressRow: {
    marginTop: spacing.md,
  },
  progressText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  reportLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  reportLink: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('bodySm'),
  },
});
