import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';

import { Header } from '@/design/components/Header/Header';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { ParcelDetailScreen } from '@/features/parcel/ParcelDetailScreen';
import { getLocale, t } from '@/i18n';
import { PARCEL_ENABLED } from '@/lib/features';

/**
 * 택배 추적 상세 라우트 (/parcel/[id]).
 *
 * 기능 스위치(PARCEL_ENABLED)가 꺼져 있으면 홈으로 돌려보낸다(옛 알림·딥링크 진입 방어).
 * 한국(ko) 한정 기능이라 그 외 로케일에서는 화면을 열지 않는다(조용한 안내).
 * 추적 id를 params로 받아 상세 화면에 넘긴다.
 */
export default function ParcelDetailRoute(): ReactNode {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  if (!PARCEL_ENABLED) {
    return <Redirect href="/" />;
  }

  // ko 외 로케일 가드 — 코드 경로 자체를 열지 않는다.
  if (getLocale() !== 'ko') {
    return <LocaleGuard />;
  }

  return <ParcelDetailScreen trackId={id} />;
}

/** ko 외 진입 시 안내 화면(딥링크 직접 진입 방어). */
function LocaleGuard(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = (): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={t('parcel.detailTitle')}
        onBack={handleBack}
        backLabel={t('common.back')}
        topInset={insets.top}
      />
      <Text variant="body" color="textSecondary" style={styles.guardText}>
        {t('parcel.notConfigured')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  guardText: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});
