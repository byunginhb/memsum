import { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { CategoryList } from '@/features/home/CategoryList';
import { HomeGreeting } from '@/features/home/HomeGreeting';
import { RecentCapturesGrid } from '@/features/home/RecentCapturesGrid';
import { WeeklyStatsCard } from '@/features/home/WeeklyStatsCard';
import { ParcelHomeSection } from '@/features/parcel/components/ParcelHomeSection';
import type { CaptureListItem } from '@/features/captures/types';
import { useCaptures } from '@/hooks/use-captures';
import { useCategoryGroups } from '@/hooks/use-category-groups';
import { usePhotoImport } from '@/hooks/use-photo-import';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { t } from '@/i18n';
import type { CategoryKey } from '@/lib/categories';

// 홈 "최근 캡처"는 헤드라인 미리보기이므로 상위 N개만 노출(전체 목록은 검색·탭으로).
const RECENT_LIMIT = 6;

// 빈 상태 일러스트(DotsGrid 9점 로고) 크기 — 구 홈과 동일(112px).
const EMPTY_ILLUSTRATION_SIZE = 112;

/**
 * 메인 홈(대시보드) — design.md §26.
 *
 * 위→아래로 개인화 인사, 이번 주 통계 카드, "최근 캡처" 그리드, "주제별 묶음" 리스트를
 * ScrollView로 쌓는다. 캡처가 0건이고 로딩이 아니면 통계/그리드/카테고리 대신
 * 브랜드 모먼트 EmptyState만 보여준다.
 *
 * FAB·헤더 아이콘은 BottomBar(중앙 캡처+, 4탭 네비)가 대체하므로 두지 않는다.
 * 캡처 확인 Sheet(CaptureSheet)는 (tabs)/_layout.tsx에 상주하므로 여기서 렌더하지 않는다.
 */
export default function HomeScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const captures = useCaptures();
  const weeklyStats = useWeeklyStats();
  const categoryGroups = useCategoryGroups();
  const { onImport } = usePhotoImport();

  // 빈 상태 판정: 캡처 0건 && 최초 로드 중이 아님. 로딩 중에는 깜빡임 방지로 빈 상태를 숨긴다.
  const isEmpty = captures.items.length === 0 && !captures.isLoading;

  // pull-to-refresh: 세 데이터 소스를 한 번에 새로고침한다.
  const handleRefresh = useCallback((): void => {
    void captures.refresh();
    void weeklyStats.refresh();
    void categoryGroups.refresh();
  }, [captures, weeklyStats, categoryGroups]);

  const handleOpenCapture = useCallback(
    (id: string): void => {
      router.push({ pathname: '/captures/[id]', params: { id } });
    },
    [router],
  );

  const handleOpenCategory = useCallback(
    (key: CategoryKey): void => {
      router.push({ pathname: '/search', params: { category: key } });
    },
    [router],
  );

  // 주간 5줄 리포트로의 유일한 인앱 진입점(이전엔 푸시 알림 딥링크만 존재).
  const handleOpenReport = useCallback((): void => {
    router.push('/report/weekly');
  }, [router]);

  // 최근 캡처: 전체 목록의 상위 N개만 헤드라인으로.
  const recentItems = useMemo(
    (): CaptureListItem[] => captures.items.slice(0, RECENT_LIMIT),
    [captures.items],
  );

  const contentStyle = useMemo(
    () => ({
      paddingTop: spacing.md,
      // 하단 탭바(BottomBar)에 마지막 섹션이 가리지 않도록 넉넉한 여백 확보.
      paddingBottom: insets.bottom + spacing['6xl'],
      gap: spacing.lg,
    }),
    [insets.bottom],
  );

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bgBase }]}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={captures.isLoading}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <HomeGreeting topInset={insets.top} />

      {isEmpty ? (
        <HomeEmptyState onImport={onImport} />
      ) : (
        <View style={styles.sections}>
          {/* 배송 현황 — ko + 토글 ON + 활성 택배 있을 때만(컴포넌트 자체 게이트). */}
          <ParcelHomeSection />

          <View style={styles.block}>
            <WeeklyStatsCard
              stats={weeklyStats.stats}
              isLoading={weeklyStats.isLoading}
              onPress={handleOpenReport}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel label={t('home.section.recent')} />
            <RecentCapturesGrid items={recentItems} onPressItem={handleOpenCapture} />
          </View>

          {categoryGroups.groups.length > 0 ? (
            <View style={styles.section}>
              <SectionLabel label={t('home.section.categories')} />
              <CategoryList groups={categoryGroups.groups} onPressCategory={handleOpenCategory} />
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

type SectionLabelProps = {
  label: string;
};

/**
 * 섹션 라벨 — caption 스케일·textSecondary로 그룹 제목을 약하게 표기(design.md §26).
 * accessibilityRole="header"로 스크린리더에 섹션 제목임을 알린다.
 */
function SectionLabel({ label }: SectionLabelProps): ReactNode {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="header"
      style={[styles.sectionLabel, { color: colors.textSecondary }]}
      numberOfLines={1}
    >
      {label}
    </Text>
  );
}

type HomeEmptyStateProps = {
  onImport: () => void;
};

/**
 * 홈 빈 상태 — 브랜드 모먼트.
 * 디자인 EmptyState에 애니메이션 DotsGrid(9점 로고)를 일러스트로 주입하고,
 * "사진 가져와 정리하기" CTA로 첫 경험을 유도한다(design.md §26·빈 상태 가이드).
 */
function HomeEmptyState({ onImport }: HomeEmptyStateProps): ReactNode {
  return (
    <View style={styles.empty}>
      <EmptyState
        illustration={<DotsGrid size={EMPTY_ILLUSTRATION_SIZE} animated />}
        title={t('home.empty.title')}
        body={t('home.empty.body')}
        action={{ label: t('home.capture.import'), onPress: onImport }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  sections: {
    gap: spacing.lg,
  },
  block: {
    paddingHorizontal: spacing.lg,
  },
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  empty: {
    paddingHorizontal: spacing.xl,
  },
});
