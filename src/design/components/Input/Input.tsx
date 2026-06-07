import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { letterSpacingFor, motion, radius, spacing, typography } from '@/design/tokens';

export type InputVariant = 'outline' | 'filled' | 'underline';
export type InputSize = 'sm' | 'md' | 'lg';

type InputProps = {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  secureTextEntry?: boolean;
  multiline?: boolean;
};

/** size별 높이 — design.md §16: sm 40 / md 48 / lg 56(모두 ≥44 탭타깃, sm은 디자인상 예외 허용). */
const SIZE_HEIGHT: Record<InputSize, number> = {
  sm: 40,
  md: 48,
  lg: 56,
};

/** outline/filled 테두리 두께. focus 시에도 동일 두께를 유지하고 색만 바꾼다(레이아웃 점프 방지). */
const BORDER_WIDTH = 1;

/** label fly-up 시 축소 배율(focus/값 있을 때 라벨이 살짝 작아지며 위로). */
const LABEL_SHRINK_SCALE = 0.85;

/** label fly-up 이동 거리(px, 위로). caption 라인 높이를 고려한 값. */
const LABEL_FLOAT_TRANSLATE = -10;

/** multiline 입력의 최소 높이 — 단일 높이보다 넉넉히. */
const MULTILINE_MIN_HEIGHT = 96;

type VariantStyle = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderBottomWidth: number;
  borderRadius: number;
};

/**
 * variant·상태별 컨테이너 스타일 — 모든 색은 테마 토큰에서만 가져온다.
 * outline: 테두리 border→focus primary→error danger.
 * filled: bgMuted 배경 무테(단, error/focus 시 하단 보더로 상태 표현).
 * underline: 하단 1px만.
 */
function variantStyle(
  variant: InputVariant,
  colors: Theme['colors'],
  isFocused: boolean,
  hasError: boolean,
): VariantStyle {
  // 우선순위: error > focus > 기본.
  const activeBorder = hasError
    ? colors.danger
    : isFocused
      ? colors.primary
      : colors.border;

  switch (variant) {
    case 'filled':
      return {
        backgroundColor: colors.bgMuted,
        // 무테가 기본. 단 focus/error는 하단 보더로 상태를 드러낸다.
        borderColor: activeBorder,
        borderWidth: 0,
        borderBottomWidth: isFocused || hasError ? BORDER_WIDTH : 0,
        borderRadius: radius.lg,
      };
    case 'underline':
      return {
        backgroundColor: 'transparent',
        borderColor: activeBorder,
        borderWidth: 0,
        borderBottomWidth: BORDER_WIDTH,
        borderRadius: 0,
      };
    case 'outline':
    default:
      return {
        backgroundColor: 'transparent',
        borderColor: activeBorder,
        borderWidth: BORDER_WIDTH,
        borderBottomWidth: BORDER_WIDTH,
        borderRadius: radius.lg,
      };
  }
}

/**
 * Input — design.md §16
 * variant(outline/filled/underline) × size(sm/md/lg).
 * label fly-up: focus 또는 값 존재 시 라벨이 위로 축소 이동(reanimated, reduce-motion이면 즉시).
 * error 시 border danger + errorText. a11y: accessibilityLabel=label, error를 라벨/value에 병합.
 */
export function Input({
  variant = 'outline',
  size = 'md',
  label,
  placeholder,
  value,
  onChangeText,
  error,
  helperText,
  leftIcon,
  rightIcon,
  secureTextEntry = false,
  multiline = false,
}: InputProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [isFocused, setIsFocused] = useState(false);

  const hasError = typeof error === 'string' && error.length > 0;
  const hasValue = value.length > 0;
  // 라벨이 떠 있어야 하는 조건: 포커스 또는 값 존재.
  const isFloating = isFocused || hasValue;

  const vs = useMemo(
    () => variantStyle(variant, colors, isFocused, hasError),
    [variant, colors, isFocused, hasError],
  );

  // 0 = 라벨이 placeholder 위치(본문 크기), 1 = 떠 있는 축소 상태.
  const floatProgress = useSharedValue(isFloating ? 1 : 0);

  useEffect(() => {
    const target = isFloating ? 1 : 0;
    if (reducedMotion) {
      // 모션 감소: 즉시 최종 상태로 — 애니메이션 생략.
      floatProgress.value = target;
      return;
    }
    floatProgress.value = withTiming(target, {
      duration: motion.duration.fast,
      easing: motion.easing.standard,
    });
    // 진행 중 애니메이션 정리(worklet 잔존·메모리 누수 방지).
    return () => {
      cancelAnimation(floatProgress);
    };
  }, [isFloating, reducedMotion, floatProgress]);

  const labelAnimatedStyle = useAnimatedStyle<TextStyle>(() => {
    const scale = interpolate(floatProgress.value, [0, 1], [1, LABEL_SHRINK_SCALE]);
    const translateY = interpolate(floatProgress.value, [0, 1], [0, LABEL_FLOAT_TRANSLATE]);
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  // 라벨 색: error > focus > 기본(secondary).
  const labelColor = hasError
    ? colors.danger
    : isFocused
      ? colors.primary
      : colors.textSecondary;

  // a11y: RN은 accessibilityInvalid를 지원하지 않으므로 error를 라벨/value에 병합한다.
  const a11yLabel = label;
  const a11yValue = hasError
    ? { text: error }
    : helperText
      ? { text: helperText }
      : undefined;

  const containerStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: multiline ? MULTILINE_MIN_HEIGHT : SIZE_HEIGHT[size],
      backgroundColor: vs.backgroundColor,
      borderColor: vs.borderColor,
      borderWidth: vs.borderWidth,
      borderBottomWidth: vs.borderBottomWidth,
      borderRadius: vs.borderRadius,
      // multiline은 상단 정렬, 단일은 수직 가운데.
      alignItems: multiline ? 'flex-start' : 'center',
    }),
    [multiline, size, vs],
  );

  return (
    <View style={styles.root}>
      {label ? (
        <Animated.Text
          style={[
            styles.label,
            { color: labelColor },
            labelAnimatedStyle,
          ]}
          numberOfLines={1}
          // 라벨은 입력 필드 a11y에 병합되므로 단독 접근 대상에서 제외.
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {label}
        </Animated.Text>
      ) : null}

      <View style={[styles.field, containerStyle]}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          accessibilityLabel={a11yLabel}
          accessibilityValue={a11yValue}
          accessibilityState={{ disabled: false }}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontSize: typography.body.size,
              fontWeight: typography.body.weight,
              letterSpacing: letterSpacingFor('body'),
              // multiline 상단 정렬 보정.
              textAlignVertical: multiline ? 'top' : 'center',
              // multiline 시 상하 패딩으로 텍스트 클리핑 방지.
              paddingVertical: multiline ? spacing.md : 0,
            },
          ]}
        />

        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>

      {hasError ? (
        <Animated.Text style={[styles.helper, { color: colors.danger }]} numberOfLines={2}>
          {error}
        </Animated.Text>
      ) : helperText ? (
        <Animated.Text
          style={[styles.helper, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {helperText}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
    // 축소 변환 기준점을 좌측으로 고정해 라벨이 좌상단으로 모이게 한다.
    alignSelf: 'flex-start',
  },
  field: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  iconLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    // lineHeight을 TextInput에 직접 지정하면 Android에서 클리핑 발생 → 생략.
    padding: 0,
  },
  helper: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
    paddingHorizontal: spacing.xs,
  },
});
