import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { ListItem } from '@/design/components/ListItem/ListItem';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, typography } from '@/design/tokens';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

/**
 * 구글 캘린더 연결/해제 행 — 설정 "연동" 섹션 (C2).
 *
 * 연결 상태(useCalendarStore.status)에 따라 subtitle·trailing·onPress 동작이 갈린다.
 * - 미연결: 탭하면 OAuth 연결(connect) 시도 → 결과(연결/취소/실패)에 따라 토스트 분기.
 * - 연결됨: 탭하면 파괴적 확인 Alert → 동의 시 disconnect.
 * 진행 중(isBusy)에는 중복 탭을 무시한다.
 */
export function GoogleCalendarRow(): ReactNode {
  const { colors } = useTheme();
  const toast = useToast();

  const status = useCalendarStore((state) => state.status);
  const email = useCalendarStore((state) => state.email);
  const hydrated = useCalendarStore((state) => state.hydrated);
  const isBusy = useCalendarStore((state) => state.isBusy);
  const restore = useCalendarStore((state) => state.restore);
  const connect = useCalendarStore((state) => state.connect);
  const disconnect = useCalendarStore((state) => state.disconnect);

  // why: 토큰 복원(restore)은 앱 어디선가 1회는 호출돼야 status가 idle을 벗어난다.
  // 이 행이 마운트될 때 멱등 호출해 둔다(이미 hydrated면 건너뜀).
  useEffect(() => {
    if (!hydrated) {
      void restore();
    }
  }, [hydrated, restore]);

  const isConnected = status === 'connected';

  // 미연결 → OAuth 연결 플로우. 결과별 토스트 분기(취소는 무토스트).
  const handleConnect = useCallback(async () => {
    try {
      await connect();
      // connect 후 store의 status가 connected면 성공. 취소면 이전 상태로 복귀해
      // connected가 아니므로 토스트를 띄우지 않는다(취소는 오류가 아님).
      if (useCalendarStore.getState().status === 'connected') {
        toast.show({ tone: 'success', title: t('calendar.toast.connectSuccess') });
      }
    } catch (error) {
      // 보안: 토큰 등 민감 정보는 store에서만 다루고, 여기선 메시지만 로깅한다.
      console.error('[GoogleCalendarRow] 연결 실패:', error);
      toast.show({ tone: 'danger', title: t('calendar.toast.connectError') });
    }
  }, [connect, toast]);

  // 연결됨 → 파괴적 확인 Alert. 동의 시에만 disconnect.
  const handleDisconnect = useCallback(() => {
    Alert.alert(
      t('calendar.disconnect.confirmTitle'),
      t('calendar.disconnect.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('calendar.disconnect.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
              toast.show({ tone: 'info', title: t('calendar.toast.disconnected') });
            } catch (error) {
              console.error('[GoogleCalendarRow] 연결 해제 실패:', error);
              toast.show({ tone: 'danger', title: t('calendar.toast.connectError') });
            }
          },
        },
      ],
    );
  }, [disconnect, toast]);

  const handlePress = useCallback(() => {
    // 진행 중이면 중복 동작 방지.
    if (isBusy) {
      return;
    }
    if (isConnected) {
      handleDisconnect();
      return;
    }
    void handleConnect();
  }, [isBusy, isConnected, handleConnect, handleDisconnect]);

  // 연결됨이면 계정 이메일(없으면 "연결됨"), 미연결이면 "연결 안 됨" 안내.
  const subtitle = isConnected
    ? email ?? t('settings.googleCalendar.connected')
    : t('settings.googleCalendar.connect');

  // 연결됨이면 "연결 해제" 텍스트(secondary), 미연결이면 chevron.
  const trailing = isConnected ? (
    <Text
      style={[styles.disconnectLabel, { color: colors.textSecondary }]}
      numberOfLines={1}
    >
      {t('settings.googleCalendar.disconnect')}
    </Text>
  ) : (
    <Icon name="chevron-right" size={20} color="textSecondary" />
  );

  return (
    <ListItem
      leading={<Icon name="calendar" size={24} color="textPrimary" />}
      title={t('settings.googleCalendar.title')}
      subtitle={subtitle}
      trailing={trailing}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  disconnectLabel: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    letterSpacing: letterSpacingFor('bodySm'),
  },
});
