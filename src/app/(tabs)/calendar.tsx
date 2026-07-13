import { useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { CalendarConnectPrompt } from '@/features/calendar/CalendarConnectPrompt';
import { EventCaptureList } from '@/features/calendar/EventCaptureList';
import { useCalendarAction } from '@/hooks/use-calendar-action';
import { useEventCaptures } from '@/hooks/use-event-captures';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

/**
 * 캘린더 탭 — 감지된 일정 모음 + 구글 캘린더 등록 (C2).
 *
 * 분기:
 * 1) hydrated 전: SecureStore 토큰 복원 전이라 깜빡임 방지로 로딩 인디케이터만.
 * 2) 미연결(status !== 'connected'): CalendarConnectPrompt(브랜드 모먼트).
 * 3) 연결됨: 이벤트 캡처를 로드해 upcoming/past로 보여준다. 비었으면 EmptyState.
 *
 * 등록(onRegister): registeringId로 해당 행을 로딩 처리 → store.registerCapture →
 * 성공/실패 토스트 + refresh. 열기(onOpen): Linking.openURL로 외부 캘린더 딥링크.
 */
export default function CalendarScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const status = useCalendarStore((s) => s.status);
  const hydrated = useCalendarStore((s) => s.hydrated);
  const restore = useCalendarStore((s) => s.restore);

  // 앱 어디선가 restore()가 한 번은 호출돼야 한다. 이 화면 마운트 시 멱등 호출.
  useEffect(() => {
    if (!hydrated) void restore();
  }, [hydrated, restore]);

  const isConnected = status === 'connected';

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header large title={t('home.tab.calendar')} topInset={insets.top} />
      {!hydrated ? (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isConnected ? (
        <ConnectedBody insetsBottom={insets.bottom} />
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.promptContent,
            { paddingBottom: insets.bottom + spacing['6xl'] },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <CalendarConnectPrompt />
        </ScrollView>
      )}
    </View>
  );
}

type ConnectedBodyProps = {
  insetsBottom: number;
};

/**
 * 연결된 상태의 본문. 이벤트 캡처 훅을 여기서 호출해, 미연결일 때는 불필요한 데이터
 * 로드가 일어나지 않게 분리한다(훅은 마운트 시 fetch하므로).
 * 등록·열기 액션은 useCalendarAction 공용 훅 사용(홈과 로직 공유, 중복 금지).
 */
function ConnectedBody({ insetsBottom }: ConnectedBodyProps): ReactNode {
  const { colors } = useTheme();
  const { upcoming, past, isLoading, error, refresh } = useEventCaptures();
  const { handleRegister, handleOpen, registeringId } = useCalendarAction(refresh);

  const isEmpty = upcoming.length === 0 && past.length === 0 && !isLoading;

  const contentStyle = useMemo(
    () => ({
      paddingTop: spacing.md,
      paddingHorizontal: spacing.lg,
      // 하단 탭바(BottomBar)에 마지막 행이 가리지 않도록 넉넉한 여백 확보.
      paddingBottom: insetsBottom + spacing['6xl'],
    }),
    [insetsBottom],
  );

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={() => void refresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {isEmpty ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            illustration={<DotsGrid size={96} animated />}
            title={t('calendar.empty.title')}
            body={error ?? t('calendar.empty.body')}
          />
        </View>
      ) : (
        <EventCaptureList
          upcoming={upcoming}
          past={past}
          onRegister={handleRegister}
          onOpen={handleOpen}
          registeringId={registeringId}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptContent: {
    paddingTop: spacing['4xl'],
  },
  emptyWrap: {
    paddingHorizontal: spacing.xl,
  },
});
