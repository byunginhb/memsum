import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { Icon } from '@/design/icons/Icon';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, motion, spacing, typography } from '@/design/tokens';
import { fontFamily } from '@/design/tokens/typography';
import type { ReportFeedback, WeeklyReport } from '@/features/report/types';
import { ReportCard } from '@/features/report/ReportCard';
import { ReportCoachmark } from '@/features/report/ReportCoachmark';
import { useWeeklyReport } from '@/hooks/use-weekly-report';
import { getLocale, t } from '@/i18n';
import { AnalyticsEvent, track } from '@/lib/analytics';
import { useOnboardingStore } from '@/stores/onboarding-store';

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

  // 분석(비차단): 항목 있는 리포트 열람 = 핵심 가치 모먼트 도달(BM 검증 퍼널).
  useEffect(() => {
    if (!report || report.items.length === 0) return;
    track(AnalyticsEvent.ReportViewed, {
      itemCount: report.items.length,
      totalCaptures: report.totalCaptures,
    });
  }, [report]);

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
    track(AnalyticsEvent.ReportItemOpened, {});
    router.push({ pathname: '/captures/[id]', params: { id: captureId } });
  };

  const handleFeedback = (captureId: string, rating: ReportFeedback): void => {
    track(AnalyticsEvent.ReportFeedback, { rating });
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
        onViewArchive={() => router.push('/search')}
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
  // 코치마크 1회 노출 제어(영속 플래그). 훅은 조기 반환 전에 무조건 호출한다(Rules of Hooks).
  const coachmarkHydrated = useOnboardingStore((s) => s.hydrated);
  const coachmarkSeen = useOnboardingStore((s) => s.reportCoachmarkSeen);
  const seeReportCoachmark = useOnboardingStore((s) => s.seeReportCoachmark);

  // 최초 로딩(데이터 없음) — 스피너 대신 브랜드 9점 모먼트(DotsGrid). 이슈 #9: 로딩도 브랜드 톤.
  if (isLoading && !report) {
    return (
      <View
        style={[styles.flex, styles.center]}
        accessibilityRole="progressbar"
        accessibilityLabel={t('report.title')}
      >
        <DotsGrid size={96} animated />
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

  // items가 있는 리포트를 처음 볼 때만 코치마크 1회 노출(복원 완료 후, 미열람 시).
  const showCoachmark = coachmarkHydrated && !coachmarkSeen;

  // 코치마크 닫기: 영속 플래그 + 분석(교육 도달) 함께 처리.
  const handleDismissCoachmark = (): void => {
    track(AnalyticsEvent.ReportCoachmarkDismissed, {});
    seeReportCoachmark();
  };

  return (
    <>
      <ReportContent
        report={report}
        subtitle={subtitle}
        contentStyle={contentStyle}
        onPressOriginal={onPressOriginal}
        onFeedback={onFeedback}
        onViewArchive={onViewArchive}
      />
      <ReportCoachmark visible={showCoachmark} onDismiss={handleDismissCoachmark} />
    </>
  );
}

/** 주차 캡션 슬라이드-인 거리(px) — 진입 세리머니. */
const CAPTION_SLIDE_Y = 8;

type ReportContentProps = {
  report: WeeklyReport;
  subtitle: string;
  contentStyle: object;
  onPressOriginal: (captureId: string) => void;
  onFeedback: (captureId: string, rating: ReportFeedback) => void;
  onViewArchive: () => void;
};

/**
 * 리포트 본문 + 진입 세리머니(design.md §27, 이슈 #9 D3).
 *
 * 마운트(= 리포트가 준비된 그 순간) 시:
 *  (a) 딤 오프닝 — 컨텐츠 전체가 opacity 0→1로 부드럽게 밝아진다(duration.slow).
 *  (b) 주차 캡션이 fade + 아래→위 슬라이드로 먼저 등장(duration.base)한 뒤,
 *      5장 카드가 index 기반 stagger로 이어진다(ReportCard 내부, ritual 예산 안).
 * reduce-motion이면 즉시 최종 상태로 표시한다.
 */
function ReportContent({
  report,
  subtitle,
  contentStyle,
  onPressOriginal,
  onFeedback,
  onViewArchive,
}: ReportContentProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  // (a) 딤 오프닝 — 컨텐츠 페이드인. (b) 캡션 fade + slide.
  const contentOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const captionOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const captionTranslateY = useSharedValue(reducedMotion ? 0 : CAPTION_SLIDE_Y);

  useEffect(() => {
    if (reducedMotion) {
      contentOpacity.value = 1;
      captionOpacity.value = 1;
      captionTranslateY.value = 0;
      return;
    }

    contentOpacity.value = withTiming(1, {
      duration: motion.duration.slow,
      easing: motion.easing.decel,
    });
    captionOpacity.value = withTiming(1, {
      duration: motion.duration.base,
      easing: motion.easing.decel,
    });
    captionTranslateY.value = withTiming(0, {
      duration: motion.duration.base,
      easing: motion.easing.decel,
    });

    return () => {
      cancelAnimation(contentOpacity);
      cancelAnimation(captionOpacity);
      cancelAnimation(captionTranslateY);
    };
  }, [reducedMotion, contentOpacity, captionOpacity, captionTranslateY]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));
  const captionAnimatedStyle = useAnimatedStyle(() => ({
    opacity: captionOpacity.value,
    transform: [{ translateY: captionTranslateY.value }],
  }));

  return (
    <ScrollView style={styles.flex} contentContainerStyle={contentStyle}>
      <Animated.View style={[styles.entrance, contentAnimatedStyle]}>
        {/* 주차 캡션 — 세리머니의 첫 등장 */}
        <Animated.Text
          style={[styles.weekCaption, captionAnimatedStyle, { color: colors.textSecondary }]}
        >
          {t('report.weekRange', {
            start: formatWeekDate(report.weekStart),
            end: formatWeekDate(report.weekEnd),
          })}
        </Animated.Text>
        <View style={[styles.hairlineDivider, { borderBottomColor: colors.border }]} />

        {/* 헤딩 + 서브타이틀 */}
        <View style={styles.headingBlock}>
          <Text
            style={[styles.heading, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {t('report.weekly')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {renderWithMonoDigits(subtitle)}
          </Text>
        </View>

        {/* ReportCard 5개 (stagger reveal은 카드 내부에서 index 기반으로 처리) */}
        {report.items.map((item, index) => (
          <ReportCard
            key={item.captureId}
            item={item}
            index={index}
            revealCount={report.items.length}
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
      </Animated.View>
    </ScrollView>
  );
}

/**
 * 문자열 내 연속 숫자를 mono fontFamily로 감싸 반환한다.
 * 한글 텍스트는 Pretendard 그대로 유지하고, 라틴·숫자 부분만 mono 적용.
 */
function renderWithMonoDigits(text: string): ReactNode[] {
  return text.split(/(\d+)/).map((part, i) =>
    /^\d+$/.test(part) ? (
      <Text key={i} style={{ fontFamily: fontFamily.mono }}>
        {part}
      </Text>
    ) : (
      part
    ),
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
  // 진입 세리머니 래퍼 — 컨텐츠 페이드인. 자식 간 간격(gap)을 여기서 유지한다
  // (ScrollView contentContainer의 단일 자식이 되므로 gap을 이 래퍼로 옮긴다).
  entrance: {
    gap: spacing.lg,
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
    fontFamily: fontFamily.mono,
    letterSpacing: 1,
  },
  hairlineDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.xs,
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
