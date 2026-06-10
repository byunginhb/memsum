import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings-store';

type HomeGreetingProps = {
  /**
   * SafeArea top inset(px). 미지정 시 0 — 호출(화면) 측이 useSafeAreaInsets()로
   * 전달 책임(Header 선례). 컴포넌트 자체는 SafeAreaView를 쓰지 않아 유연성 유지.
   */
  topInset?: number;
};

/**
 * HomeGreeting — 홈 상단 개인화 인사 헤더(design.md §26 large).
 *
 * settings-store의 nickname을 읽어, trim 후 값이 있으면 "안녕 {name} 님",
 * 없으면 폴백 인사를 보여준다. heading 스케일(22pt/700, Pretendard)로 렌더하고
 * accessibilityRole="header"로 스크린리더에 제목임을 알린다(이모지 금지 §6).
 */
export function HomeGreeting({ topInset = 0 }: HomeGreetingProps): ReactNode {
  const { colors } = useTheme();
  const nickname = useSettingsStore((state) => state.nickname);

  const trimmed = nickname.trim();
  const greeting =
    trimmed.length > 0
      ? t('home.greeting', { name: trimmed })
      : t('home.greetingFallback');

  return (
    <View style={[styles.wrapper, { paddingTop: topInset }]}>
      <Text
        accessibilityRole="header"
        style={[styles.greeting, { color: colors.textPrimary }]}
        numberOfLines={2}
      >
        {greeting}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
});
