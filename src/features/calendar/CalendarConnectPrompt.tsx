import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { useToast } from '@/design/components/Toast';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

/**
 * 캘린더 미연결 상태의 브랜드 모먼트 (C2).
 *
 * 아이콘(calendar) + 안내 문구 + Primary 버튼으로 구글 캘린더 연결을 유도한다.
 * 버튼을 누르면 store.connect()를 await하고, 그 뒤 store의 status/error로 결과를 분기한다.
 * - 연결 성공: success 토스트(connectSuccess)
 * - 사용자 취소: 무토스트(connect가 throw하지 않고 status가 connected로 안 바뀜)
 * - 실제 오류: danger 토스트(connectError)
 *
 * status가 'error'면 마지막 시도 실패 안내(error.title)와 재시도 버튼을 추가로 노출한다.
 */
export function CalendarConnectPrompt(): ReactNode {
  const { colors } = useTheme();
  const toast = useToast();

  const status = useCalendarStore((s) => s.status);
  const isBusy = useCalendarStore((s) => s.isBusy);
  const connect = useCalendarStore((s) => s.connect);

  const handleConnect = useCallback(async (): Promise<void> => {
    try {
      await connect();
      // connect는 성공/취소 모두 throw하지 않는다. 결과는 store의 최신 status로 판별한다.
      // (취소면 connected로 바뀌지 않으므로 토스트를 띄우지 않는다.)
      const nextStatus = useCalendarStore.getState().status;
      if (nextStatus === 'connected') {
        toast.show({
          tone: 'success',
          title: t('calendar.toast.connectSuccess'),
        });
      }
    } catch (error) {
      // 실제 연결 오류만 여기로 온다(취소는 throw하지 않음).
      const message =
        error instanceof Error ? error.message : t('calendar.toast.connectError');
      console.error('[CalendarConnectPrompt] 연결 실패:', message);
      toast.show({
        tone: 'danger',
        title: t('calendar.toast.connectError'),
      });
    }
  }, [connect, toast]);

  return (
    <View style={styles.container}>
      <EmptyState
        icon="calendar"
        title={t('calendar.connect.title')}
        body={t('calendar.connect.body')}
        action={{
          label: isBusy ? t('calendar.connecting') : t('calendar.connect.button'),
          // EmptyState 버튼은 동기 콜백 시그니처라, 비동기 연결은 fire-and-forget으로 감싼다.
          onPress: () => {
            void handleConnect();
          },
        }}
      />

      {/* 마지막 시도가 실패한 상태면 오류 안내 + 재시도 버튼을 덧붙인다. */}
      {status === 'error' ? (
        <View style={styles.errorBlock}>
          <Text style={[styles.errorTitle, { color: colors.danger }]}>
            {t('calendar.error.title')}
          </Text>
          <Button
            variant="secondary"
            size="md"
            onPress={() => {
              void handleConnect();
            }}
            disabled={isBusy}
            accessibilityLabel={t('calendar.error.retry')}
          >
            {t('calendar.error.retry')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorBlock: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  errorTitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('body'),
    textAlign: 'center',
  },
});
