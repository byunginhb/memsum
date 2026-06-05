import { Easing } from 'react-native-reanimated';

/**
 * 모션·애니메이션 토큰 — 디자인시스템.md §7
 *
 * duration: ms 단위. easing: reanimated Easing 함수. spring: withSpring config.
 * 모든 애니메이션은 이 토큰만 참조한다(매직 넘버 금지).
 */
export const motion = {
  duration: {
    instant: 80,
    fast: 150,
    base: 200,
    slow: 300,
    lazy: 500,
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    emphasized: Easing.bezier(0.3, 0, 0, 1),
    decel: Easing.out(Easing.cubic),
    accel: Easing.in(Easing.cubic),
  },
  spring: {
    snappy: { damping: 20, stiffness: 300 },
    gentle: { damping: 18, stiffness: 180 },
    bouncy: { damping: 12, stiffness: 220 },
  },
} as const;

export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;
export type MotionSpring = keyof typeof motion.spring;
