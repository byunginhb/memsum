import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';

/**
 * 스플래시 노출 시간(ms). 네이티브 스플래시(라벤더+점)에서 이어받아 점 애니메이션을
 * 끝까지 보여주는 시간.
 *
 * why 1500: DotsGrid 9점 애니메이션은 (stagger 50ms × 8 = 400ms) 이후
 * - 마지막 점 등장(opacity fast 150ms) ≈ 550ms
 * - 우하단 코랄 전환(slow 300 + base 200) ≈ 900ms
 * - bouncy 스프링(damping12/stiffness220, ζ≈0.40) 정착 ≈ 1070ms
 * 에 끝난다. 1000ms면 점이 아직 튕기는 중에 전환돼 "다 뜨기 전에 넘어가는" 느낌이라,
 * 1500ms로 두어 점이 모두 정착·코랄 전환까지 끝난 완성 로고를 잠깐 보여준 뒤 넘어간다.
 */
const SPLASH_HOLD_MS = 1500;

/** 페이드아웃 시간(ms). 짧게 둬 빠르게 앱으로 넘어가게 한다. */
const SPLASH_FADE_MS = 240;

/** 로고(9닷) 크기 px. */
const LOGO_SIZE = 140;

type AnimatedSplashProps = {
  /** 페이드아웃 완료 시 호출 — 상위가 오버레이를 언마운트한다. */
  onFinish: () => void;
};

/**
 * 애니메이션 스플래시 오버레이.
 *
 * 네이티브 스플래시(app.json: 라벤더 배경 + 9닷 아이콘)가 즉시 떠 있는 동안 첫 JS 프레임에서
 * 같은 라벤더 배경 위에 DotsGrid(animated)를 그려 자연스럽게 이어받는다. 점들이 흩어진
 * 위치에서 spring으로 정렬되고 우하단 점이 코랄로 전환되는 브랜드 모션을 1회 재생한 뒤,
 * SPLASH_HOLD_MS 후 페이드아웃하며 onFinish로 앱에 자리를 내준다.
 *
 * reduce-motion이 켜져 있으면 DotsGrid가 정적 그리드를 보여주고, 페이드도 즉시 처리한다.
 * 색은 테마 토큰(colors.primary)만 사용한다.
 */
export function AnimatedSplash({ onFinish }: AnimatedSplashProps): ReactNode {
  const { colors } = useTheme();
  const opacity = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  // onFinish를 ref에 담아 타이머 effect 의존성에서 제외한다.
  // why: 의존성에 두면 상위가 콜백을 안정화하지 않을 때 타이머가 재설정돼
  // "마운트당 1회만 재생" 계약이 깨질 수 있다(안전망).
  // ref 갱신은 렌더 중이 아니라 effect에서 한다(react-hooks/refs 규칙 준수).
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  useEffect(() => {
    // HOLD 동안 점 애니메이션을 보여준 뒤 페이드아웃 → 완료 콜백으로 언마운트 신호.
    const fadeDuration = reducedMotion ? 0 : SPLASH_FADE_MS;
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: fadeDuration }, (finished) => {
        if (finished) {
          runOnJS(onFinishRef.current)();
        }
      });
    }, SPLASH_HOLD_MS);

    return () => clearTimeout(timer);
  }, [opacity, reducedMotion]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { backgroundColor: colors.primary },
        fadeStyle,
      ]}
      // 노출 중에는 뒤 화면(로딩 중) 터치를 막는다. 페이드 후 상위가 언마운트한다.
      pointerEvents="auto"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* rounded={false}: 라벤더 전체화면 위라 둥근 배경 사각형은 불필요(점만 보이게). */}
      <DotsGrid size={LOGO_SIZE} animated rounded={false} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
