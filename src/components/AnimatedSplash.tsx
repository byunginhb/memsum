import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { BRAND_MARK_GEOMETRY, BrandMark } from '@/design/components/BrandMark/BrandMark';
import { useTheme } from '@/design/theme/useTheme';
import { motion } from '@/design/tokens';

/**
 * 마크 크기(pt). 네이티브 스플래시(app.json imageWidth 200 × splash-icon.png 안 타일 비율 0.6)와
 * 같은 크기여야 JS가 이어받을 때 마크가 튀지 않는다. scripts/gen-icons.mjs의 SPLASH_TILE과 짝.
 */
const MARK_SIZE = 120;
/** 스캔이 끝난 뒤 완성 마크를 잠깐 보여주는 시간. */
const SETTLE_MS = 300;
/** 페이드아웃 시간. */
const FADE_MS = 240;
/** 스캔선 두께·꼬리. */
const LINE_HEIGHT = 2;
const TAIL_HEIGHT = 28;
const TAIL_OPACITY = 0.24;

type AnimatedSplashProps = {
  /** 페이드아웃 완료 시 호출 — 상위가 오버레이를 언마운트한다. */
  onFinish: () => void;
};

/**
 * 애니메이션 스플래시 오버레이 — 축약 스캔(600ms).
 *
 * 네이티브 스플래시(라이트 paper / 다크 ink 바탕 + 코발트 타일 마크)를 첫 JS 프레임에서 같은 모습으로
 * 이어받고, 마크 위로 종이색 스캔선이 위→아래로 한 번 훑은 뒤 페이드아웃한다.
 * 모션 줄이기면 스캔 없이 짧게 보여주고 즉시 사라진다.
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const scan = useSharedValue(0);

  // onFinish를 ref에 담아 타이머 effect 재실행(=스플래시 재생 반복)을 막는다.
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    const finish = (): void => onFinishRef.current();
    const scanMs = reducedMotion ? 0 : motion.duration.scanShort;
    if (!reducedMotion) {
      scan.value = withTiming(1, { duration: scanMs, easing: motion.easing.scan });
    }
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: reducedMotion ? 0 : FADE_MS }, (finished) => {
        if (finished) scheduleOnRN(finish);
      });
    }, scanMs + SETTLE_MS);
    return () => clearTimeout(timer);
  }, [opacity, scan, reducedMotion]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * MARK_SIZE }],
    opacity: scan.value >= 1 ? 0 : 1,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.container, { backgroundColor: colors.bgBase }, fadeStyle]}
      // 노출 중에는 뒤 화면 터치를 막는다. 페이드 후 상위가 언마운트한다.
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.mark}>
        <BrandMark size={MARK_SIZE} variant="tile" />
        {reducedMotion ? null : (
          <Animated.View pointerEvents="none" style={[styles.scanner, scanStyle]}>
            <View style={[styles.line, { backgroundColor: colors.barFg }]} />
            <Svg width={MARK_SIZE} height={TAIL_HEIGHT}>
              <Defs>
                <LinearGradient id="splashTail" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={colors.barFg} stopOpacity={TAIL_OPACITY} />
                  <Stop offset="1" stopColor={colors.barFg} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width={MARK_SIZE} height={TAIL_HEIGHT} fill="url(#splashTail)" />
            </Svg>
          </Animated.View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    // 스캔선이 타일 밖으로 나가지 않게(타일 모서리 반경과 같은 비율).
    borderRadius: MARK_SIZE * BRAND_MARK_GEOMETRY.tileRadius,
    overflow: 'hidden',
  },
  scanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  line: {
    height: LINE_HEIGHT,
  },
});
