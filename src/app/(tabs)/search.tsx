import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  Button,
  EmptyState,
  Header,
  SearchBar,
  Text,
  useBottomBarClearance,
} from '@/design';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { CaptureCard } from '@/features/captures/CaptureCard';
import { CaptureGridSkeleton } from '@/features/captures/CaptureSkeleton';
import { GRID_COLUMNS, GRID_GAP, GRID_ROW_GAP } from '@/features/captures/grid';
import { listEntering } from '@/features/captures/list-entering';
import type { CaptureListItem } from '@/features/captures/types';
import { useCaptures } from '@/hooks/use-captures';
import { useSearchCaptures } from '@/hooks/use-search-captures';
import { searchCaptures } from '@/lib/captures';
import { CATEGORY_I18N_KEY, CATEGORY_KEYS, type CategoryKey } from '@/lib/categories';
import { t } from '@/i18n';

/**
 * 자료실 / 검색 탭 — 명세 §6 "자료실/검색: 3열 그리드(홈과 동일), 밑줄형 검색창".
 *
 * 세 가지 모드를 한 화면에서 다룬다. 모드는 큰 제목 위 mono 머리표로 늘 드러낸다.
 *  1) 자료실(library): 카테고리 없음 + 빈 검색어 → 전체 최근 캡처(당겨서 새로고침 + 무한스크롤).
 *  2) 묶음(category): 유효한 category 파라미터 → 해당 묶음. 검색어가 있으면 그 안에서 좁힌다.
 *     머리 오른쪽 "전체 보기"로 묶음 필터를 풀고 자료실로 돌아간다.
 *  3) 검색(search): 카테고리 없음 + 검색어 → 전역 검색.
 *
 * 디바운스는 각 검색 훅이 맡으므로 onChangeText는 즉시 setQuery만 호출한다.
 * 오류는 훅이 이미 i18n 일반 문구로 바꿔 주며, 서버 원문은 화면에 내보내지 않는다.
 */

/** 무한스크롤 트리거 임계값(목록 끝 40% 지점). 홈과 동일. */
const END_REACHED_THRESHOLD = 0.4;
/** 묶음 모드 입력 디바운스(ms). use-search-captures와 동일. */
const CATEGORY_DEBOUNCE_MS = 300;

type SearchMode = 'library' | 'category' | 'search';

/**
 * 라우트 파라미터의 category를 안전한 CategoryKey로 검증한다.
 * 화이트리스트(CATEGORY_KEYS)에 없으면 undefined → 묶음 모드 아님.
 */
function parseCategory(raw: string | undefined): CategoryKey | undefined {
  if (raw && (CATEGORY_KEYS as readonly string[]).includes(raw)) {
    return raw as CategoryKey;
  }
  return undefined;
}

