import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { Input } from '@/design/components/Input/Input';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { ParcelSheet } from '@/features/parcel/components/ParcelSheet';
import type { ParcelCarrier } from '@/features/parcel/types';
import { extractInvoice } from '@/lib/parcel';
import { ParcelNotConfiguredError, recommendCarrier } from '@/lib/parcel-api';
import { t } from '@/i18n';

type ParcelManualInputSheetProps = {
  visible: boolean;
  /** 시작 운송장(캡처에서 부분 추출된 값). 비면 빈 입력으로 시작. */
  initialInvoice?: string;
  onClose: () => void;
  /** 택배사+운송장 확정 시 호출(상위가 createParcelTrack→trackParcel 진행). */
  onResolved: (carrier: ParcelCarrier, invoiceNo: string) => void;
  /** 상위 추적 시작 진행 중. */
  busy?: boolean;
};

/**
 * ParcelManualInputSheet — 운송장 직접 입력 → recommendCarrier로 후보 추정 → 선택(design.md §5.3).
 *
 * 운송장만 입력받고 택배사는 recommend API로 추정한다(코드 하드코딩 회피).
 * 후보 1개면 자동 선택, 복수면 라디오 선택. 키 미설정은 조용히 안내(notConfigured).
 */
export function ParcelManualInputSheet({
  visible,
  initialInvoice = '',
  onClose,
  onResolved,
  busy = false,
}: ParcelManualInputSheetProps): ReactNode {
  const { colors } = useTheme();
  const toast = useToast();

  const [invoice, setInvoice] = useState(initialInvoice);
  const [candidates, setCandidates] = useState<ParcelCarrier[]>([]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [isRecommending, setIsRecommending] = useState(false);

  // visible false→true 전환 시 초기값으로 동기화(NicknameEditSheet 선례 패턴).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setInvoice(initialInvoice);
      setCandidates([]);
      setSelectedCode(null);
    }
  }

  const digits = extractInvoice(invoice);

  // 운송장 → recommend 후보 조회. 1개면 자동 선택, 복수면 사용자 선택 대기.
  const handleRecommend = useCallback(async (): Promise<void> => {
    if (!digits) return;
    setIsRecommending(true);
    try {
      const result = await recommendCarrier(digits);
      setCandidates(result);
      setSelectedCode(result.length === 1 ? result[0].code : null);
      if (result.length === 0) {
        toast.show({ tone: 'warning', title: t('capture.parcel.identifyFailed') });
      }
    } catch (error) {
      if (error instanceof ParcelNotConfiguredError) {
        toast.show({ tone: 'info', title: t('parcel.notConfigured') });
        return;
      }
      console.error('[parcel] recommend 실패:', error);
      toast.show({ tone: 'danger', title: t('parcel.trackError') });
    } finally {
      setIsRecommending(false);
    }
  }, [digits, toast]);

  const selected = candidates.find((c) => c.code === selectedCode) ?? null;

  const handleConfirm = (): void => {
    if (!selected || !digits) return;
    onResolved(selected, digits);
  };

  return (
    <ParcelSheet visible={visible} onClose={onClose} title={t('parcel.manualInputTitle')}>
      <Input
        variant="filled"
        size="md"
        label={t('parcel.manualInvoice')}
        placeholder={t('parcel.manualInvoice')}
        value={invoice}
        onChangeText={setInvoice}
      />

      {candidates.length === 0 ? (
        <Button
          variant="secondary"
          size="md"
          loading={isRecommending}
          disabled={!digits || isRecommending}
          onPress={() => void handleRecommend()}
          accessibilityLabel={t('parcel.manualCarrier')}
        >
          {t('parcel.manualCarrier')}
        </Button>
      ) : (
        <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t('parcel.manualCarrier')}>
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
      )}

      {isRecommending ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : null}

      <Button
        variant="primary"
        size="md"
        loading={busy}
        disabled={!selected || busy}
        onPress={handleConfirm}
        accessibilityLabel={t('parcel.manualCta')}
      >
        {t('parcel.manualCta')}
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
