import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import { ReportCoachmark } from '@/features/report/ReportCoachmark';
import {
  RANK_COLUMN,
  REPORT_LINE_COUNT,
  ReportLine,
  THUMB_HEIGHT,
  THUMB_WIDTH,
} from '@/features/report/ReportLine';
import type { ReportFeedback, WeeklyReport } from '@/features/report/types';
import { useWeeklyReport } from '@/hooks/use-weekly-report';
import { getLocale, t } from '@/i18n';
import { AnalyticsEvent, track } from '@/lib/analytics';
import { useOnboardingStore } from '@/stores/onboarding-store';

/** 로딩 자리표시 줄의 문장 막대 너비(%) — 줄마다 길이를 달리해 실제 문장처럼 보이게. */
const SKELETON_WIDTHS = ['82%', '64%', '74%', '58%', '68%'] as const;
/** 자리표시 문장 막대 높이 = headline 행간 근처. */
const SKELETON_BAR_HEIGHT = 18;

type WeeklyReportScreenProps = {
  /** "YYYY-MM-DD"(KST 월요일). 미지정 시 이번 주. */
  weekStart?: string;
  /** 사용자 닉네임. 빈 문자열이면 이름 없는 문구를 쓴다. */
  nickname?: string;
};

/**
 * WeeklyReportScreen — 일요일의 5줄 리포트.
 *
 * 머리표(기간) + display 제목 "5줄 리포트" → 한 줄 소개 → 다섯 줄(ReportLine).
 * 순위 숫자가 1부터 차례로 떨어지는 연출이 이 화면의 단 하나의 연출이고,
 * 1위 숫자에만 형광펜이 그어지며 약한 햅틱이 함께 온다.
 * 상태: 로딩(자리표시 다섯 줄) / 오류(왼쪽 정렬 + 다시 시도) / 빈(왼쪽 정렬 + 홈으로).
 */
export function WeeklyReportScreen({
  weekStart,
  nickname = '',
}: WeeklyReportScreenProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { report, isLoading, error, refresh, setFeedback } = useWeeklyReport(weekStart);

  // 분석(비차단): 항목 있는 리포트 열람 = 핵심 가치 모먼트 도달(BM 검증 퍼널).
  useEffect(() => {
    if (!report || report.items.length === 0) return;
    track(AnalyticsEvent.ReportViewed, {
      itemCount: report.items.length,
      totalCaptures: report.totalCaptures,
    });
  }, [report]);

  // 알림 딥링크로 바로 열린 경우엔 돌아갈 화면이 없으므로 홈으로 보낸다.
  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  const handlePressOriginal = (captureId: string): void => {
    track(AnalyticsEvent.ReportItemOpened, {});
    router.push({ pathname: '/captures/[id]', params: { id: captureId } });
  };

  const handleFeedback = (captureId: string, rating: ReportFeedback): void => {
    track(AnalyticsEvent.ReportFeedback, { rating });
    void setFeedback(captureId, rating);
  };

  const eyebrow = report
    ? t('report.weekRange', {
        start: formatWeekDate(report.weekStart),
        end: formatWeekDate(report.weekEnd),
      })
    : undefined;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header
        large
        title={t('report.title')}
        eyebrow={eyebrow}
        onBack={handleBack}
        backLabel={t('common.back')}
        topInset={insets.top}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['4xl'] }]}
      >
        <Body
          report={report}
          isLoading={isLoading}
          error={error}
          nickname={nickname}
          onRetry={() => void refresh()}
          onPressOriginal={handlePressOriginal}
          onFeedback={handleFeedback}
          onViewArchive={() => router.push('/search')}
          onGoHome={() => router.replace('/')}
        />
      </ScrollView>
    </View>
  );
}

type BodyProps = {
  report: WeeklyReport | null;
  isLoading: boolean;
  error: string | null;
  nickname: string;
  onRetry: () => void;
  onPressOriginal: (captureId: string) => void;
  onFeedback: (captureId: string, rating: ReportFeedback) => void;
  onViewArchive: () => void;
  onGoHome: () => void;
};