export default function SearchScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomBarClearance();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { width: windowWidth } = useWindowDimensions();

  const params = useLocalSearchParams<{ category?: string }>();
  const category = parseCategory(params.category);

  // 전역 검색 훅(검색 모드). 묶음 모드에서는 query만 공유 입력으로 쓴다.
  const search = useSearchCaptures();
  const library = useCaptures();
  const categoryResults = useCategoryCaptures(category, search.query);

  const trimmedQuery = search.query.trim();
  const hasQuery = trimmedQuery.length > 0;

  // 모드 결정: 카테고리 파라미터가 최우선 → 검색어 → 자료실.
  const mode: SearchMode = category ? 'category' : hasQuery ? 'search' : 'library';

  const source =
    mode === 'library'
      ? { items: library.items, isLoading: library.isLoading, error: library.error }
      : mode === 'category'
        ? categoryResults
        : { items: search.results, isLoading: search.isSearching, error: search.error };
  const { items, isLoading, error } = source;

  // 고정 px 셀 폭: 마지막 줄이 1~2장이어도 늘어나지 않고 왼쪽에 붙는다.
  const cellWidth = Math.floor(
    (windowWidth - spacing.lg * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS,
  );

  const title = category
    ? t('search.category.title', { category: t(CATEGORY_I18N_KEY[category]) })
    : t('search.title');

  const eyebrow =
    mode === 'library'
      ? t('search.eyebrow.library')
      : isLoading
        ? t('search.eyebrow.searching')
        : t(mode === 'category' ? 'search.eyebrow.category' : 'search.eyebrow.search', {
            count: items.length,
          });

  const handlePressItem = useCallback(
    (id: string): void => {
      router.push({ pathname: '/captures/[id]', params: { id } });
    },
    [router],
  );

  const handleShowAll = useCallback((): void => {
    // 빈 문자열은 parseCategory에서 undefined로 걸러져 자료실 모드가 된다.
    router.setParams({ category: '' });
  }, [router]);

  const handleClearQuery = useCallback((): void => {
    search.setQuery('');
  }, [search]);

  // 무한스크롤은 자료실 모드에서만(검색·묶음은 단일 페이지 결과).
  const handleEndReached = useCallback((): void => {
    if (mode === 'library') void library.loadMore();
  }, [mode, library]);

  const handleRetry = useCallback((): void => {
    if (mode === 'library') void library.refresh();
    else if (mode === 'category') categoryResults.retry();
  }, [mode, library, categoryResults]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CaptureListItem>) => (
      <Animated.View entering={listEntering(index, reducedMotion)} style={{ width: cellWidth }}>
        <CaptureCard item={item} onPress={handlePressItem} />
      </Animated.View>
    ),
    [handlePressItem, cellWidth, reducedMotion],
  );

  const keyExtractor = useCallback((item: CaptureListItem): string => item.id, []);

  const listContentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: bottomClearance,
      gap: GRID_ROW_GAP,
      flexGrow: 1,
    }),
    [bottomClearance],
  );

  const showAllButton = category ? (
    <Button
      variant="ghost"
      size="sm"
      onPress={handleShowAll}
      accessibilityLabel={t('search.category.showAllHint')}
    >
      {t('search.category.showAll')}
    </Button>
  ) : undefined;

  const listEmpty = (): ReactNode => {
    if (error) {
      return (
        <EmptyState
          icon="alert-circle"
          title={error}
          action={mode === 'search' ? undefined : { label: t('search.retry'), onPress: handleRetry }}
        />
      );
    }
    if (isLoading) {
      // emptyWrap의 좌우 상쇄를 되돌려 실제 그리드와 같은 자리에 그린다.
      return (
        <View style={styles.skeletonWrap}>
          <CaptureGridSkeleton
            cellWidth={cellWidth}
            columns={GRID_COLUMNS}
            gap={GRID_GAP}
            accessibilityLabel={t('search.loading')}
          />
        </View>
      );
    }
    if (mode === 'search') {
      return (
        <EmptyState
          icon="search"
          title={t('search.empty.noResults', { query: trimmedQuery })}
          body={t('search.empty.noResultsBody')}
          action={{ label: t('search.empty.clearQuery'), onPress: handleClearQuery }}
        />
      );
    }
    if (mode === 'category') {
      return (
        <EmptyState
          icon="folder"
          title={t('search.empty.categoryTitle')}
          body={t('search.empty.categoryBody')}
          action={{ label: t('search.category.showAll'), onPress: handleShowAll }}
        />
      );
    }
    return (
      <EmptyState
        icon="images"
        title={t('search.empty.libraryTitle')}
        body={t('search.empty.libraryBody')}
      />
    );
  };

  // 이미 결과가 있는데 다음 페이지 등에서 실패하면, 목록은 두고 바닥에 조용히 알린다.
  const listFooter =
    error && items.length > 0 ? (
      <Text variant="caption" color="textSecondary" style={styles.footerError}>
        {error}
      </Text>
    ) : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Header
          large
          title={title}
          eyebrow={eyebrow}
          right={showAllButton}
          topInset={insets.top}
        />
        <View style={styles.searchWrap}>
          <SearchBar
            value={search.query}
            onChangeText={search.setQuery}
            placeholder={t('search.placeholder')}
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
          // 모드가 바뀌면 목록을 새로 마운트해 첫 진입 등장 연출이 한 번 더 돈다.
          key={mode}
          columnWrapperStyle={styles.row}
          contentContainerStyle={listContentStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={END_REACHED_THRESHOLD}
          onEndReached={handleEndReached}
          ListEmptyComponent={<View style={styles.emptyWrap}>{listEmpty()}</View>}
          ListFooterComponent={listFooter}
          refreshControl={
            mode === 'library' ? (
              <RefreshControl
                // 첫 로드는 스켈레톤이 맡고, 당겨서 새로고침일 때만 스피너를 보인다.
                refreshing={library.isLoading && library.items.length > 0}
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

type UseCategoryCapturesResult = {
  items: CaptureListItem[];
  isLoading: boolean;
  error: string | null;
  retry: () => void;
};

/**
 * 묶음 모드 데이터 훅(파일 로컬).
 *
 * searchCaptures({ query, category })를 호출한다. 빈 검색어여도 카테고리 단독 조회가
 * 가능하므로 카테고리가 있으면 항상 조회한다. query는 CATEGORY_DEBOUNCE_MS만큼 디바운스하고,
 * 의존성이 바뀌거나 언마운트되면 진행 중 응답을 stale로 버린다.
 * 실패 원문은 로그에만 남기고 화면에는 common.error.search 일반 문구를 준다.
 */
function useCategoryCaptures(
  category: CategoryKey | undefined,
  query: string,
): UseCategoryCapturesResult {
  const [items, setItems] = useState<CaptureListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // 다시 시도 시 같은 입력으로 effect를 한 번 더 돌리기 위한 카운터.
  const [attempt, setAttempt] = useState(0);

  const trimmed = query.trim();

  useEffect(() => {
    // 묶음 모드가 아니면 호출하지 않고 상태를 비운다(의도적 동기 리셋).
    if (!category) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setItems([]);
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
        if (!active) return;
        setItems(found);
      } catch (err) {
        if (!active) return;
        console.error('[search] 묶음 조회 실패:', err);
        setError(t('common.error.search'));
      } finally {
        if (active) setIsLoading(false);
      }
    }, CATEGORY_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, trimmed, attempt]);

  const retry = useCallback((): void => {
    setAttempt((n) => n + 1);
  }, []);

  return { items, isLoading, error, retry };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    gap: GRID_GAP,
  },
  emptyWrap: {
    // EmptyState가 자체 좌우 여백을 가지므로 목록 여백과 겹치지 않게 상쇄한다.
    marginHorizontal: -spacing.lg,
  },
  skeletonWrap: {
    paddingHorizontal: spacing.lg,
  },
  footerError: {
    paddingTop: spacing.lg,
  },
});
