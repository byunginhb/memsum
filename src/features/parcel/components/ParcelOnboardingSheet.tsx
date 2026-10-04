import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { ParcelSheet } from '@/features/parcel/components/ParcelSheet';
import { t } from '@/i18n';

type ParcelOnboardingSheetProps = {
  visible: boolean;
  /** "나중에" — 토글 원복(호출측 책임). */
  onCancel: () => void;
  /** "시작하기" — parcelOnboarded=true 커밋(호출측 책임). */
  onConfirm: () => void;
};

/** 정직한 한계 고지 3종. i18n 키로 고정. */
const DISCLAIMER_KEYS = [
  'settings.parcel.disclaimer1',
  'settings.parcel.disclaimer2',
  'settings.parcel.disclaimer3',
] as const;

/**
 * ParcelOnboardingSheet — 택배 추적을 처음 켤 때 무엇을 하고 무엇을 못 하는지 먼저 알린다.
 * "도착 예정일은 알기 어렵다"는 기대치 설정이 핵심. 한계 3줄은 구분선 목록으로.
 */
export function ParcelOnboardingSheet({
  visible,
  onCancel,
  onConfirm,
}: ParcelOnboardingSheetProps): ReactNode {
  const { colors } = useTheme();

  return (
    <ParcelSheet
      visible={visible}
      onClose={onCancel}
      eyebrow={t('parcel.sheetEyebrow')}
      title={t('settings.parcel.onboardingTitle')}
    >
      <Text variant="body">{t('settings.parcel.onboardingBody')}</Text>

      <View accessibilityRole="list">
        {DISCLAIMER_KEYS.map((key, index) => (
          <Text
            key={key}
            variant="caption"
            color="textSecondary"
            style={[
              styles.disclaimer,
              index > 0
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
                : null,
            ]}
          >
            {t(key)}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          variant="secondary"
          size="lg"
          onPress={onCancel}
          accessibilityLabel={t('settings.parcel.ctaLater')}
          style={styles.flexItem}
        >
          {t('settings.parcel.ctaLater')}
        </Button>
        <Button
          variant="primary"
          size="lg"
          onPress={onConfirm}
          accessibilityLabel={t('settings.parcel.ctaStart')}
          style={styles.flexItem}
        >
          {t('settings.parcel.ctaStart')}
        </Button>
      </View>
    </ParcelSheet>
  );
}

const styles = StyleSheet.create({
  disclaimer: {
    paddingVertical: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
});
