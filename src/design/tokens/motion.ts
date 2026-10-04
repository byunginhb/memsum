import { Easing } from 'react-native-reanimated';

/**
 * 모션·애니메이션 토큰 — docs/design/redesign-2026-10.md §5
 *
 * duration: ms 단위. easing: reanimated Easing 함수. spring: withSpring config.
 * 모든 애니메이션은 이 토큰만 참조한다(매직 넘버 금지).
 * useReducedMotion()이 켜져 있으면 모든 연출은 즉시 최종 상태로 둔다.
 */
export const motion = {
  duration: {
    instant: 80,
    fast: 150,
    base: 200,
    slow: 300,
    lazy: 500,
    /** 형광펜 한 줄이 왼→오로 그어지는 시간. */
    marker: 360,
    /** 숫자 카운트업. */
    count: 600,
    /** 스플래시용 축약 스캔. */
    scanShort: 600,
    /** 시그니처 스캔선이 위→아래로 훑는 시간. */
    scan: 900,
    /** 일요일 5줄 리포트 순위 연출 전체 길이. */
    ritual: 1200,
  },
  /** 목록 첫 진입 순차 등장 간격(ms). */
  stagger: 40,
  /** 순차 지연을 주는 최대 항목 수 — 그 뒤 항목은 마지막 지연과 같이 뜬다. */
  staggerMax: 6,
  /** 목록 첫 진입 시 아래에서 올라오는 거리(px). */
  enterOffset: 8,
  /** 스캔 후 형광펜 박스가 하나씩 그어지는 간격(ms). */
  markerStagger: 120,
  /** 눌림 배율(투명도 대신). */
  pressScale: 0.97,
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    emphasized: Easing.bezier(0.3, 0, 0, 1),
    decel: Easing.out(Easing.cubic),
    accel: Easing.in(Easing.cubic),
    /** 스캔선 — 일정한 속도에 가깝되 끝에서 살짝 감속. */
    scan: Easing.bezier(0.4, 0, 0.6, 1),
  },
  spring: {
    snappy: { damping: 20, stiffness: 300 },
    gentle: { damping: 18, stiffness: 180 },
    bouncy: { damping: 12, stiffness: 220 },
    /** PressableScale 눌림. 빠르게 들어가고 거의 튕기지 않는다. */
    press: { damping: 26, stiffness: 520, mass: 0.6 },
    /** 탭 인디케이터처럼 위치가 미끄러지는 레이아웃 이동. */
    layout: { damping: 22, stiffness: 260 },
  },
} as const;

export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;
export type MotionSpring = keyof typeof motion.spring;

/** 목록 i번째 항목의 등장 지연(ms). staggerMax 이후는 같은 지연으로 묶는다. */
export function staggerDelay(index: number): number {
  return Math.min(index, motion.staggerMax - 1) * motion.stagger;
}
