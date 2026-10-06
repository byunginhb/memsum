import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import {
  Button,
  CropFrame,
  Eyebrow,
  Icon,
  Marked,
  PressableScale,
  Text,
  useBottomBarClearance,
  useTheme,
} from '@/design';
import { motion, spacing } from '@/design/tokens';
import { CaptureGrid } from '@/features/home/CaptureGrid';
import { pickHeadline, weekLabelParts } from '@/features/home/home-summary';
import type { HeadlineKind } from '@/features/home/home-summary';
import { SkeletonBlock } from '@/features/home/Skeleton';
import { StaggerIn } from '@/features/home/StaggerIn';
import { TopicChips } from '@/features/home/TopicChips';
import { UpcomingList } from '@/features/home/UpcomingList';
import type { ParcelTrack } from '@/features/parcel/types';
import { useCalendarAction } from '@/hooks/use-calendar-action';
import { useCaptures } from '@/hooks/use-captures';
import { useCategoryGroups } from '@/hooks/use-category-groups';
import { useEventCaptures } from '@/hooks/use-event-captures';
import { usePhotoImport } from '@/hooks/use-photo-import';
import { useWeeklyStats } from '@/hooks/use-weekly-stats';
import { getLocale, t } from '@/i18n';
import type { CategoryKey } from '@/lib/categories';
import { PARCEL_ENABLED } from '@/lib/features';
import { useParcelStore } from '@/stores/parcel-store';
import { useSettingsStore } from '@/stores/settings-store';

/** 최근 캡처 미리보기 — 3열 × 2줄. 전체는 검색 탭에서. */
const RECENT_LIMIT = 6;
/** "놓치면 안 돼요"에 띄울 최대 일정·택배 수. 전체 일정은 캘린더 탭에서. */
const UPCOMING_EVENT_LIMIT = 4;
const UPCOMING_PARCEL_LIMIT = 2;
/** 택배 진행 단계 중 배송완료. */
const PARCEL_DELIVERED_LEVEL = 6;
/** 헤드라인 형광펜은 첫 섹션이 떠오른 뒤 긋는다. */
const MARK_DELAY = motion.duration.slow;
/** 빈 상태 장식 프레임(세로형 스크린샷 비율). */
const EMPTY_FRAME_WIDTH = 96;
const EMPTY_FRAME_HEIGHT = 128;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;

/** 헤드라인 문구 키. 영어 단수형이 따로 있어 1개일 때 One 키를 쓴다. */
function headlineKeys(kind: HeadlineKind, count: number): { text: string; mark?: string } {
  if (kind === 'empty') return { text: 'home.headline.empty' };
  if (kind === 'quietWeek') return { text: 'home.headline.quietWeek' };
  const suffix = count === 1 ? 'One' : '';
  return {
    text: `home.headline.${kind}${suffix}`,
    mark: `home.headline.${kind}Mark${suffix}`,
  };
}

/**
 * 홈 — 놓치면 안 될 것 먼저(명세 §6 + 원격 #3 "놓침 방지 대시보드").
 *
 * 머리표(`10월 1주 · 38장`) → display 헤드라인 한 문장(형광펜 1곳, 다가오는 일정 > 택배 > 캡처)
 * → 놓치면 안 돼요(D-day 순 일정 + 배송 중 택배, 캘린더 등록/열기) → 최근 캡처 3열 → 주제별 칩.
 * 첫 로딩은 스켈레톤, 이후 갱신은 당겨서 새로고침일 때만 스피너. 포그라운드 복귀 시
 * D-day 기준 시각과 목록을 다시 읽는다(밤새 켜 둔 앱이 "내일"을 그대로 보여 주지 않게).
 */
