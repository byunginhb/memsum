import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Text } from '@/design/components/Text/Text';
import { useToast } from '@/design/components/Toast';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { ParcelCarrierSelectSheet } from '@/features/parcel/components/ParcelCarrierSelectSheet';
import { ParcelManualInputSheet } from '@/features/parcel/components/ParcelManualInputSheet';
import { startParcelTracking } from '@/features/parcel/start-tracking';
import type { ParcelCarrier } from '@/features/parcel/types';
import { PARCEL_ENABLED } from '@/lib/features';
import { extractParcel, isLikelyParcelSms, maskInvoice, resolveCarrier } from '@/lib/parcel';
import { ParcelNotConfiguredError, recommendCarrier } from '@/lib/parcel-api';
import { getLocale, t } from '@/i18n';
import { useParcelStore } from '@/stores/parcel-store';
import { useSettingsStore } from '@/stores/settings-store';

type ParcelCaptureBlockProps = {
  /** OCR/clean 텍스트(택배 SMS 판별·추출 대상). */
  ocrText: string;
  /** 연결할 캡처 id(서버 uuid). 없으면 null로 등록. */
  captureId?: string | null;
};

/** 시작-추적 흐름 단계. */
type Phase = 'idle' | 'tracking';

/**
 * ParcelCaptureBlock — 캡처 확인 시트 안의 택배 감지 블록. 카드 대신 위아래 구분선으로 나눈다.
 *
 * 노출 조건: ko + parcelTracking ON + isLikelyParcelSms(text). 미충족 시 null.
 * "택배 추적 시작" → recommendCarrier → resolveCarrier(힌트) →
 *   확정되면 createParcelTrack→trackParcel→applyTrackResult(startParcelTracking),
 *   복수/실패면 택배사선택/수동입력 시트로 폴백한다.
 * 키 미설정(ParcelNotConfiguredError)은 조용히 안내한다.
 */
export function ParcelCaptureBlock({ ocrText, captureId }: ParcelCaptureBlockProps): ReactNode {
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const parcelTracking = useSettingsStore((state) => state.parcelTracking);
  const upsert = useParcelStore((state) => state.upsert);

  const [phase, setPhase] = useState<Phase>('idle');
  const [candidates, setCandidates] = useState<ParcelCarrier[]>([]);
  const [isSelectOpen, setSelectOpen] = useState(false);
  const [isManualOpen, setManualOpen] = useState(false);

  const enabled = PARCEL_ENABLED && getLocale() === 'ko' && parcelTracking && isLikelyParcelSms(ocrText);
  const extraction = useMemo(() => (enabled ? extractParcel(ocrText) : null), [enabled, ocrText]);

  // 확정된 택배사로 추적 시작 → store 반영 → 상세로 이동.
  const beginTracking = useCallback(
    async (carrier: ParcelCarrier, invoiceNo: string): Promise<void> => {
      setPhase('tracking');
      try {
        const track = await startParcelTracking({
          captureId: captureId ?? null,
          carrierCode: carrier.code,
          carrierName: carrier.name,
          invoiceNo,
        });
        upsert(track);
        setSelectOpen(false);
        setManualOpen(false);
        router.push({ pathname: '/parcel/[id]', params: { id: track.id } });
      } catch (error) {
        if (error instanceof ParcelNotConfiguredError) {
          toast.show({ tone: 'info', title: t('parcel.notConfigured') });
          return;
        }
        console.error('[parcel] 추적 시작 실패:', error);
        toast.show({ tone: 'danger', title: t('parcel.trackError') });
      } finally {
        setPhase('idle');
      }
    },
    [captureId, upsert, router, toast],
  );

  // "택배 추적 시작" — recommend로 후보 추정 후 분기.
  const handleStart = useCallback(async (): Promise<void> => {
    if (!extraction) return;
    setPhase('tracking');
    try {
      const recommended = await recommendCarrier(extraction.invoiceNo);
      const resolved = resolveCarrier(recommended, extraction.carrierNameHint);
      if (resolved) {
        // 단일 확정 → 즉시 추적 시작(setPhase는 beginTracking이 재설정).
        await beginTracking(resolved, extraction.invoiceNo);
        return;
      }
      if (recommended.length > 1) {
        // 복수 후보 → 선택 시트.
        setCandidates(recommended);
        setSelectOpen(true);
        return;
      }
      // 후보 0개(또는 식별 실패) → 수동 입력 시트.
      setManualOpen(true);
    } catch (error) {
      if (error instanceof ParcelNotConfiguredError) {
        toast.show({ tone: 'info', title: t('parcel.notConfigured') });
        return;
      }
      console.error('[parcel] recommend 실패:', error);
      // 네트워크 등 실패 시에도 수동 입력으로 폴백할 수 있게 한다.
      setManualOpen(true);
    } finally {
      setPhase('idle');
    }
  }, [extraction, beginTracking, toast]);

  if (!enabled || !extraction) return null;

  const carrierLabel = extraction.carrierNameHint
    ? t('capture.parcel.detected', { carrier: extraction.carrierNameHint })
    : t('capture.parcel.detectedGeneric');

  return (
    <>
      <View style={[styles.block, { borderColor: colors.border }]}>
        <Eyebrow>{t('parcel.sheetEyebrow')}</Eyebrow>
        <Text variant="headline" numberOfLines={1}>
          {carrierLabel}
        </Text>
        <Text
          variant="monoLg"
          color="textSecondary"
          accessibilityLabel={t('capture.parcel.invoiceMasked', {
            masked: maskInvoice(extraction.invoiceNo),
          })}
        >
          {maskInvoice(extraction.invoiceNo)}
        </Text>
        <Button
          variant="primary"
          size="md"
          fullWidth
          loading={phase === 'tracking'}
          onPress={() => void handleStart()}
          accessibilityLabel={t('capture.parcel.ctaTrack')}
          style={styles.action}
        >
          {t('capture.parcel.ctaTrack')}
        </Button>
      </View>

      <ParcelCarrierSelectSheet
        visible={isSelectOpen}
        candidates={candidates}
        busy={phase === 'tracking'}
        onClose={() => setSelectOpen(false)}
        onSelect={(carrier) => void beginTracking(carrier, extraction.invoiceNo)}
      />

      <ParcelManualInputSheet
        visible={isManualOpen}
        initialInvoice={extraction.invoiceNo}
        busy={phase === 'tracking'}
        onClose={() => setManualOpen(false)}
        onResolved={(carrier, invoiceNo) => void beginTracking(carrier, invoiceNo)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  block: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  action: {
    marginTop: spacing.md,
  },
});
