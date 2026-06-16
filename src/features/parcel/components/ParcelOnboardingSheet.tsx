import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography } from '@/design/tokens';
import { ParcelSheet } from '@/features/parcel/components/ParcelSheet';
import { t } from '@/i18n';

type ParcelOnboardingSheetProps = {
  visible: boolean;
  /** "나중에" — 토글 원복(호출측 책임). */
  onCancel: () => void;
  /** "시작하기" — parcelOnboarded=true 커밋(호출측 책임). */
  onConfirm: () => void;
};

/** 정직한 한계 고지 3종(design.md §9.2). i18n 키로 고정. */
const DISCLAIMER_KEYS = [
  'settings.parcel.disclaimer1',
  'settings.parcel.disclaimer2',
  'settings.parcel.disclaimer3',
] as const;

/**
 * ParcelOnboardingSheet — 최초 토글 ON 시 한계를 정직하게 고지한다(design.md §2.1).
 * "도착 예정일은 알기 어렵다"는 기대치 설정이 핵심. 단정형 카피 금지.
 */
export function ParcelOnboardingSheet({
  visible,
  onCancel,
  onConfirm,
}: ParcelOnboardingSheetProps): ReactNode {
  const { colors } = useTheme();

  return (
    <ParcelSheet visible={visible} onClose={onCancel} title={t('settings.parcel.onboardingTitle')}>
      <Text style={[styles.body, { color: colors.textPrimary }]}>
        {t('settings.parcel.onboardingBody')}
      </Text>

      <View style={styles.disclaimers}>
        {DISCLAIMER_KEYS.map((key) => (
          <View key={key} style={styles.disclaimerRow}>
            <Icon name="alert-circle" size={16} color="textSecondary" />
            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t(key)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <View style={styles.flexItem}>
          <Button
            variant="secondary"
            size="md"
            onPress={onCancel}
            accessibilityLabel={t('settings.parcel.ctaLater')}
          >
            {t('settings.parcel.ctaLater')}
          </Button>
        </View>
        <View style={styles.flexItem}>
          <Button
            variant="primary"
            size="md"
            onPress={onConfirm}
            accessibilityLabel={t('settings.parcel.ctaStart')}
          >
            {t('settings.parcel.ctaStart')}
          </Button>
        </View>
      </View>
    </ParcelSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  disclaimers: {
    gap: spacing.md,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  disclaimer: {
    flex: 1,
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
});
