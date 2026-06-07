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
    // ⭐ 일요일 5줄 리포트(Hero Moment) stagger 전용 — design.md §11.
    ritual: 1200,
  },
  // 리스트/그리드 순차 등장 간격(ms) — DotsGrid 9점, 카드 stagger 등. design.md §11-4.
  stagger: 50,
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
