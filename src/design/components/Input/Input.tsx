import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { ViewStyle } from 'react-native';

import { Text, useTypeStyle } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import type { Theme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';

export type InputVariant = 'outline' | 'filled' | 'underline';
export type InputSize = 'sm' | 'md' | 'lg';

export type InputProps = {
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

/** 높이 — 모두 최소 터치 44 이상. */
const SIZE_HEIGHT: Record<InputSize, number> = {
  sm: 44,
  md: 48,
  lg: 56,
};

const BORDER = 1;
const MULTILINE_MIN_HEIGHT = 96;

/** 상태 우선순위: 오류 > 포커스 > 기본. 두께는 그대로 두고 색만 바꿔 레이아웃이 흔들리지 않는다. */
function fieldStyle(
  variant: InputVariant,
  colors: Theme['colors'],
  focused: boolean,
  hasError: boolean,
): ViewStyle {
  const line = hasError ? colors.danger : focused ? colors.primary : colors.borderStrong;
  switch (variant) {
    case 'filled':
      return {
        backgroundColor: colors.bgMuted,
        borderRadius: radius.md,
        borderBottomWidth: BORDER,
        borderBottomColor: hasError || focused ? line : 'transparent',
      };
    case 'underline':
      return { borderBottomWidth: BORDER, borderBottomColor: line };
    case 'outline':
    default:
      return { borderWidth: BORDER, borderColor: line, borderRadius: radius.md };
  }
}

/**
 * Input — 라벨(caption)은 칸 위에 고정, 오류/도움말은 아래 caption.
 * 입력칸 바탕은 bgMuted(filled) 또는 rule 테두리(outline)·밑줄(underline).
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
  const typeStyle = useTypeStyle('body');
  const [focused, setFocused] = useState(false);
  const hasError = typeof error === 'string' && error.length > 0;
  const message = hasError ? error : helperText;

  return (
    <View style={styles.root}>
      {label ? (
        <Text
          variant="caption"
          color={hasError ? 'danger' : 'textSecondary'}
          numberOfLines={1}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {label}
        </Text>
      ) : null}

      <View
        style={[
          styles.field,
          {
            minHeight: multiline ? MULTILINE_MIN_HEIGHT : SIZE_HEIGHT[size],
            alignItems: multiline ? 'flex-start' : 'center',
            paddingHorizontal: variant === 'underline' ? 0 : spacing.md,
          },
          fieldStyle(variant, colors, focused, hasError),
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.primary}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          // RN은 invalid 상태가 없어 오류·도움말을 값 설명으로 합친다.
          accessibilityValue={message ? { text: message } : undefined}
          style={[
            styles.input,
            typeStyle,
            {
              // TextInput에 lineHeight를 주면 안드로이드에서 글자가 잘린다.
              lineHeight: undefined,
              color: colors.textPrimary,
              textAlignVertical: multiline ? 'top' : 'center',
              paddingVertical: multiline ? spacing.md : 0,
            },
          ]}
        />
        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </View>

      {message ? (
        <Text variant="caption" color={hasError ? 'danger' : 'textSecondary'} numberOfLines={2}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    padding: 0,
  },
});
