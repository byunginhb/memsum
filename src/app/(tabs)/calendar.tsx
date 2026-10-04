import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { EmptyState, Header, useBottomBarClearance } from '@/design';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { CalendarConnectPrompt } from '@/features/calendar/CalendarConnectPrompt';
import { EventCaptureList } from '@/features/calendar/EventCaptureList';
import { SkeletonBlock } from '@/features/captures/CaptureSkeleton';
import { useCalendarAction } from '@/hooks/use-calendar-action';
import { useEventCaptures } from '@/hooks/use-event-captures';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

/** 로딩 자리 표시 행 수. */
const SKELETON_ROWS = 3;

/**
 * 캘린더 탭 — 뽑힌 일정 타임라인 + 구글 캘린더 등록(명세 §6).
 *
 * 분기:
 * 1) hydrated 전: SecureStore 토큰 복원 전 → 타임라인 모양 스켈레톤(깜빡임 방지).
 * 2) 미연결: CalendarConnectPrompt(왼쪽 정렬 헤드라인 + 버튼 하나).
 * 3) 연결됨: 일정 캡처를 다가오는/지난으로 나눈 타임라인. 비었으면 EmptyState.
 *
 * 연결 계정 이메일은 큰 제목 위 mono 머리표로 둔다. 탭바가 떠 있으므로 하단 여백은
 * useBottomBarClearance().
 */
export default function CalendarScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const status = useCalendarStore((s) => s.status);
  const email = useCalendarStore((s) => s.email);
  const hydrated = useCalendarStore((s) => s.hydrated);
  const restore = useCalendarStore((s) => s.restore);

  // 앱 어디선가 restore()가 한 번은 호출돼야 한다. 이 화면 마운트 시 멱등 호출.
  useEffect(() => {
    if (!hydrated) void restore();
  }, [hydrated, restore]);

  const isConnected = status === 'connected';

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header
        large
        title={t('home.tab.calendar')}
        eyebrow={isConnected && email ? t('calendar.account', { email }) : undefined}
        topInset={insets.top}
      />
      {!hydrated ? (
        <TimelineSkeleton />
      ) : isConnected ? (
        <ConnectedBody />
      ) : (
        <PromptBody />
      )}
    </View>
  );
}

function PromptBody(): ReactNode {
  const bottomClearance = useBottomBarClearance();
  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.promptContent, { paddingBottom: bottomClearance }]}
      showsVerticalScrollIndicator={false}
    >
      <CalendarConnectPrompt />
    </ScrollView>
  );
}

/** 타임라인 모양 자리 표시(날짜 열 + 두 줄). */
function TimelineSkeleton(): ReactNode {
  return (
    <View
      style={styles.skeleton}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t('search.loading')}
    >
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <View key={i} style={styles.skeletonRow}>
          <SkeletonBlock width={spacing['4xl']} height={spacing['4xl']} />
          <View style={styles.skeletonLines}>
            <SkeletonBlock width="70%" height={spacing.lg} />
            <SkeletonBlock width="40%" height={spacing.md} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * 연결된 상태의 본문. 일정 캡처 훅을 여기서 호출해, 미연결일 때는 불필요한 데이터
 * 로드가 일어나지 않게 분리한다(훅은 마운트 시 fetch하므로).
 */
function ConnectedBody(): ReactNode {
  const { colors } = useTheme();
  const router = useRouter();
  const bottomClearance = useBottomBarClearance();
  const { upcoming, past, isLoading, error, refresh } = useEventCaptures();
  // 등록·열기는 홈 "다가오는 것"과 같은 공용 훅(로직 중복 금지).
  const { handleRegister, handleOpen, registeringId } = useCalendarAction(refresh);

  const hasItems = upcoming.length > 0 || past.length > 0;

  const handleOpenCapture = useCallback(
    (id: string): void => {
      router.push({ pathname: '/captures/[id]', params: { id } });
    },
    [router],
  );

  if (isLoading && !hasItems) return <TimelineSkeleton />;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        hasItems ? styles.listContent : null,
        { paddingBottom: bottomClearance },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading && hasItems}
          onRefresh={() => void refresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {hasItems ? (
        <EventCaptureList
          upcoming={upcoming}
          past={past}
          onRegister={handleRegister}
          onOpen={handleOpen}
          onOpenCapture={handleOpenCapture}
          registeringId={registeringId}
        />
      ) : error ? (
        <EmptyState
          icon="alert-circle"
          title={error}
          action={{ label: t('search.retry'), onPress: () => void refresh() }}
        />
      ) : (
        <EmptyState
          icon="calendar"
          title={t('calendar.empty.title')}
          body={t('calendar.empty.body')}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  promptContent: {
    paddingTop: spacing['2xl'],
  },
  listContent: {
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  skeleton: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing['2xl'],
    gap: spacing.xl,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skeletonLines: {
    flex: 1,
    gap: spacing.sm,
  },
});
