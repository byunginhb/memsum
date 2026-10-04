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
import type { SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';
import type { ParcelLevel } from '@/features/parcel/types';

type ParcelProgressProps = {
  /** 현재 진행 단계(1~6). 0(미조회)이면 모든 점이 빈 상태. */
  level: ParcelLevel;
};

/** 배송 단계 수(준비·집화·배송중·지점·출발·완료). */
const STEPS = [1, 2, 3, 4, 5, 6] as const;
const STEP_COUNT = STEPS.length;

/** 점 지름 — 현재 단계는 크게(색에 기대지 않는 위치 단서). */
const DOT_SIZE = 10;
const CURRENT_DOT_SIZE = 14;
/** 빈 점 테두리·연결선 두께. */
const STROKE = 2;

/**
 * ParcelProgress — 1~6 진행 점 + 연결선.
 *
 * 빈 점은 테두리만, 도달한 점은 속이 차오른다(채움 여부 자체가 색 비의존 단서).
 * 마운트 시 왼쪽부터 점과 선이 차례로 채워진다 — 점 하나 채우고 다음 선을 긋는 식.
 * 도달 색은 코발트, 완료(6)면 전 구간 success. 모션 줄이기면 즉시 최종 상태.
 */
export function ParcelProgress({ level }: ParcelProgressProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const reachedColor = level >= STEP_COUNT ? colors.success : colors.primary;

  // 채워질 칸 수: 점 level개 + 그 사이 선 (level-1)개. 0~(2*STEP_COUNT-1).
  const target = Math.max(0, level * 2 - 1);
  const fill = useSharedValue(reducedMotion ? target : 0);

  useEffect(() => {
    if (reducedMotion) {
      fill.value = target;
      return;
    }
    // 한 칸(점 또는 선)당 motion.stagger 간격으로 흐르듯 채운다.
    fill.value = withDelay(
      motion.duration.fast,
      withTiming(target, {
        duration: Math.max(motion.duration.base, target * motion.stagger * 2),
        easing: motion.easing.standard,
      }),
    );
    return () => cancelAnimation(fill);
  }, [reducedMotion, target, fill]);

  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no">
      {STEPS.map((step, index) => {
        const isCurrent = level === step;
        const size = isCurrent ? CURRENT_DOT_SIZE : DOT_SIZE;
        // 점 k(0-base)는 칸 2k, 그 뒤 선은 칸 2k+1.
        const dotSlot = index * 2;
        return (
          <View key={step} style={[styles.segment, index === STEP_COUNT - 1 ? styles.last : null]}>
            <View
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderColor: level >= step ? reachedColor : colors.borderStrong,
                },
              ]}
            >
              <Fill progress={fill} slot={dotSlot} color={reachedColor} axis="scale" />
            </View>
            {index < STEP_COUNT - 1 ? (
              <View style={[styles.line, { backgroundColor: colors.border }]}>
                <Fill progress={fill} slot={dotSlot + 1} color={reachedColor} axis="scaleX" />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * 칸 하나의 채움. progress가 slot을 지나는 동안 0→1로 자란다.
 * 점은 가운데서 커지고(scale), 선은 왼쪽에서 오른쪽으로 그어진다(scaleX).
 */
function Fill({
  progress,
  slot,
  color,
  axis,
}: {
  progress: SharedValue<number>;
  slot: number;
  color: string;
  axis: 'scale' | 'scaleX';
}): ReactNode {
  const style = useAnimatedStyle(() => {
    const t = Math.min(1, Math.max(0, progress.value - slot));
    return axis === 'scale' ? { transform: [{ scale: t }] } : { transform: [{ scaleX: t }] };
  });
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        axis === 'scale' ? styles.dotFill : styles.lineFill,
        { backgroundColor: color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  // 마지막 칸(점 하나)은 내용 폭 그대로. flex: 0만 주면 웹에서 기준 폭이 0%로 남아
  // 점이 오른쪽 여백 밖으로 밀린다.
  last: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: 'auto',
  },
  dot: {
    borderRadius: radius.pill,
    borderWidth: STROKE,
    overflow: 'hidden',
  },
  dotFill: {
    borderRadius: radius.pill,
  },
  line: {
    flex: 1,
    height: STROKE,
    marginHorizontal: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  lineFill: {
    transformOrigin: 'left center',
  },
});
