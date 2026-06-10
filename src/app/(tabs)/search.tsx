import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { SearchBar } from '@/design/components/SearchBar/SearchBar';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import {
  letterSpacingFor,
  spacing,
  typography,
  zIndex,
} from '@/design/tokens';
import { CaptureCard } from '@/features/captures/CaptureCard';
import type { CaptureListItem } from '@/features/captures/types';
import { useCaptures } from '@/hooks/use-captures';
import { useSearchCaptures } from '@/hooks/use-search-captures';
import { searchCaptures } from '@/lib/captures';
import {
  CATEGORY_I18N_KEY,
  CATEGORY_KEYS,
  type CategoryKey,
} from '@/lib/categories';
import { t } from '@/i18n';

/**
 * 검색 / 자료실 화면 — 검색 + 전체 그리드 + 카테고리 필터 통합(W4-C 확장).
 *
 * 화면은 useLocalSearchParams의 category와 입력 query에 따라 3가지 모드로 동작한다.
 *  1) 자료실(library): category 없음 + 빈 검색어 → useCaptures 전체 최근 캡처 그리드
 *     (pull-to-refresh + 무한스크롤). 빈 "검색어 입력" 안내 대신 실제 자료실을 보여준다.
 *  2) 카테고리(category): 유효한 CategoryKey 파라미터 → searchCaptures({category})로
 *     해당 묶음만. 검색어가 있으면 카테고리 내에서 추가로 좁힌다.
 *  3) 검색(search): category 없음 + 검색어 있음 → useSearchCaptures(전역 검색).
 *
 * 디바운스는 각 검색 훅이 담당하므로 onChangeText는 즉시 setQuery만 호출한다.
 */

/** 자료실/카테고리 그리드 열 수(홈 2열과 일관). */
const GRID_COLUMNS = 2;
/** 무한스크롤 트리거 임계값(목록 끝 40% 지점). 홈과 동일. */
const END_REACHED_THRESHOLD = 0.4;
/** 카테고리 모드 입력 디바운스(ms). use-search-captures와 동일. */
const CATEGORY_DEBOUNCE_MS = 300;

type SearchMode = 'library' | 'category' | 'search';

/**
 * 라우트 파라미터의 category를 안전한 CategoryKey로 검증한다.
 * 화이트리스트(CATEGORY_KEYS)에 없으면 undefined → 카테고리 모드 아님.
 */
