import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius } from '@/design/tokens';
import { t } from '@/i18n';

type DotsGridProps = {
  /** 컴포넌트 전체 크기(정방형 기준). 기본 96. */
  size?: number;
  /** true면 마운트 시 9점 spring 정렬 애니메이션 재생 (1회). */
  animated?: boolean;
  /** true면 라벤더 둥근사각형 배경 표시. 기본 true. */
  rounded?: boolean;
};

/** 그리드 열/행 수 (3×3). */
const GRID = 3;
/** 점 개수 (9). */
const DOT_COUNT = GRID * GRID;
/** 우하단 점 인덱스 (0-indexed, row-major). */
const ACCENT_INDEX = DOT_COUNT - 1;

/**
 * size 기준 파생 치수 계산.
 * 브랜드.md §3 SVG: 1024×1024 기준 점 직경 100px, 간격 110px, 패딩 비례.
 */
function deriveMetrics(size: number) {
  const dotDiameter = size * 0.18;
  const gap = size * 0.14;
  // 3×3 그리드 전체 너비 = 3*dotDiameter + 2*gap
  const gridSpan = GRID * dotDiameter + (GRID - 1) * gap;
  const gridOffset = (size - gridSpan) / 2;
  return { dotDiameter, gap, gridSpan, gridOffset };
}

/**
 * 3×3 그리드에서 점 i의 최종 위치 (left, top).
 * row-major 순서: i=0 → 좌상단, i=8 → 우하단.
 */
function finalPosition(
  i: number,
  dotDiameter: number,
  gap: number,
  gridOffset: number,
): { x: number; y: number } {
  const col = i % GRID;
  const row = Math.floor(i / GRID);
  return {
    x: gridOffset + col * (dotDiameter + gap),
    y: gridOffset + row * (dotDiameter + gap),
  };
}

/**
 * 마운트 시 각 점의 초기 오프셋 (무작위 흩어진 위치).
 * animated=false 또는 초기 렌더에서도 최종 위치는 올바른 그리드여야 하므로,
 * 오프셋을 상대치로 적용하고 최종값을 0으로 수렴시킨다.
 * 시드 기반 의사-무작위(Math.sin)으로 매 렌더 동일하게 결정론적으로 생성.
 */
function initialOffset(i: number, size: number): { x: number; y: number } {
  const range = size * 0.28;
  // 결정론적 의사-무작위: 각 인덱스마다 다른 값
  const x = Math.sin(i * 47.3 + 1.1) * range;
  const y = Math.cos(i * 31.7 + 2.3) * range;
  return { x, y };
}

/** 점 1개 애니메이션 로직 — 오프셋 SharedValue를 들고 animated style 반환. */
function AnimatedDot({
  index,
  dotDiameter,
  gap,
  gridOffset,
  size,
  isAccent,
  animated,
  primaryColor,
  onPrimaryColor,
  accentColor,
}: {
  index: number;
  dotDiameter: number;
  gap: number;
  gridOffset: number;
  size: number;
  isAccent: boolean;
  animated: boolean;
  primaryColor: string;
  onPrimaryColor: string;
  accentColor: string;
}): ReactNode {
  const pos = finalPosition(index, dotDiameter, gap, gridOffset);
  const offset = initialOffset(index, size);

  // 위치 오프셋 SharedValue — 최종 목표는 0
  const translateX = useSharedValue(animated ? offset.x : 0);
  const translateY = useSharedValue(animated ? offset.y : 0);
  // 투명도 — 시작 0, 목표 1
  const opacity = useSharedValue(animated ? 0 : 1);
  // 마지막 점 색 전환: 0 = onPrimary(흰색), 1 = accent(코랄).
  // 비애니메이션(또는 reduce-motion) 시엔 즉시 최종 코랄 상태로 둔다.
  const colorProgress = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;

    // 스태거 delay = i * stagger(50ms) — design.md §11-4.
    const staggerDelay = index * motion.stagger;

    translateX.value = withDelay(
      staggerDelay,
      withSpring(0, motion.spring.bouncy),
    );
    translateY.value = withDelay(
      staggerDelay,
      withSpring(0, motion.spring.bouncy),
    );
    opacity.value = withDelay(
      staggerDelay,
      withTiming(1, { duration: motion.duration.fast }),
    );

    // 마지막(우하단) 점 흰색 → 코랄 전환 (design.md §28: 정렬 완료 후 200ms)
    if (isAccent) {
      const accentDelay = staggerDelay + motion.duration.slow; // 정렬 완료 후 전환
      colorProgress.value = withDelay(
        accentDelay,
        withTiming(1, { duration: motion.duration.base }),
      );
    }

    // 언마운트 시 진행 중인 애니메이션 취소(reanimated worklet 잔존 방지).
    return () => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(opacity);
      cancelAnimation(colorProgress);
    };
  }, [animated, index, isAccent, translateX, translateY, opacity, colorProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  // 색 interpolation — worklet 안에서 hex 직접 조합 대신 opacity 레이어 방식 사용.
  // onPrimary 레이어 위에 accent 레이어를 colorProgress.value opacity로 올림.
  const accentLayerStyle = useAnimatedStyle(() => ({
    opacity: colorProgress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          width: dotDiameter,
          height: dotDiameter,
          borderRadius: dotDiameter / 2,
          backgroundColor: onPrimaryColor,
        },
        animatedStyle,
      ]}
    >
      {/* 코랄 전환 레이어 — accent 색 원을 위에 올리고 opacity로 페이드인 */}
      {isAccent ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: dotDiameter / 2,
              backgroundColor: accentColor,
            },
            accentLayerStyle,
          ]}
        />
      ) : null}
    </Animated.View>
  );
}

/**
 * DotsGrid — 브랜드 로고 일러스트 / Empty State 모티프
 *
 * 브랜드.md §3 + 디자인시스템.md §7-4:
 * - 라벤더(primary) 배경 둥근사각형 + 3×3 흰(onPrimary) 점
 * - 우하단 점 1개 코랄(accent)
 * - animated=true: 마운트 시 흩어진 위치·opacity0 → 정위치 spring 이동 (1회)
 *   stagger delay i*50ms, spring bouncy(damping12/stiffness220)
 *   마지막 점 흰→코랄 200ms transition
 *
 * 색은 모두 useTheme 토큰 사용 (hex 직접 금지).
 * animated 실패해도 정적 그리드가 보이도록 초기값을 최종 위치 근방에 둔다.
 */
export function DotsGrid({
  size = 96,
  animated = false,
  rounded = true,
}: DotsGridProps): ReactNode {
  const { colors } = useTheme();
  const { dotDiameter, gap, gridOffset } = deriveMetrics(size);

  const bgRadius = rounded ? radius.xl : 0;

  // 접근성: reduce-motion이 켜져 있으면 애니메이션을 끄고 즉시 최종 그리드를 보여준다.
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  return (
    <View
      accessible
      accessibilityLabel={t('home.title')}
      accessibilityRole="image"
      style={{
        width: size,
        height: size,
        borderRadius: bgRadius,
        backgroundColor: colors.primary,
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <AnimatedDot
          key={i}
          index={i}
          dotDiameter={dotDiameter}
          gap={gap}
          gridOffset={gridOffset}
          size={size}
          isAccent={i === ACCENT_INDEX}
          animated={shouldAnimate}
          primaryColor={colors.primary}
          onPrimaryColor={colors.onPrimary}
          accentColor={colors.accent}
        />
      ))}
    </View>
  );
}
