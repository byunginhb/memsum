import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { CropFrame } from '@/design/components/CropFrame/CropFrame';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Text } from '@/design/components/Text/Text';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { spacing } from '@/design/tokens';
import { dayParts } from '@/features/captures/capture-format';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

import { MonoDay } from './MonoDay';

/** 오늘 날짜를 담는 빈 프레임 크기 — 달력 한 장 느낌의 세로형. */
const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 88;

/**
 * 캘린더 미연결 안내(명세 §6 빈 상태 규칙): 왼쪽 정렬 헤드라인 + 할 일 버튼 하나.
 * 중앙 정렬 원형 아이콘 대신, 크롭 모서리 프레임 안에 오늘 날짜를 mono로 둔다.
 *
 * 버튼은 store.connect()를 기다린 뒤 최신 status로 결과를 가른다.
 * - 연결 성공: success 토스트 / 사용자 취소: 무토스트 / 실제 오류: danger 토스트
 * 마지막 시도가 실패(status 'error')했으면 같은 버튼이 "다시 연결"이 되고 위에 이유를 한 줄 둔다.
 */
export function CalendarConnectPrompt(): ReactNode {
  const toast = useToast();

  const status = useCalendarStore((s) => s.status);
  const isBusy = useCalendarStore((s) => s.isBusy);
  const connect = useCalendarStore((s) => s.connect);

  const today = dayParts(new Date().toISOString());
  const hasError = status === 'error';

  const handleConnect = useCallback(async (): Promise<void> => {
    try {
      await connect();
      // 취소면 connected로 바뀌지 않으므로 토스트를 띄우지 않는다.
      if (useCalendarStore.getState().status === 'connected') {
        toast.show({ tone: 'success', title: t('calendar.toast.connectSuccess') });
      }
    } catch (error) {
      console.error('[CalendarConnectPrompt] 연결 실패:', error);
      toast.show({ tone: 'danger', title: t('calendar.toast.connectError') });
    }
  }, [connect, toast]);

  const buttonLabel = isBusy
    ? t('calendar.connecting')
    : hasError
      ? t('calendar.error.retry')
      : t('calendar.connect.button');

  return (
    <View style={styles.container}>
      <CropFrame width={FRAME_WIDTH} height={FRAME_HEIGHT} color="textSecondary" style={styles.frame}>
        {today ? (
          <View
            style={styles.frameInner}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Eyebrow>{today.month}</Eyebrow>
            <MonoDay day={today.day} />
          </View>
        ) : null}
      </CropFrame>

      <View style={styles.texts}>
        <Eyebrow>{t('calendar.connect.eyebrow')}</Eyebrow>
        <Text variant="title" accessibilityRole="header">
          {t('calendar.connect.title')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('calendar.connect.body')}
        </Text>
        {hasError ? (
          // 라이트 danger는 종이 바탕 작은 글씨 AA에 살짝 못 미쳐, 글씨는 잉크·색은 아이콘이 맡는다.
          <View style={styles.errorLine} accessibilityLiveRegion="polite">
            <Icon name="alert-circle" size={20} color="danger" />
            <Text variant="bodyStrong" style={styles.errorText}>
              {t('calendar.error.title')}
            </Text>
          </View>
        ) : null}
      </View>

      <Button
        variant="primary"
        onPress={() => void handleConnect()}
        loading={isBusy}
        accessibilityLabel={buttonLabel}
      >
        {buttonLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameInner: {
    alignItems: 'center',
  },
  errorLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  errorText: {
    flex: 1,
  },
  texts: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
});
