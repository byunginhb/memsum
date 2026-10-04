import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { useTypeStyle } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { t } from '@/i18n';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** value 있을 때 X 버튼 탭 콜백. 미지정 시 onChangeText('') 대체. */
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** 키보드 검색 버튼 탭 콜백. */
  onSubmit?: () => void;
  /** TextInput 추가 props (testID, returnKeyLabel 등). */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'autoFocus' | 'onSubmitEditing'>;
};

/** 입력 줄 높이 — 최소 터치 44 이상. */
const HEIGHT = 48;
/** 밑줄 두께: 기본 1px, 포커스 2px(코발트). */
const UNDERLINE = 1;
const UNDERLINE_FOCUS = 2;
const MIN_TOUCH = 44;

/**
 * SearchBar — 밑줄형 검색창(명세 §6). 바탕 없이 rule 밑줄, 포커스 시 코발트 2px.
 * 왼쪽 돋보기, 값이 있으면 오른쪽 지우기(X).
 */
export function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder,
  autoFocus = false,
  onSubmit,
  inputProps,
}: SearchBarProps): ReactNode {
  const { colors } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const typeStyle = useTypeStyle('headline');

  const handleClear = (): void => {
    if (onClear) onClear();
    else onChangeText('');
    inputRef.current?.focus();
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderBottomColor: focused ? colors.primary : colors.borderStrong,
          borderBottomWidth: focused ? UNDERLINE_FOCUS : UNDERLINE,
          // 두께가 바뀌어도 높이가 흔들리지 않게 보정.
          paddingBottom: focused ? 0 : UNDERLINE_FOCUS - UNDERLINE,
        },
      ]}
    >
      <Icon name="search" size={20} color={focused ? 'primary' : 'textSecondary'} />

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        clearButtonMode="never"
        accessibilityRole="search"
        selectionColor={colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        // TextInput에 lineHeight를 주면 안드로이드에서 글자가 잘린다.
        style={[styles.input, typeStyle, { lineHeight: undefined, color: colors.textPrimary }]}
        {...inputProps}
      />

      {value.length > 0 ? (
        <PressableScale
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          hitSlop={spacing.sm}
          style={styles.clear}
        >
          <Icon name="x" size={20} color="textSecondary" />
        </PressableScale>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: HEIGHT,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 0,
  },
  clear: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
