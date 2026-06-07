import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { Icon } from '@/design/icons/Icon';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import type { ReportFeedback, WeeklyReport } from '@/features/report/types';
import { ReportCard } from '@/features/report/ReportCard';
import { useWeeklyReport } from '@/hooks/use-weekly-report';
import { getLocale, t } from '@/i18n';

type WeeklyReportScreenProps = {
  /** "YYYY-MM-DD"(KST 월요일). 미지정 시 이번 주. */
  weekStart?: string;
  /**
   * 사용자 닉네임. 빈 문자열이면 "이름 없음" 카피를 사용한다.
   * settings store는 다른 작업에서 만드는 중이라, 충돌 회피로 prop 주입한다(추후 통합).
   */
  nickname?: string;
};

/**
 * WeeklyReportScreen — 주간 5줄 리포트(Hero Moment, design.md §27).
 *
 * 구성: Header → 주차 캡션 → 헤딩 → 서브타이틀 → ReportCard 5개 → 자료실 보기(ghost).
 * 상태: 로딩(중앙 스피너) / 에러(StatusBlock + 재시도) / 빈 캡처<5(EmptyState + DotsGrid).
 * Hero(1번) 카드 등장 햅틱은 ReportCard가 reveal 완료 콜백에서 발화한다(모션과 결합).
 */
export function WeeklyReportScreen({
  weekStart,
  nickname = '',
}: WeeklyReportScreenProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { report, isLoading, error, refresh, setFeedback } =
    useWeeklyReport(weekStart);

  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: insets.bottom + spacing['4xl'],
      gap: spacing.lg,
    }),
    [insets.bottom],
  );

  const handlePressOriginal = (captureId: string): void => {
    router.push({ pathname: '/captures/[id]', params: { id: captureId } });
  };

  const handleFeedback = (captureId: string, rating: ReportFeedback): void => {
    void setFeedback(captureId, rating);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header title={t('report.title')} topInset={insets.top} />
      <Body
        report={report}
        isLoading={isLoading}
        error={error}
        nickname={nickname}
        contentStyle={contentStyle}
        onRetry={refresh}
        onPressOriginal={handlePressOriginal}
        onFeedback={handleFeedback}
        onViewArchive={() => router.push('/')}
      />
    </View>
  );
}

type BodyProps = {
  report: WeeklyReport | null;
  isLoading: boolean;
  error: string | null;
  nickname: string;
  contentStyle: object;
  onRetry: () => void;
  onPressOriginal: (captureId: string) => void;
  onFeedback: (captureId: string, rating: ReportFeedback) => void;
  onViewArchive: () => void;
};

/** 상태 분기: 로딩 → 에러 → 빈(캡처<5) → 리포트. */
function Body({
  report,
  isLoading,
  error,
  nickname,
  contentStyle,
  onRetry,
  onPressOriginal,
  onFeedback,
  onViewArchive,
}: BodyProps): ReactNode {
  const { colors } = useTheme();

  // 최초 로딩(데이터 없음) — 중앙 스피너.
  if (isLoading && !report) {
    return (
      <View style={[styles.flex, styles.center]} accessibilityRole="progressbar">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 에러(데이터 없음) — StatusBlock + 재시도.
  if (error && !report) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Icon name="x" size={32} color="danger" />
        <Text style={[styles.statusText, { color: colors.danger }]}>
          {t('report.error.generic')}
        </Text>
        <Button
          variant="secondary"
          size="md"
          onPress={onRetry}
          accessibilityLabel={t('report.retry')}
          leftIcon={<Icon name="refresh-cw" size={20} color="primary" />}
        >
          {t('report.retry')}
        </Button>
      </View>
    );
  }

  // 빈 상태(캡처 < 5 → items 없음) — EmptyState + DotsGrid.
  if (!report || report.items.length === 0) {
    return (
      <View style={[styles.flex, styles.center]}>
        <EmptyState
          illustration={<DotsGrid size={96} animated />}
          title={t('report.empty.title')}
          body={t('report.empty.body')}
        />
      </View>
    );
  }

  const total = report.totalCaptures;
  const hasName = nickname.trim().length > 0;
  const subtitle = hasName
    ? t('report.weeklySubtitle', { name: nickname.trim(), total })
    : t('report.weeklySubtitleNoName', { total });

  return (
    <ScrollView style={styles.flex} contentContainerStyle={contentStyle}>
      {/* 주차 캡션 */}
      <Text style={[styles.weekCaption, { color: colors.textSecondary }]}>
        {t('report.weekRange', {
          start: formatWeekDate(report.weekStart),
          end: formatWeekDate(report.weekEnd),
        })}
      </Text>

      {/* 헤딩 + 서브타이틀 */}
      <View style={styles.headingBlock}>
        <Text
          style={[styles.heading, { color: colors.textPrimary }]}
          accessibilityRole="header"
        >
          {t('report.weekly')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>

      {/* ReportCard 5개 (stagger reveal은 카드 내부에서 index 기반으로 처리) */}
      {report.items.map((item, index) => (
        <ReportCard
          key={item.captureId}
          item={item}
          index={index}
          onPressOriginal={onPressOriginal}
          onFeedback={onFeedback}
        />
      ))}

      {/* 자료실 보기 */}
      <View style={styles.archiveSlot}>
        <Button
          variant="ghost"
          size="md"
          onPress={onViewArchive}
          accessibilityLabel={t('report.viewArchive')}
          rightIcon={<Icon name="chevron-right" size={20} color="primary" />}
        >
          {t('report.viewArchive')}
        </Button>
      </View>
    </ScrollView>
  );
}

/** "YYYY-MM-DD" → 로컬 표시(월/일). 파싱 실패 시 원문 반환(앱이 깨지지 않음). */
function formatWeekDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  const locale = getLocale() === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  statusText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
  },
  weekCaption: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
  headingBlock: {
    gap: spacing.xs,
  },
  heading: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
  subtitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  archiveSlot: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
});
