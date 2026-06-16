import { useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { ParcelSheet } from '@/features/parcel/components/ParcelSheet';
import type { ParcelCarrier } from '@/features/parcel/types';
import { t } from '@/i18n';

type ParcelCarrierSelectSheetProps = {
  visible: boolean;
  candidates: ParcelCarrier[];
  onClose: () => void;
  /** 택배사 확정 시 호출(상위가 createParcelTrack→trackParcel 진행). */
  onSelect: (carrier: ParcelCarrier) => void;
  /** 추적 시작 진행 중(중복 탭 방지·버튼 로딩). */
  busy?: boolean;
};

/**
 * ParcelCarrierSelectSheet — 복수 택배사 후보 중 선택(design.md §3.2).
 * 라디오형 리스트에서 하나 고르고 "추적 시작"으로 확정한다.
 */
export function ParcelCarrierSelectSheet({
  visible,
  candidates,
  onClose,
  onSelect,
  busy = false,
}: ParcelCarrierSelectSheetProps): ReactNode {
  const { colors } = useTheme();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const selected = candidates.find((c) => c.code === selectedCode) ?? null;

  const handleConfirm = (): void => {
    if (!selected) return;
    onSelect(selected);
  };

  return (
    <ParcelSheet visible={visible} onClose={onClose} title={t('capture.parcel.carrierSelectTitle')}>
      <View
        style={styles.list}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('capture.parcel.carrierSelectTitle')}
      >
        {candidates.map((carrier) => {
          const isSelected = carrier.code === selectedCode;
          return (
            <Pressable
              key={carrier.code}
              onPress={() => setSelectedCode(carrier.code)}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={carrier.name}
              style={[
                styles.option,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primaryMuted : colors.bgSurface,
                },
              ]}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                {carrier.name}
              </Text>
              {isSelected ? <Icon name="check" size={20} color="primary" /> : null}
            </Pressable>
          );
        })}
      </View>

      <Button
        variant="primary"
        size="md"
        loading={busy}
        disabled={!selected || busy}
        onPress={handleConfirm}
        accessibilityLabel={t('capture.parcel.ctaTrack')}
      >
        {t('capture.parcel.ctaTrack')}
      </Button>
    </ParcelSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  optionLabel: {
    flex: 1,
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
});
