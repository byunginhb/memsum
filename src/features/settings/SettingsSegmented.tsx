import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';
import { t } from '@/i18n';

export type SegmentOption<T extends string> = {
  value: T;
  labelKey: string;
};

type SettingsSegmentedProps<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** 그룹 스크린리더 라벨(행 제목과 같게). */
  label: string;
};

/** 칸 높이 — 최소 터치 44. */
const SEGMENT_HEIGHT = 44;
/** 바깥 테두리와 선택 면 사이 여백. */
const INSET = 3;

/**
 * 설정용 N택 세그먼트 — 같은 너비의 칸 위로 선택 면(primaryMuted)이 레이아웃 스프링으로 미끄러진다.
 *
 * 바깥은 머리카락보다 한 단계 진한 rule 테두리만(채운 회색 트랙 대신). 선택 칸 글자는
 * 코발트 SemiBold, 나머지는 보조색 Regular — 굵기 차이가 색에 기대지 않는 단서가 된다.
 * 모션 줄이기면 선택 면이 즉시 옮겨진다. 각 칸은 radio 역할 + checked 상태로 읽힌다.
 */
export function SettingsSegmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: SettingsSegmentedProps<T>): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const measuredRef = useRef(false);

  const count = options.length;
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - INSET * 2) / count : 0;

  const x = useSharedValue(0);

  useEffect(() => {
    if (segmentWidth <= 0) return;
    const target = selectedIndex * segmentWidth;
    // 첫 측정 땐 제자리에 놓기만 한다(0에서 미끄러져 오는 어색함 방지).
    if (!measuredRef.current || reducedMotion) {
      measuredRef.current = true;
      x.value = target;
      return;
    }
    x.value = withSpring(target, motion.spring.layout);
  }, [selectedIndex, segmentWidth, reducedMotion, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent): void => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[styles.track, { borderColor: colors.borderStrong }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.indicator,
            { width: segmentWidth, backgroundColor: colors.primaryMuted },
            indicatorStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const isSelected = option.value === value;
        const optionLabel = t(option.labelKey);
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={optionLabel}
            style={styles.segment}
          >
            <Text
              variant={isSelected ? 'bodyStrong' : 'body'}
              color={isSelected ? 'primary' : 'textSecondary'}
              numberOfLines={1}
            >
              {optionLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: INSET,
  },
  indicator: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: INSET,
    borderRadius: radius.sm,
  },
  segment: {
    flex: 1,
    minHeight: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
});