export default function HomeScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomBarClearance();
  const router = useRouter();

  const captures = useCaptures();
  const weeklyStats = useWeeklyStats();
  const categoryGroups = useCategoryGroups();
  const eventCaptures = useEventCaptures();
  const { onImport, isImporting } = usePhotoImport();

  const parcelTracking = useSettingsStore((s) => s.parcelTracking);
  const tracks = useParcelStore((s) => s.tracks);
  const refreshParcels = useParcelStore((s) => s.refresh);
  // 택배 조회는 기능 스위치(PARCEL_ENABLED)로 꺼 둘 수 있다 — 꺼지면 행·헤드라인 모두 빠진다.
  const parcelsEnabled = PARCEL_ENABLED && getLocale() === 'ko' && parcelTracking;

  useEffect(() => {
    if (parcelsEnabled) void refreshParcels();
  }, [parcelsEnabled, refreshParcels]);

  // D-day 기준 시각. 렌더에서 Date.now()를 직접 부르지 않는다(순수성).
  const [now, setNow] = useState<number>(() => Date.now());
  const { handleRegister, handleOpen, registeringId } = useCalendarAction(eventCaptures.refresh);

  // 당겨서 새로고침일 때만 스피너. 자동 갱신(savedCount)에는 스피너를 띄우지 않는다.
  const [pulling, setPulling] = useState(false);
  const handleRefresh = useCallback(async (): Promise<void> => {
    setPulling(true);
    setNow(Date.now());
    try {
      await Promise.all([
        captures.refresh(),
        weeklyStats.refresh(),
        categoryGroups.refresh(),
        eventCaptures.refresh(),
        parcelsEnabled ? refreshParcels() : Promise.resolve(),
      ]);
    } finally {
      setPulling(false);
    }
  }, [captures, weeklyStats, categoryGroups, eventCaptures, parcelsEnabled, refreshParcels]);

  // 포그라운드 복귀: 조용히(스피너 없이) D-day와 목록을 새로 읽는다.
  // why ref: 리스너는 한 번만 붙이고 최신 갱신 함수를 부른다(매 렌더 재구독 방지).
  const silentRefreshRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    silentRefreshRef.current = (): void => {
      setNow(Date.now());
      void eventCaptures.refresh();
      void weeklyStats.refresh();
      if (parcelsEnabled) void refreshParcels();
    };
  }, [eventCaptures, weeklyStats, parcelsEnabled, refreshParcels]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') silentRefreshRef.current();
    });
    return () => sub.remove();
  }, []);

  // 첫 로딩: 목록·주간 통계가 아직 한 번도 안 왔으면 스켈레톤.
  const firstLoad =
    (captures.items.length === 0 && captures.isLoading) ||
    (weeklyStats.stats === null && weeklyStats.error === null);
  const loadFailed = captures.items.length === 0 && captures.error !== null;
  const hasAny = captures.items.length > 0;

  const activeParcels = useMemo(
    (): ParcelTrack[] =>
      parcelsEnabled
        ? tracks.filter((p) => p.state === 'active' && p.level < PARCEL_DELIVERED_LEVEL)
        : [],
    [parcelsEnabled, tracks],
  );

  const summary = useMemo(() => {
    const stats = weeklyStats.stats;
    const label = stats ? weekLabelParts(stats.weekStart, getLocale()) : null;
    const capturesThisWeek = stats?.count ?? 0;
    return {
      eyebrow: label
        ? t('home.eyebrow', { month: label.month, week: label.week, count: capturesThisWeek })
        : '',
      headline: pickHeadline({
        upcomingEvents: eventCaptures.upcoming.length,
        activeParcels: activeParcels.length,
        captures: capturesThisWeek,
        hasAny,
      }),
    };
  }, [weeklyStats.stats, eventCaptures.upcoming.length, activeParcels.length, hasAny]);

  const upcomingEvents = eventCaptures.upcoming.slice(0, UPCOMING_EVENT_LIMIT);
  const upcomingParcels = activeParcels.slice(0, UPCOMING_PARCEL_LIMIT);
  const hasUpcoming = upcomingEvents.length + upcomingParcels.length > 0;
  // 일정 목록을 아직 한 번도 못 받았으면 "없어요"를 말하지 않는다(깜빡임 방지).
  const upcomingSettled = !eventCaptures.isLoading || hasUpcoming;
  const recentItems = captures.items.slice(0, RECENT_LIMIT);

  const openCapture = useCallback(
    (id: string): void => router.push({ pathname: '/captures/[id]', params: { id } }),
    [router],
  );
  const openParcel = useCallback(
    (id: string): void => router.push({ pathname: '/parcel/[id]', params: { id } }),
    [router],
  );
  const openCategory = useCallback(
    (key: CategoryKey): void => router.push({ pathname: '/search', params: { category: key } }),
    [router],
  );
  // 주간 5줄 리포트의 인앱 진입점(알림 딥링크 외 유일).
  const openReport = useCallback((): void => router.push('/report/weekly'), [router]);

  const keys = headlineKeys(summary.headline.kind, summary.headline.count);
  const headlineText = t(keys.text, { count: summary.headline.count });
  const markText = keys.mark ? t(keys.mark, { count: summary.headline.count }) : undefined;

  let content: ReactNode;
  if (firstLoad) {
    content = <HomeSkeleton />;
  } else if (loadFailed) {
    content = (
      <View style={styles.pad}>
        <View style={styles.headBlock}>
          <Text variant="display" accessibilityRole="header">
            {t('home.error.title')}
          </Text>
          <Text variant="body" color="textSecondary">
            {t('home.error.body')}
          </Text>
        </View>
        <Button variant="secondary" onPress={() => void handleRefresh()} style={styles.selfStart}>
          {t('home.error.retry')}
        </Button>
      </View>
    );
  } else {
    content = (
      <>
        <StaggerIn index={0} style={styles.pad}>
          <View style={styles.headBlock}>
            {summary.eyebrow ? <Eyebrow>{summary.eyebrow}</Eyebrow> : null}
            <Marked text={headlineText} mark={markText} delay={MARK_DELAY} accessibilityRole="header" />
          </View>

          {summary.headline.kind === 'empty' ? (
            <View style={styles.emptyBlock}>
              <Text variant="body" color="textSecondary">
                {t('home.empty.body')}
              </Text>
              <Button
                onPress={onImport}
                loading={isImporting}
                leftIcon={<Icon name="images" size={20} color="onPrimary" />}
                style={styles.selfStart}
              >
                {t('home.capture.import')}
              </Button>
              <CropFrame
                width={EMPTY_FRAME_WIDTH}
                height={EMPTY_FRAME_HEIGHT}
                color="textSecondary"
                style={styles.emptyFrame}
              />
            </View>
          ) : (
            <PressableScale
              onPress={openReport}
              accessibilityRole="link"
              accessibilityLabel={t('home.report.open')}
              style={styles.reportLink}
            >
              <Text variant="bodyStrong" color="primary">
                {t('home.report.open')}
              </Text>
              <Icon name="chevron-right" size={16} color="primary" />
            </PressableScale>
          )}
        </StaggerIn>

        {summary.headline.kind !== 'empty' && upcomingSettled ? (
          <StaggerIn index={1} style={[styles.pad, styles.section]}>
            <Eyebrow accessibilityRole="header">{t('home.section.upcoming')}</Eyebrow>
            {hasUpcoming ? (
              <UpcomingList
                events={upcomingEvents}
                parcels={upcomingParcels}
                now={now}
                registeringId={registeringId}
                onRegister={handleRegister}
                onOpenCalendar={handleOpen}
                onOpenCapture={openCapture}
                onOpenParcel={openParcel}
              />
            ) : (
              <Text variant="body" color="textSecondary">
                {t('home.upcoming.empty')}
              </Text>
            )}
          </StaggerIn>
        ) : null}

        {recentItems.length > 0 ? (
          <StaggerIn index={2} style={[styles.pad, styles.section]}>
            <Eyebrow accessibilityRole="header">{t('home.section.recent')}</Eyebrow>
            <CaptureGrid items={recentItems} onPressItem={openCapture} />
          </StaggerIn>
        ) : null}

        {categoryGroups.groups.length > 0 ? (
          <StaggerIn index={3} style={styles.section}>
            <View style={styles.pad}>
              <Eyebrow accessibilityRole="header">{t('home.section.categories')}</Eyebrow>
            </View>
            <TopicChips groups={categoryGroups.groups} onPress={openCategory} />
          </StaggerIn>
        ) : null}
      </>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bgBase }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing['2xl'], paddingBottom: bottomClearance },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={pulling}
          onRefresh={() => void handleRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {content}
    </ScrollView>
  );
}

