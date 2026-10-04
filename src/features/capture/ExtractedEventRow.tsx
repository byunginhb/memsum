import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';
import { t } from '@/i18n';

import { formatEventWhen } from './event-format';
import type { CaptureEvent } from './types';

/** 왼쪽 시각 열 폭(mono "10.06"/"Oct 12"). */
const WHEN_COLUMN = 72;
/** 형광펜이 날짜 글자 좌우로 삐져나오는 폭. */
const MARK_BLEED = 3;

export type ExtractedEventRowProps = {
  event: CaptureEvent;
  /**
   * 형광펜이 날짜 뒤로 그어지기 시작하는 지연(ms). 생략하면 긋는 모션 없이 바로 칠해진 상태.
   * 캡처 시트는 행이 떠오르는 순간에 맞춰 긋는다("형광펜 박스에서 튀어나온" 느낌).
   */
  markDelay?: number;
};

/**
 * 뽑힌 일정 한 줄 — 왼쪽 mono 날짜(형광펜)·요일·시각, 오른쪽 제목·장소.
 * 캡처 시트 결과용. 상세 화면의 이벤트 카드도 이 행으로 맞추면 두 곳의 모양이 같아진다.
 */
export function ExtractedEventRow({ event, markDelay }: ExtractedEventRowProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const when = formatEventWhen(event.starts_at);
  const shouldAnimate = markDelay !== undefined && !reducedMotion;
  const mark = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) {
      mark.value = 1;
      return;
    }
    mark.value = withDelay(
      markDelay ?? 0,
      withTiming(1, { duration: motion.duration.marker, easing: motion.easing.decel }),
    );
    return () => cancelAnimation(mark);
  }, [shouldAnimate, markDelay, mark]);

  const markStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: mark.value }] }));

  const label = [t('capture.result.event'), event.title, when?.spoken, event.location]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={styles.when}>
        {when ? (
          <>
            <View style={styles.dateWrap}>
              <Animated.View
                style={[styles.mark, { backgroundColor: colors.marker }, markStyle]}
              />
              <Text variant="monoLg" color="onMarker">
                {when.date}
              </Text>
            </View>
            <Text variant="mono" color="textSecondary">
              {`${when.weekday} ${when.time}`}
            </Text>
          </>
        ) : (
          <Icon name="calendar" size={20} color="textSecondary" />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="headline" numberOfLines={2}>
          {event.title}
        </Text>
        {event.location ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {event.location}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  when: {
    width: WHEN_COLUMN,
    gap: spacing.xs,
  },
  dateWrap: {
    alignSelf: 'flex-start',
  },
  mark: {
    position: 'absolute',
    left: -MARK_BLEED,
    right: -MARK_BLEED,
    top: 0,
    bottom: 0,
    borderRadius: radius.sm / 2,
    transformOrigin: 'left center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
