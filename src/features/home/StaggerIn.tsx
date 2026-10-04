import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { motion, staggerDelay } from '@/design/tokens';

export type StaggerInProps = {
  /** 목록/섹션 순번. 지연은 staggerDelay(index) — 40ms 간격, 6개까지만 늦춘다. */
  index: number;
  /** 아래에서 올라오는 거리. 기본 motion.enterOffset(8px). */
  offset?: number;
  /** 추가 지연(ms). 예: 스캔이 끝난 뒤 결과 행이 이어서 뜨게. */
  baseDelay?: number;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * StaggerIn — 첫 진입 등장(아래→위 + 페이드, 명세 §5 "목록 등장").
 *
 * 마운트 시 1회만 움직인다. 다시 그려져도(데이터 갱신) 재생하지 않으므로 "첫 진입만" 규칙을 지킨다.
 * 모션 줄이기면 처음부터 최종 상태.
 */
export function StaggerIn({
  index,
  offset = motion.enterOffset,
  baseDelay = 0,
  style,
  children,
}: StaggerInProps): ReactNode {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      baseDelay + staggerDelay(index),
      withTiming(1, { duration: motion.duration.slow, easing: motion.easing.decel }),
    );
    return () => cancelAnimation(progress);
    // 첫 마운트 1회만 재생한다(index·delay가 나중에 바뀌어도 다시 움직이지 않는다).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * offset }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