function parseCategory(raw: string | undefined): CategoryKey | undefined {
  if (raw && (CATEGORY_KEYS as readonly string[]).includes(raw)) {
    return raw as CategoryKey;
  }
  return undefined;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const params = useLocalSearchParams<{ category?: string }>();
  const category = parseCategory(params.category);

  // 전역 검색 훅(검색 모드). 카테고리 모드에서는 query만 공유 입력으로 쓰고 results는 무시한다.
  const search = useSearchCaptures();
  // 자료실 모드(전체 목록 + 무한스크롤).
  const library = useCaptures();
  // 카테고리 모드(카테고리 + 선택적 내부 검색).
  const categoryResults = useCategoryCaptures(category, search.query);

  const trimmedQuery = search.query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // 모드 결정: 카테고리 파라미터가 최우선 → 검색어 → 자료실.
  const mode: SearchMode = category
    ? 'category'
    : hasQuery
      ? 'search'
      : 'library';

  // 모드별 데이터·로딩·에러 일원화.
  const items =
    mode === 'library'
      ? library.items
      : mode === 'category'
        ? categoryResults.results
        : search.results;
  const isLoading =
    mode === 'library'
      ? library.isLoading
      : mode === 'category'
        ? categoryResults.isLoading
        : search.isSearching;
  const error =
    mode === 'library'
      ? library.error
      : mode === 'category'
        ? categoryResults.error
        : search.error;

  const title = category
    ? t('search.category.title', { category: t(CATEGORY_I18N_KEY[category]) })
    : t('search.title');

  const handlePressItem = useCallback(
    (id: string): void => {
      router.push({ pathname: '/captures/[id]', params: { id } });
    },
    [router],
  );

  // 무한스크롤은 자료실 모드에서만(검색·카테고리는 단일 페이지 결과).
  const handleEndReached = useCallback((): void => {
    if (mode === 'library') void library.loadMore();
  }, [mode, library]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CaptureListItem>) => (
      <View style={styles.cell}>
        <CaptureCard item={item} onPress={handlePressItem} />
      </View>
    ),
    [handlePressItem],
  );

  const keyExtractor = useCallback(
    (item: CaptureListItem): string => item.id,
    [],
  );

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: insets.bottom + spacing['4xl'],
      gap: spacing.md,
    }),
    [insets.bottom],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.headerWrap,
            {
              paddingTop: insets.top + spacing.sm,
              backgroundColor: colors.bgBase,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <Text
            style={[styles.screenTitle, { color: colors.textPrimary }]}
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </Text>
          {/* 디자인시스템 SearchBar — 카테고리 모드에서도 내부 검색 입력으로 유지. */}
          <SearchBar
            value={search.query}
            onChangeText={search.setQuery}
            placeholder={t('search.placeholder')}
            autoFocus={mode === 'search'}
            inputProps={{
              autoCorrect: false,
              autoCapitalize: 'none',
              accessibilityLabel: t('search.placeholder'),
            }}
          />
        </View>

        <FlatList
          style={styles.flex}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={GRID_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={listContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          onEndReached={handleEndReached}
          ListHeaderComponent={
            <ListHeader
              mode={mode}
              isLoading={isLoading}
              error={error}
              resultCount={items.length}
            />
          }
          refreshControl={
            mode === 'library' ? (
              <RefreshControl
                refreshing={library.isLoading}
                onRefresh={library.refresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * 카테고리 모드 데이터 훅(파일 로컬).
 *
 * searchCaptures({ query, category })를 호출한다. 빈 검색어여도 카테고리 단독 조회가
 * 가능하므로(데이터 레이어가 query 없이 category만이면 묶음 전체 반환) 카테고리가 있으면
 * 항상 조회한다. query는 CATEGORY_DEBOUNCE_MS만큼 디바운스하고, 카테고리/검색어가
 * 바뀌거나 언마운트되면 진행 중 응답을 stale로 버린다.
 */
type UseCategoryCapturesResult = {
  results: CaptureListItem[];
  isLoading: boolean;
  error: string | null;
};

function useCategoryCaptures(
  category: CategoryKey | undefined,
  query: string,
): UseCategoryCapturesResult {
  const [results, setResults] = useState<CaptureListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = query.trim();

  useEffect(() => {
    // 카테고리 모드가 아니면 호출하지 않고 상태를 비운다(의도적 동기 리셋).
    if (!category) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setResults([]);
      setError(null);
      setIsLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const found = await searchCaptures({ query: trimmed, category });
        // stale 가드: 언마운트됐거나 그 사이 의존성이 바뀌었으면 무시.
        if (!active) return;
        setResults(found);
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.';
        setError(message);
      } finally {
        if (active) setIsLoading(false);
      }
    }, CATEGORY_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, trimmed]);

  return { results, isLoading, error };
}

type ListHeaderProps = {
  mode: SearchMode;
  isLoading: boolean;
  error: string | null;
  resultCount: number;
};

/**
 * 목록 상단 상태 표시(로딩 / 에러 / 결과없음 / 결과 개수).
 * 자료실 모드는 RefreshControl이 로딩을 표시하므로 별도 스피너를 띄우지 않는다.
 */
function ListHeader({ mode, isLoading, error, resultCount }: ListHeaderProps) {
  const { colors } = useTheme();

  if (error) {
    return <StatusBlock icon="x" message={error} tone="danger" />;
  }

  // 검색·카테고리 모드의 진행 중 스피너(자료실은 RefreshControl이 담당).
  if (isLoading && mode !== 'library') {
    return (
      <View style={styles.statusBlock} accessibilityRole="progressbar">
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (resultCount === 0) {
    // 자료실/카테고리 로딩 중에는 빈 안내를 띄우지 않는다(깜빡임 방지).
    if (isLoading) return null;
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
  headerWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: zIndex.sticky,
  },
  screenTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
    letterSpacing: letterSpacingFor('title'),
  },
  row: {
    gap: spacing.md,
  },
  cell: {
    flex: 1,
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
    paddingBottom: spacing.sm,
  },
});
