import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';

import { CAPTURE_THUMB_ASPECT } from './CaptureCard';
import { GRID_ROW_GAP } from './grid';

/** 숨쉬기 하한 불투명도 — 너무 깜빡이지 않게 얕게. */
const PULSE_MIN = 0.55;

type SkeletonBlockProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  rounded?: keyof typeof radius;
  style?: StyleProp<ViewStyle>;
};

/**
 * 스켈레톤 한 덩어리(bgMuted). 천천히 숨쉬듯 흐려졌다 돌아오고,
 * 모션 줄이기면 멈춘 채 둔다. 장식이라 스크린리더에서 숨긴다(상위가 진행 라벨을 단다).
 */
export function SkeletonBlock({
  width = '100%',
  height,
  aspectRatio,
  rounded = 'sm',
  style,
}: SkeletonBlockProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(PULSE_MIN, { duration: motion.duration.lazy * 2, easing: motion.easing.standard }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [reducedMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, aspectRatio, borderRadius: radius[rounded], backgroundColor: colors.bgMuted },
        animatedStyle,
        style,
      ]}
    />
  );
}

type CaptureGridSkeletonProps = {
  /** 셀 한 칸 폭(px). 실제 그리드와 같은 값. */
  cellWidth: number;
  columns: number;
  rows?: number;
  gap: number;
  /** 진행 라벨(i18n). */
  accessibilityLabel: string;
};

/** 3열 캡처 그리드 자리 표시 — 실제 CaptureCard와 같은 비율(썸네일 3:4 + 두 줄). */
export function CaptureGridSkeleton({
  cellWidth,
  columns,
  rows = 3,
  gap,
  accessibilityLabel,
}: CaptureGridSkeletonProps): ReactNode {
  const count = columns * rows;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[styles.grid, { columnGap: gap, rowGap: GRID_ROW_GAP }]}
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={{ width: cellWidth, gap: spacing.xs }}>
          <SkeletonBlock aspectRatio={CAPTURE_THUMB_ASPECT} rounded="md" />
          <SkeletonBlock width="80%" height={spacing.md} style={styles.firstLine} />
          <SkeletonBlock width="40%" height={spacing.sm} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  firstLine: {
    marginTop: spacing.xs,
  },
});