/** 상태 분기: 로딩 → 오류 → 빈(캡처 < 5) → 리포트. */
function Body({
  report,
  isLoading,
  error,
  nickname,
  onRetry,
  onPressOriginal,
  onFeedback,
  onViewArchive,
  onGoHome,
}: BodyProps): ReactNode {
  // 첫 열람 1회 안내. 훅은 조기 반환 전에 무조건 호출한다(Rules of Hooks).
  const coachmarkHydrated = useOnboardingStore((s) => s.hydrated);
  const coachmarkSeen = useOnboardingStore((s) => s.reportCoachmarkSeen);
  const seeReportCoachmark = useOnboardingStore((s) => s.seeReportCoachmark);

  if (isLoading && !report) {
    return <ReportSkeleton />;
  }

  if (error && !report) {
    return (
      <EmptyState
        icon="alert-circle"
        title={t('report.error.generic')}
        body={t('report.error.body')}
        action={{ label: t('report.retry'), onPress: onRetry }}
      />
    );
  }

  if (!report || report.items.length === 0) {
    return (
      <EmptyState
        icon="images"
        title={t('report.empty.title')}
        body={t('report.empty.body')}
        action={{ label: t('report.empty.action'), onPress: onGoHome }}
      />
    );
  }

  const total = report.totalCaptures;
  const name = nickname.trim();
  const intro =
    name.length > 0
      ? t('report.weeklySubtitle', { name, total })
      : t('report.weeklySubtitleNoName', { total });

  const handleDismissCoachmark = (): void => {
    track(AnalyticsEvent.ReportCoachmarkDismissed, {});
    seeReportCoachmark();
  };

  return (
    <View style={styles.report}>
      <Text variant="body" color="textSecondary">
        {intro}
      </Text>

      <ReportCoachmark
        visible={coachmarkHydrated && !coachmarkSeen}
        onDismiss={handleDismissCoachmark}
      />

      <View accessibilityRole="list">
        {report.items.map((item, index) => (
          <ReportLine
            key={item.captureId}
            item={item}
            index={index}
            isLast={index === report.items.length - 1}
            onPressOriginal={onPressOriginal}
            onFeedback={onFeedback}
          />
        ))}
      </View>

      <Button
        variant="secondary"
        size="md"
        onPress={onViewArchive}
        accessibilityLabel={t('report.viewArchive')}
        rightIcon={<Icon name="chevron-right" size={20} color="primary" />}
        style={styles.archive}
      >
        {t('report.viewArchive')}
      </Button>
    </View>
  );
}

/**
 * 로딩 자리표시 — 스피너 대신 다섯 줄의 골격을 미리 보여 준다.
 * 순위 숫자는 흐린 글자로, 문장·썸네일은 muted 면으로. 움직임 없음(곧 진짜 연출이 온다).
 */
function ReportSkeleton(): ReactNode {
  const { colors } = useTheme();
  return (
    <View
      style={styles.report}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('report.loading')}
    >
      {SKELETON_WIDTHS.slice(0, REPORT_LINE_COUNT).map((width, i) => (
        <View
          key={width}
          style={[
            styles.skeletonLine,
            i < REPORT_LINE_COUNT - 1
              ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
              : null,
          ]}
        >
          <Text variant="mega" color="textDisabled" style={styles.skeletonRank}>
            {i + 1}
          </Text>
          <View style={styles.skeletonText}>
            <View style={[styles.skeletonBar, { width, backgroundColor: colors.bgMuted }]} />
            <View style={[styles.skeletonBarShort, { backgroundColor: colors.bgMuted }]} />
          </View>
          <View style={[styles.skeletonThumb, { backgroundColor: colors.bgMuted }]} />
        </View>
      ))}
    </View>
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  report: {
    gap: spacing.lg,
  },
  archive: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  skeletonLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  skeletonRank: {
    width: RANK_COLUMN,
  },
  skeletonText: {
    flex: 1,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  skeletonBar: {
    height: SKELETON_BAR_HEIGHT,
    borderRadius: radius.sm,
  },
  skeletonBarShort: {
    width: '40%',
    height: SKELETON_BAR_HEIGHT,
    borderRadius: radius.sm,
  },
  skeletonThumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.md,
  },
});
