import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius } from '@/design/tokens';

/** 펄스 한 번(밝아졌다 어두워짐)의 반 주기. 은은하게 느리게. */
const PULSE_HALF_MS = motion.duration.lazy * 2;
/** 펄스 최저 불투명도. 너무 깜빡이지 않게 1.0 ↔ 0.55 사이만 오간다. */
const PULSE_MIN = 0.55;

export type SkeletonBlockProps = {
  width?: DimensionValue;
  height: number;
  /** 기본 radius.sm. */
  rounded?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 스켈레톤 블록 — bgMuted 면에 은은한 펄스. 모션 줄이기면 정지한 면만.
 * 스크린리더에는 숨긴다(로딩 안내는 화면이 한 번만 알린다).
 */
export function SkeletonBlock({
  width = '100%',
  height,
  rounded = radius.sm,
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
      withTiming(PULSE_MIN, { duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
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
        { width, height, borderRadius: rounded, backgroundColor: colors.bgMuted },
        style,
        animatedStyle,
      ]}
    />
  );
}
