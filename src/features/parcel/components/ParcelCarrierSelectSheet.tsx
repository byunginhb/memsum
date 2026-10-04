import { useState } from 'react';
import type { ReactNode } from 'react';

import { Button } from '@/design/components/Button/Button';
import { CarrierRadioList } from '@/features/parcel/components/CarrierRadioList';
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
 * ParcelCarrierSelectSheet — 복수 택배사 후보 중 선택.
 * 구분선 라디오 목록에서 하나 고르고 "택배 추적 시작"으로 확정한다.
 */
export function ParcelCarrierSelectSheet({
  visible,
  candidates,
  onClose,
  onSelect,
  busy = false,
}: ParcelCarrierSelectSheetProps): ReactNode {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const selected = candidates.find((c) => c.code === selectedCode) ?? null;

  const handleConfirm = (): void => {
    if (!selected) return;
    onSelect(selected);
  };

  return (
    <ParcelSheet
      visible={visible}
      onClose={onClose}
      eyebrow={t('parcel.sheetEyebrow')}
      title={t('capture.parcel.carrierSelectTitle')}
    >
      <CarrierRadioList
        carriers={candidates}
        selectedCode={selectedCode}
        onSelect={setSelectedCode}
        label={t('capture.parcel.carrierSelectTitle')}
      />

      <Button
        variant="primary"
        size="lg"
        fullWidth
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
