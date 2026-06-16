import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography } from '@/design/tokens';
import { ParcelDetailScreen } from '@/features/parcel/ParcelDetailScreen';
import { getLocale, t } from '@/i18n';

/**
 * 택배 추적 상세 라우트 (/parcel/[id]).
 *
 * 한국(ko) 한정 기능이라 그 외 로케일에서는 화면을 열지 않는다(조용한 안내).
 * 추적 id를 params로 받아 상세 화면에 넘긴다.
 */
export default function ParcelDetailRoute(): ReactNode {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  // ko 외 로케일 가드 — 코드 경로 자체를 열지 않는다.
  if (getLocale() !== 'ko') {
    return <LocaleGuard />;
  }

  return <ParcelDetailScreen trackId={id} />;
}

/** ko 외 진입 시 빈 안내 화면(딥링크 직접 진입 방어). */
function LocaleGuard(): ReactNode {
  const { colors } = useTheme();
  return (
    <View style={[styles.guard, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ headerShown: true, title: t('parcel.detailTitle') }} />
      <Text style={[styles.guardText, { color: colors.textSecondary }]}>
        {t('parcel.notConfigured')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  guard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  guardText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
  },
});
