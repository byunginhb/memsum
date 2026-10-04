import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { motion, typography } from '@/design/tokens';
import type { SemanticColorName, TextVariant } from '@/design/tokens';

export type MarkedProps = {
  /** 문장 전체. 예: t('home.headline', { n: 4 }) → "이번 주, 일정 4개를 건졌어요". */
  text: string;
  /** text 안에서 형광펜을 칠할 구절(첫 번째 일치). 없거나 못 찾으면 그냥 문장만 그린다. */
  mark?: string;
  /** 기본 display. */
  variant?: TextVariant;
  /** 형광펜 밖 글자 색. 형광펜 위 글자는 항상 onMarker(ink). */
  color?: SemanticColorName;
  /** 등장 시 왼→오로 그어지는 모션. 기본 true. 모션 줄이기면 무시하고 즉시 칠한다. */
  animate?: boolean;
  /** 긋기 시작 지연(ms). */
  delay?: number;
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
};

/** 형광펜 높이 = 글자 크기의 70%. */
const MARK_HEIGHT_RATIO = 0.7;
/**
 * 다크 모드는 글자 전체를 덮는다. 형광펜 위 글씨는 늘 잉크색이라, 70%만 칠하면
 * 형광펜 밖으로 나온 글자 윗부분이 어두운 바탕에 묻혀 읽히지 않는다.
 */
const MARK_HEIGHT_RATIO_DARK = 1;
/** 살짝 기울인 손맛. */
const MARK_ROTATE = '-1.5deg';
/** 형광펜이 글자 좌우로 삐져나오는 폭(px). */
const MARK_BLEED = 3;

/** 공백을 앞 단어에 붙인 채로 단어 단위로 자른다(줄바꿈 지점 = 공백). */
function words(s: string): string[] {
  return s.match(/\S+\s*|\s+/g) ?? [];
}

/**
 * Marked — 문장 속 핵심 구절 뒤에 형광펜 사각형을 깔아 강조한다(화면당 1곳만).
 *
 * RN 중첩 Text 안에는 뒤 배경 도형을 깔 수 없어, 문장을 단어 단위 Text로 흘려
 * (flex-wrap) 줄바꿈을 흉내 내고 형광펜 구절만 View로 감싼다.
 * 구절에 공백 없이 붙은 조사(예: "를")는 같은 덩어리로 묶어 따로 줄바꿈되지 않게 한다.
 * 스크린리더에는 문장 전체를 한 번에 읽힌다.
 */
export function Marked({
  text,
  mark,
  variant = 'display',
  color = 'textPrimary',
  animate = true,
  delay = 0,
  accessibilityRole = 'text',
  style,
}: MarkedProps): ReactNode {
  const { colors, isDark } = useTheme();
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animate && !reducedMotion;
  const progress = useSharedValue(shouldAnimate ? 0 : 1);

  useEffect(() => {
    if (!shouldAnimate) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: motion.duration.marker, easing: motion.easing.decel }),
    );
    return () => cancelAnimation(progress);
  }, [shouldAnimate, delay, progress]);

  const markStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: MARK_ROTATE }, { scaleX: progress.value }],
  }));

  const index = mark ? text.indexOf(mark) : -1;
  if (!mark || index < 0) {
    return (
      <View style={style}>
        <Text variant={variant} color={color} accessibilityRole={accessibilityRole}>
          {text}
        </Text>
      </View>
    );
  }

  const scale = typography[variant];
  const before = words(text.slice(0, index));
  const after = words(text.slice(index + mark.length));
  // 공백 없이 맞붙은 앞뒤 조각은 형광펜 덩어리에 묶는다.
  const glueBefore = before.length > 0 && !/\s$/.test(before[before.length - 1]) ? before.pop() : undefined;
  const glueAfter = after.length > 0 && !/^\s/.test(after[0]) ? after.shift() : undefined;

  const renderWord = (w: string, key: string): ReactNode => (
    <Text key={key} variant={variant} color={color}>
      {w}
    </Text>
  );

  return (
    <View
      accessible
      accessibilityRole={accessibilityRole}
      accessibilityLabel={text}
      style={[styles.flow, style]}
    >
      {before.map((w, i) => renderWord(w, `b${i}`))}
      <View style={styles.unit}>
        {glueBefore ? renderWord(glueBefore, 'gb') : null}
        <View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.mark,
              {
                backgroundColor: colors.marker,
                height: scale.size * (isDark ? MARK_HEIGHT_RATIO_DARK : MARK_HEIGHT_RATIO),
                bottom: Math.max(0, (scale.line - scale.size) / 2),
              },
              markStyle,
            ]}
          />
          <Text variant={variant} color="onMarker">
            {mark}
          </Text>
        </View>
        {glueAfter ? renderWord(glueAfter, 'ga') : null}
      </View>
      {after.map((w, i) => renderWord(w, `a${i}`))}
    </View>
  );
}

const styles = StyleSheet.create({
  flow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  unit: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  mark: {
    position: 'absolute',
    left: -MARK_BLEED,
    right: -MARK_BLEED,
    transformOrigin: 'left center',
  },
});
