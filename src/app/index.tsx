import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography, zIndex } from '@/design/tokens';
import { CaptureSheet } from '@/features/capture/CaptureSheet';
import { CaptureCard } from '@/features/captures/CaptureCard';
import type { CaptureListItem } from '@/features/captures/types';
import { useCaptures } from '@/hooks/use-captures';
import { t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';

// 샘플 스크린샷(시뮬레이션용). dev 데모와 동일 에셋을 캡처 흐름 트리거에 재사용.
const SAMPLE_KO = require('@/assets/ocr-test/sample-ko.png');

// 2열 그리드.
const GRID_COLUMNS = 2;

/**
 * 홈(캡처 리스트) 화면 — 기능명세 Screen 01.
 *
 * 저장된 captures를 2열 그리드로 보여주고, 우하단 FAB로 샘플 캡처 흐름을 트리거한다.
 * pull-to-refresh / 하단 도달 시 페이지네이션. 빈 상태는 EmptyState로 안내.
 * 캡처 확인 Sheet(<CaptureSheet />)를 화면에 상주시켜 저장 흐름을 노출한다.
 */
export default function HomeScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { items, isLoading, refresh, loadMore } = useCaptures();
  const { onSimulate, isSimulating } = useSampleCapture();

  const handleOpenCapture = useCallback(
    (id: string): void => {
      router.push({ pathname: '/captures/[id]', params: { id } });
    },
    [router],
  );

  const handleOpenSearch = useCallback((): void => {
    router.push('/search');
  }, [router]);

  const handleOpenDev = useCallback((): void => {
    router.push('/dev');
  }, [router]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<CaptureListItem>) => (
      <View style={styles.cell}>
        <CaptureCard item={item} onPress={handleOpenCapture} />
      </View>
    ),
    [handleOpenCapture],
  );

  const keyExtractor = useCallback((item: CaptureListItem): string => item.id, []);

  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      // FAB가 마지막 행을 가리지 않도록 하단 여백 확보.
      paddingBottom: insets.bottom + spacing['6xl'],
      gap: spacing.md,
    }),
    [insets.bottom],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header onSearch={handleOpenSearch} onDev={handleOpenDev} topInset={insets.top} />

      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={GRID_COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={contentStyle}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        ListEmptyComponent={isLoading ? null : <EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      <View style={[styles.fab, { bottom: insets.bottom + spacing.xl }]} pointerEvents="box-none">
        <Button
          variant="accent"
          size="lg"
          loading={isSimulating}
          onPress={onSimulate}
          accessibilityLabel={t('home.capture.sample')}
          leftIcon={<Icon name="camera" size={20} color="textOnAccent" />}
        >
          {t('home.capture.sample')}
        </Button>
      </View>

      <CaptureSheet />
    </View>
  );
}

type HeaderProps = {
  onSearch: () => void;
  onDev: () => void;
  topInset: number;
};

function Header({ onSearch, onDev, topInset }: HeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.header, { paddingTop: topInset + spacing.sm }]}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('home.title')}</Text>
      <View style={styles.headerActions}>
        <IconButton name="search" label={t('home.action.search')} onPress={onSearch} />
        <IconButton name="sliders-horizontal" label={t('home.action.dev')} onPress={onDev} />
      </View>
    </View>
  );
}

type IconButtonProps = {
  name: 'search' | 'sliders-horizontal';
  label: string;
  onPress: () => void;
};

function IconButton({ name, label, onPress }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: colors.bgSurface },
        pressed ? styles.pressed : null,
      ]}
    >
      <Icon name={name} size={20} color="textPrimary" />
    </Pressable>
  );
}

function EmptyState() {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.bgMuted }]}>
        <Icon name="images" size={32} color="textSecondary" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {t('home.empty.title')}
      </Text>
      <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
        {t('home.empty.body')}
      </Text>
    </View>
  );
}

/**
 * 샘플 캡처 트리거 훅.
 * 번들 sample-ko.png를 localUri로 확보한 뒤 startCapture로 캡처 흐름을 시작한다.
 * 저장 완료 시 capture-store.savedCount가 증가하고, useCaptures가 이를 구독해 자동 새로고침한다.
 */
function useSampleCapture(): { onSimulate: () => void; isSimulating: boolean } {
  const startCapture = useCaptureStore((state) => state.startCapture);
  const [isSimulating, setIsSimulating] = useState(false);
  // 언마운트 후 setState 경고 방지.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onSimulate = useCallback((): void => {
    setIsSimulating(true);
    void (async () => {
      try {
        const asset = Asset.fromModule(SAMPLE_KO);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error('샘플 이미지 경로를 확인할 수 없습니다.');
        }
        // 시뮬레이터에서 현재 OS를 sourcePlatform으로. OCR/업로드 모두 uri 경로.
        const sourcePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
        await startCapture({ imageUri: uri, sourcePlatform, uri });
      } catch (error) {
        console.error('[capture] 샘플 시뮬레이션 실패:', error);
      } finally {
        if (mounted.current) setIsSimulating(false);
      }
    })();
  }, [startCapture]);

  return { onSimulate, isSimulating };
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    gap: spacing.md,
  },
  cell: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: zIndex.sticky,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
  },
});
