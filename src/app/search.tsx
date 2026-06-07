import { useMemo } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';

import { SearchBar } from '@/design/components/SearchBar/SearchBar';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography, zIndex } from '@/design/tokens';
import { CaptureCard } from '@/features/captures/CaptureCard';
import { useSearchCaptures } from '@/hooks/use-search-captures';
import { t } from '@/i18n';

/**
 * 검색 화면 — 기능명세 검색 플로우 (W4-C).
 * 상단 sticky 입력 + useSearchCaptures 결과를 CaptureCard 목록으로 표시.
 * 디바운스는 훅(use-search-captures)이 담당하므로 onChangeText는 즉시 setQuery만 호출한다.
 */
export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { query, setQuery, results, isSearching, error } = useSearchCaptures();

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.lg,
      paddingBottom: insets.bottom + spacing['4xl'],
      gap: spacing.md,
    }),
    [insets.bottom],
  );

  const handlePressItem = (id: string): void => {
    router.push(`/captures/${id}`);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ headerShown: true, title: t('search.title') }} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.searchBarWrap,
            {
              paddingTop: insets.top + spacing.sm,
              backgroundColor: colors.bgBase,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* P1-1: 디자인시스템 SearchBar로 통합(로컬 중복 구현 제거). */}
          <SearchBar
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            autoFocus
            inputProps={{
              autoCorrect: false,
              autoCapitalize: 'none',
              accessibilityLabel: t('search.placeholder'),
            }}
          />
        </View>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={listContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <SearchBody
            hasQuery={hasQuery}
            isSearching={isSearching}
            error={error}
            resultCount={results.length}
          />
          {results.map((item) => (
            <CaptureCard key={item.id} item={item} onPress={handlePressItem} />
          ))}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

type SearchBodyProps = {
  hasQuery: boolean;
  isSearching: boolean;
  error: string | null;
  resultCount: number;
};

/** 검색 상태별 안내(빈 검색어 / 로딩 / 에러 / 결과없음 / 결과 헤더). */
function SearchBody({ hasQuery, isSearching, error, resultCount }: SearchBodyProps) {
  const { colors } = useTheme();

  if (!hasQuery) {
    return (
      <StatusBlock icon="search" message={t('search.empty.prompt')} />
    );
  }

  if (isSearching) {
    return (
      <View style={styles.statusBlock} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <StatusBlock icon="x" message={error} tone="danger" />;
  }

  if (resultCount === 0) {
    return <StatusBlock icon="search" message={t('search.empty.noResults')} />;
  }

  return (
    <Text style={[styles.resultHeader, { color: colors.textSecondary }]}>
      {t('search.results.count', { count: resultCount })}
    </Text>
  );
}

type StatusBlockProps = {
  icon: 'search' | 'x';
  message: string;
  tone?: 'default' | 'danger';
};

/** 아이콘 + 안내 문구 중앙 정렬 블록(빈 상태·에러 공용). */
function StatusBlock({ icon, message, tone = 'default' }: StatusBlockProps) {
  const { colors } = useTheme();
  const textColor = tone === 'danger' ? colors.danger : colors.textSecondary;
  const iconColor = tone === 'danger' ? 'danger' : 'textSecondary';

  return (
    <View style={styles.statusBlock}>
      <Icon name={icon} size={32} color={iconColor} />
      <Text style={[styles.statusText, { color: textColor }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  searchBarWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: zIndex.sticky,
  },
  statusBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['5xl'],
  },
  statusText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    textAlign: 'center',
  },
  resultHeader: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
});
