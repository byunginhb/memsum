import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/design/components/Card/Card';
import type { CardVariant } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography } from '@/design/tokens';
import { ParcelProgress } from '@/features/parcel/components/ParcelProgress';
import { formatParcelTime, parcelEtaText } from '@/features/parcel/eta-text';
import type { ParcelTrack } from '@/features/parcel/types';
import { maskInvoice } from '@/lib/parcel';
import { t } from '@/i18n';

type ParcelTrackCardProps = {
  track: ParcelTrack;
  onPress: (id: string) => void;
};

/** level → 카드 변형. 완료는 조용한 outlined, 그 외는 elevated(level5는 accent 강조 보더). */
function cardVariant(level: number): CardVariant {
  if (level >= 6) return 'outlined';
  if (level === 5) return 'highlight';
  return 'elevated';
}

/**
 * ParcelTrackCard — 홈 콤팩트 카드(design.md §4.2).
 * 택배사 + 마스킹 운송장 + 진행 dot + 상태 문구 + eta 문구(가능성형).
 * 탭하면 상세 라우트로 이동한다.
 */
export function ParcelTrackCard({ track, onPress }: ParcelTrackCardProps): ReactNode {
  const { colors } = useTheme();
  const carrier = track.carrierName ?? t('parcel.sectionTitle');
  const status = track.statusText ?? t(statusFallbackKey(track.level));
  const eta = parcelEtaText(track.level, track.estimate);
  // level5(배송 출발)·완료 eta는 강조(accent), 그 외는 보조색.
  const etaColor = track.level === 5 ? colors.accent : colors.textSecondary;

  return (
    <Card variant={cardVariant(track.level)} padding="normal" onPress={() => onPress(track.id)}>
      <View style={styles.headerRow}>
        <Icon
          name={track.level >= 6 ? 'check-circle' : track.level === 5 ? 'truck' : 'package'}
          size={20}
          color={track.level === 5 ? 'accent' : 'primary'}
        />
        <Text style={[styles.carrier, { color: colors.textPrimary }]} numberOfLines={1}>
          {carrier}
        </Text>
        <Text style={[styles.invoice, { color: colors.textSecondary }]} numberOfLines={1}>
          {maskInvoice(track.invoiceNo)}
        </Text>
      </View>

      <View style={styles.progress}>
        <ParcelProgress level={track.level} />
      </View>

      <Text style={[styles.status, { color: colors.textPrimary }]}>{status}</Text>
      {eta ? <Text style={[styles.eta, { color: etaColor }]}>{eta}</Text> : null}

      {track.lastWhere && track.lastEventAt ? (
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {`${track.lastWhere} · ${formatParcelTime(track.lastEventAt)}`}
        </Text>
      ) : null}
    </Card>
  );
}

/** statusText가 비어 있을 때의 i18n 폴백 키. */
function statusFallbackKey(level: number): string {
  return `parcel.status.level${Math.max(1, Math.min(6, level))}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carrier: {
    flex: 1,
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  invoice: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  progress: {
    marginVertical: spacing.md,
  },
  status: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  eta: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    marginTop: spacing.sm,
  },
});
