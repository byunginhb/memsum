import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { GestureResponderEvent, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { motion } from '@/design/tokens';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  /** 눌렸을 때 배율. 기본 motion.pressScale(0.97). */
  scaleTo?: number;
  /** 바깥 Pressable이 아니라 줄어드는 내부 면에 적용된다(배경·반경·패딩 등). */
  style?: StyleProp<ViewStyle>;
  /** 바깥 터치 영역의 레이아웃(flex·width·margin 등). 정적 스타일만 받는다. */
  containerStyle?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/**
 * PressableScale — 눌림 피드백 공용 컴포넌트.
 *
 * 투명도 대신 scale 스프링으로 눌림을 보여준다. 모션 줄이기가 켜져 있으면 크기를 바꾸지 않는다.
 * 시각 스타일은 내부 Animated.View에 둔다: NativeWind로 감싼 Pressable은 함수형/인라인
 * backgroundColor·flex 일부를 누락하는 이력이 있어(Button·BottomBar 주석 참고) 바깥은 터치만 맡긴다.
 */
export function PressableScale({
  scaleTo = motion.pressScale,
  style,
  containerStyle,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps): ReactNode {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePressIn = (e: GestureResponderEvent): void => {
    if (!reducedMotion && !disabled) {
      scale.value = withSpring(scaleTo, motion.spring.press);
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent): void => {
    scale.value = reducedMotion ? 1 : withSpring(1, motion.spring.press);
    onPressOut?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={containerStyle}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