/** 첫 로딩 스켈레톤 — 실제 배치(머리표·헤드라인·목록·3열)와 같은 자리를 잡는다. */
function HomeSkeleton(): ReactNode {
  return (
    <View
      style={[styles.pad, styles.skeleton]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('home.loading')}
    >
      <View style={styles.headBlock}>
        <SkeletonBlock width={128} height={14} />
        <SkeletonBlock width="88%" height={34} />
        <SkeletonBlock width="56%" height={34} />
      </View>
      <View style={styles.section}>
        <SkeletonBlock width={80} height={12} />
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <SkeletonBlock width={56} height={36} />
            <View style={styles.flex}>
              <SkeletonBlock width="72%" height={16} />
              <SkeletonBlock width="40%" height={12} style={styles.skeletonGap} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <SkeletonBlock width={80} height={12} />
        <View style={styles.skeletonGrid}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.flex}>
              <SkeletonBlock height={120} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: spacing['3xl'],
  },
  pad: {
    paddingHorizontal: spacing.lg,
  },
  headBlock: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.md,
  },
  selfStart: {
    alignSelf: 'flex-start',
  },
  emptyBlock: {
    marginTop: spacing.lg,
    gap: spacing.xl,
    alignItems: 'flex-start',
  },
  emptyFrame: {
    marginTop: spacing.lg,
  },
  reportLink: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  skeleton: {
    gap: spacing['3xl'],
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  skeletonGap: {
    marginTop: spacing.sm,
  },
  skeletonGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
