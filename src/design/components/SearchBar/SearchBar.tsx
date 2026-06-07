import { useRef } from 'react';
import type { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { TextInputProps } from 'react-native';

import { Search, X } from 'lucide-react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** value 있을 때 X 버튼 탭 콜백. 미지정 시 onChangeText('') 폴백. */
  onClear?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** 키보드 검색 버튼 탭 콜백. */
  onSubmit?: () => void;
  /** TextInput 추가 props (testID, returnKeyLabel 등). */
  inputProps?: Omit<TextInputProps, 'value' | 'onChangeText' | 'placeholder' | 'autoFocus' | 'onSubmitEditing'>;
};

/** lucide stroke-width — 디자인시스템.md §6: 1.75 통일. */
const STROKE_WIDTH = 1.75;
/** 아이콘 크기 — 본문 기본 20. */
const ICON_SIZE = 20;
/** 최소 탭 영역 — iOS 44pt / Android 48dp. */
const MIN_TAP_SIZE = Platform.select({ ios: 44, default: 48 });
/** clear(X) 배경 원 크기 — borderRadius는 절반(완전한 원). */
const CLEAR_ICON_SIZE = 18;
/** clear(X) 글리프 크기 — 배경 원 안에 맞도록 축소. */
const CLEAR_GLYPH_SIZE = 12;

/**
 * SearchBar — 디자인시스템.md §3.3 underline/filled 검색 입력
 * Search prefix 아이콘 + value 있으면 clear(X) 버튼.
 * filled 스타일(bgMuted 배경, 테두리 없음)로 구현 — 검색 필드 관례.
 * a11y: role searchbox, clearButton label 포함.
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

  const handleClear = (): void => {
    if (onClear) {
      onClear();
    } else {
      onChangeText('');
    }
    // 클리어 후 포커스 유지
    inputRef.current?.focus();
  };

  const hasClear = value.length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgMuted,
          borderRadius: radius.lg,
        },
      ]}
    >
      {/* 검색 아이콘 prefix */}
      <View style={styles.prefixIcon} pointerEvents="none">
        <Search
          size={ICON_SIZE}
          color={colors.textSecondary}
          strokeWidth={STROKE_WIDTH}
        />
      </View>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDisabled}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        clearButtonMode="never" // 네이티브 clear 버튼 비활성화 — 직접 구현
        accessibilityRole="search"
        style={[
          styles.input,
          {
            color: colors.textPrimary,
            fontSize: typography.body.size,
          },
        ]}
        {...inputProps}
      />

      {/* value 있을 때 clear 버튼 */}
      {hasClear ? (
        <Pressable
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel={t('search.clear')}
          hitSlop={spacing.sm}
          style={({ pressed }) => [
            styles.clearButton,
            { minWidth: MIN_TAP_SIZE, minHeight: MIN_TAP_SIZE },
            Platform.OS === 'ios' && pressed ? styles.pressed : null,
          ]}
        >
          <View
            style={[
              styles.clearIcon,
              { backgroundColor: colors.textSecondary },
            ]}
          >
            <X size={CLEAR_GLYPH_SIZE} color={colors.bgSurface} strokeWidth={STROKE_WIDTH} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: MIN_TAP_SIZE, // 최소 탭 높이 — 디자인시스템.md §3.1
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  prefixIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    // lineHeight을 TextInput에 직접 지정하면 Android에서 클리핑 발생
    paddingVertical: 0,
    fontWeight: typography.body.weight,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearIcon: {
    width: CLEAR_ICON_SIZE,
    height: CLEAR_ICON_SIZE,
    borderRadius: CLEAR_ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
