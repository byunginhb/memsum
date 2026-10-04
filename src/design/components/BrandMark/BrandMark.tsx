import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius } from '@/design/tokens';

export type BrandMarkVariant = 'plain' | 'tile';

export type BrandMarkProps = {
  /** 한 변 길이(px). 기본 96. */
  size?: number;
  /**
   * plain: 투명 바탕 + 잉크색 모서리(종이 위 로고).
   * tile: 코발트 둥근 사각형 + 종이색 모서리(앱 아이콘과 같은 모양). 기본 plain.
   */
  variant?: BrandMarkVariant;
  /** 마운트 시 모서리가 조여 들고 형광펜이 그어지는 등장 모션(1회). */
  animated?: boolean;
  /** 등장 시작 지연(ms). 스플래시에서 스캔 뒤에 긋게 할 때. */
  delay?: number;
  /** 지정하면 이미지로 읽힌다. 없으면 장식으로 숨긴다. */
  accessibilityLabel?: string;
};

/**
 * 마크 기하(1 = 한 변). scripts/gen-icons.mjs와 같은 비율을 쓴다 — 바꾸면 둘 다 바꿀 것.
 * 프레임: 가운데 정사각형, 모서리는 L자 둥근 끝 선. 막대: 프레임 가운데를 가로지르는 기울어진 형광펜.
 */
export const BRAND_MARK_GEOMETRY = {
  /** tile 바탕 모서리 반경(캔버스 대비). */
  tileRadius: 0.22,
  /** 프레임 한 변(캔버스 대비). */
  frame: 0.62,
  /** L자 한 변 길이(캔버스 대비). */
  corner: 0.2,
  /** 선 두께(캔버스 대비). */
  stroke: 0.065,
  /** 형광펜 막대 너비·높이(캔버스 대비). */
  barWidth: 0.5,
  barHeight: 0.15,
  /** 막대 모서리 반경(막대 높이 대비). */
  barRadius: 0.12,
  /** 막대 기울기(도, 막대 중심 기준). */
  barRotate: -8,
} as const;

/** 모서리 등장 시 시작 배율(바깥에서 조여 든다). */
const CORNER_START_SCALE = 1.18;

function cornersPath(size: number): string {
  const g = BRAND_MARK_GEOMETRY;
  const half = (size * g.frame) / 2;
  const c = size / 2;
  const l = size * g.corner;
  const a = c - half;
  const b = c + half;
  return [
    `M ${a} ${a + l} L ${a} ${a} L ${a + l} ${a}`,
    `M ${b - l} ${a} L ${b} ${a} L ${b} ${a + l}`,
    `M ${b} ${b - l} L ${b} ${b} L ${b - l} ${b}`,
    `M ${a + l} ${b} L ${a} ${b} L ${a} ${b - l}`,
  ].join(' ');
}

/**
 * BrandMark — 브랜드 마크: 크롭 모서리 4개 + 가로지르는 기울어진 형광펜 막대.
 * 9점 로고(DotsGrid)를 대체한다. 모션 줄이기면 등장 모션 없이 최종 모양.
 */
export function BrandMark({
  size = 96,
  variant = 'plain',
  animated = false,
  delay = 0,
  accessibilityLabel,
}: BrandMarkProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animated && !reducedMotion;

  const corners = useSharedValue(shouldAnimate ? 0 : 1);
  const bar = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) {
      corners.value = 1;
      bar.value = 1;
      return;
    }
    corners.value = withDelay(delay, withSpring(1, motion.spring.gentle));
    bar.value = withDelay(
      delay + motion.duration.slow,
      withTiming(1, { duration: motion.duration.marker, easing: motion.easing.decel }),
    );
    return () => {
      cancelAnimation(corners);
      cancelAnimation(bar);
    };
  }, [shouldAnimate, delay, corners, bar]);

  const cornersStyle = useAnimatedStyle(() => ({
    opacity: interpolate(corners.value, [0, 0.4], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(corners.value, [0, 1], [CORNER_START_SCALE, 1]) }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: bar.value }],
  }));

  const isTile = variant === 'tile';
  const g = BRAND_MARK_GEOMETRY;
  const barWidth = size * g.barWidth;
  const barHeight = size * g.barHeight;

  return (
    <View
      accessible={accessibilityLabel != null}
      accessibilityRole={accessibilityLabel != null ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={accessibilityLabel == null}
      importantForAccessibility={accessibilityLabel == null ? 'no-hide-descendants' : 'auto'}
      style={{
        width: size,
        height: size,
        borderRadius: isTile ? size * g.tileRadius : radius.none,
        backgroundColor: isTile ? colors.primary : 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* 기울기는 바깥에서 가운데 기준으로, 긋기(scaleX)는 안에서 왼쪽 기준으로 — 아이콘 SVG와 같은 자리. */}
      <View
        style={[
          styles.barSlot,
          {
            width: barWidth,
            height: barHeight,
            left: (size - barWidth) / 2,
            top: (size - barHeight) / 2,
            transform: [{ rotate: `${g.barRotate}deg` }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.bar,
            { borderRadius: barHeight * g.barRadius, backgroundColor: colors.marker },
            barStyle,
          ]}
        />
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, cornersStyle]}>
        <Svg width={size} height={size}>
          <Path
            d={cornersPath(size)}
            stroke={isTile ? colors.barFg : colors.textPrimary}
            strokeWidth={size * g.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  barSlot: {
    position: 'absolute',
  },
  bar: {
    flex: 1,
    transformOrigin: 'left center',
  },
});
