import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/design/components/Card/Card';
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
}: WeeklyStatsCardProps): ReactNode {
  const { colors } = useTheme();

  const count = stats?.count ?? 0;
  const goal = stats?.goal ?? 0;
  // 로드 전(stats=null)에는 숫자를 대시로 — 0과 "아직 모름"을 구분한다.
  const showPlaceholder = stats === null;

  const countLabel = showPlaceholder
    ? LOADING_DASH
    : t('home.weeklyStats.count', { count });
  const progressLabel = t('home.weeklyStats.progress', { count, goal });
  const a11yLabel = t('home.weeklyStats.a11y', { count, goal });

  return (
    <Card variant="elevated">
      <View
        accessible
        accessibilityLabel={isLoading || showPlaceholder ? undefined : a11yLabel}
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
      </View>
    </Card>
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
});
