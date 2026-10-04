import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  cancelAnimation,
  useAnimatedReaction,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/design/components/Text/Text';
import type { TextProps } from '@/design/components/Text/Text';
import { motion } from '@/design/tokens';

export type CountUpProps = Omit<TextProps, 'children'> & {
  /** 최종 숫자. 바뀌면 이전 값에서 새 값으로 다시 센다. */
  value: number;
  /** 기본 motion.duration.count(600ms). */
  duration?: number;
  /** 표시 형식. 기본은 정수 그대로. 예: (n) => `${n}장`. */
  format?: (n: number) => string;
};

const defaultFormat = (n: number): string => String(n);

/**
 * CountUp — 숫자 카운트업(600ms, 감속). 기본 variant는 mega.
 *
 * 값은 UI 스레드에서 보간하고, 정수가 바뀔 때만 JS로 넘겨 다시 그린다.
 * 모션 줄이기면 즉시 최종 값. 스크린리더에는 최종 값만 읽힌다.
 */
export function CountUp({
  value,
  duration = motion.duration.count,
  format = defaultFormat,
  variant = 'mega',
  ...rest
}: CountUpProps): ReactNode {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? value : 0);
  const [shown, setShown] = useState(reducedMotion ? value : 0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = value;
      return;
    }
    progress.value = withTiming(value, { duration, easing: motion.easing.decel });
    return () => cancelAnimation(progress);
  }, [value, duration, reducedMotion, progress]);

  useAnimatedReaction(
    () => Math.round(progress.value),
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setShown, current);
    },
  );

  return (
    <Text variant={variant} accessibilityLabel={format(value)} {...rest}>
      {format(shown)}
    </Text>
  );
}
