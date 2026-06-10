import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { useToast } from '@/design/components/Toast';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { CalendarConnectPrompt } from '@/features/calendar/CalendarConnectPrompt';
import { EventCaptureList } from '@/features/calendar/EventCaptureList';
import type { CaptureListItem } from '@/features/captures/types';
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
  const toast = useToast();

  const status = useCalendarStore((s) => s.status);
  const hydrated = useCalendarStore((s) => s.hydrated);
  const restore = useCalendarStore((s) => s.restore);
  const registerCapture = useCalendarStore((s) => s.registerCapture);

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
        <ConnectedBody
          insetsBottom={insets.bottom}
          toastShow={toast.show}
          registerCapture={registerCapture}
        />
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
  toastShow: ReturnType<typeof useToast>['show'];
  registerCapture: ReturnType<typeof useCalendarStore.getState>['registerCapture'];
};

/**
 * 연결된 상태의 본문. 이벤트 캡처 훅을 여기서 호출해, 미연결일 때는 불필요한 데이터
 * 로드가 일어나지 않게 분리한다(훅은 마운트 시 fetch하므로).
 */
function ConnectedBody({
  insetsBottom,
  toastShow,
  registerCapture,
}: ConnectedBodyProps): ReactNode {
  const { colors } = useTheme();
  const { upcoming, past, isLoading, error, refresh } = useEventCaptures();

  // 현재 등록 진행 중인 캡처 id. 해당 행만 로딩/비활성 처리(중복 탭 방지).
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const isEmpty = upcoming.length === 0 && past.length === 0 && !isLoading;

  const handleRegister = useCallback(
    (item: CaptureListItem): void => {
      // event가 없으면 캘린더에 넣을 내용이 없다(타입 가드 + 사용자 보호).
      if (!item.event) {
        console.error('[calendar] 등록 시도했으나 event가 없습니다:', item.id);
        return;
      }
      // 이미 다른 항목을 등록 중이면 무시(직렬 처리로 상태 꼬임 방지).
      if (registeringId !== null) return;

      setRegisteringId(item.id);
      const event = item.event;
      void (async () => {
        try {
          await registerCapture({ captureId: item.id, event });
          toastShow({
            tone: 'success',
            title: t('calendar.toast.registerSuccess'),
          });
          // 등록 결과(calendarEventId·htmlLink)를 반영하려면 목록을 다시 읽는다.
          await refresh();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : t('calendar.toast.registerError');
          console.error('[calendar] 일정 등록 실패:', message);
          toastShow({
            tone: 'danger',
            title: t('calendar.toast.registerError'),
          });
        } finally {
          setRegisteringId(null);
        }
      })();
    },
    [registeringId, registerCapture, refresh, toastShow],
  );

  const handleOpen = useCallback((htmlLink: string | null): void => {
    if (!htmlLink) return;
    void (async () => {
      try {
        await Linking.openURL(htmlLink);
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[calendar] 캘린더 링크 열기 실패:', message);
      }
    })();
  }, []);

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
            icon="calendar"
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
