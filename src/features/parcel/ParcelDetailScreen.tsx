import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { ParcelProgress } from '@/features/parcel/components/ParcelProgress';
import { ParcelStatusBadge } from '@/features/parcel/components/ParcelStatusBadge';
import { ParcelTimeline } from '@/features/parcel/components/ParcelTimeline';
import { formatParcelTime, parcelEtaText } from '@/features/parcel/eta-text';
import { refreshParcelTracking, startParcelTracking } from '@/features/parcel/start-tracking';
import type { ParcelTrack } from '@/features/parcel/types';
import { maskInvoice } from '@/lib/parcel';
import { ParcelNotConfiguredError, stopParcelTrack } from '@/lib/parcel-api';
import { t } from '@/i18n';
import { useParcelStore } from '@/stores/parcel-store';

type ParcelDetailScreenProps = {
  trackId: string;
};

/**
 * 택배 추적 상세 화면 — design.md §5.
 * 택배사·마스킹 운송장(복사)·현재 상태·eta·진행·타임라인·수동 새로고침·중단/다시추적.
 * 데이터는 parcel-store(공유 목록)에서 찾고, 없으면 store.refresh로 1회 보강한다.
 */
export function ParcelDetailScreen({ trackId }: ParcelDetailScreenProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();

  const tracks = useParcelStore((state) => state.tracks);
  const refreshList = useParcelStore((state) => state.refresh);
  const upsert = useParcelStore((state) => state.upsert);
  const remove = useParcelStore((state) => state.remove);

  const track = useMemo(() => tracks.find((tr) => tr.id === trackId) ?? null, [tracks, trackId]);

  const [isRefreshing, setIsRefreshing] = useState(false);

  // 목록에 없으면(딥링크 직접 진입 등) 1회 보강한다.
  useEffect(() => {
    if (!track) void refreshList();
  }, [track, refreshList]);

  // 수동 새로고침: 1회 조회 후 store 반영. 키 미설정은 조용히 안내.
  const handleRefresh = useCallback(async (): Promise<void> => {
    if (!track || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = await refreshParcelTracking(track);
      upsert(updated);
    } catch (error) {
      if (error instanceof ParcelNotConfiguredError) {
        toast.show({ tone: 'info', title: t('parcel.notConfigured') });
        return;
      }
      console.error('[parcel/detail] 새로고침 실패:', error);
      toast.show({ tone: 'danger', title: t('parcel.trackError') });
    } finally {
      setIsRefreshing(false);
    }
  }, [track, isRefreshing, upsert, toast]);

  // 추적 다시 시작(중단·완료 후): 동일 운송장으로 재등록 + 1회 조회.
  const handleRestart = useCallback(async (): Promise<void> => {
    if (!track || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const restarted = await startParcelTracking({
        captureId: track.captureId,
        carrierCode: track.carrierCode,
        carrierName: track.carrierName,
        invoiceNo: track.invoiceNo,
      });
      upsert(restarted);
    } catch (error) {
      if (error instanceof ParcelNotConfiguredError) {
        toast.show({ tone: 'info', title: t('parcel.notConfigured') });
        return;
      }
      console.error('[parcel/detail] 다시 추적 실패:', error);
      toast.show({ tone: 'danger', title: t('parcel.trackError') });
    } finally {
      setIsRefreshing(false);
    }
  }, [track, isRefreshing, upsert, toast]);

  // 추적 중단(아카이브) — 확인 후. 목록에서 제거하고 뒤로 간다.
  const handleStop = useCallback((): void => {
    if (!track) return;
    Alert.alert(t('parcel.trackingStopped'), t('parcel.trackingStoppedBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('parcel.trackingStopped'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await stopParcelTrack(track.id);
              remove(track.id);
              router.back();
            } catch (error) {
              console.error('[parcel/detail] 추적 중단 실패:', error);
              toast.show({ tone: 'danger', title: t('parcel.trackError') });
            }
          })();
        },
      },
    ]);
  }, [track, remove, router, toast]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!track) return;
    try {
      await Clipboard.setStringAsync(track.invoiceNo);
      toast.show({ tone: 'success', title: t('parcel.copied') });
    } catch (error) {
      console.error('[parcel/detail] 운송장 복사 실패:', error);
    }
  }, [track, toast]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t('parcel.detailTitle'),
          headerRight: () =>
            track ? (
              <Pressable
                onPress={() => void handleRefresh()}
                disabled={isRefreshing}
                accessibilityRole="button"
                accessibilityLabel={t('parcel.refresh')}
                hitSlop={spacing.sm}
                style={styles.headerButton}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Icon name="refresh-cw" size={24} color="textPrimary" />
                )}
              </Pressable>
            ) : null,
        }}
      />
      {track ? (
        <DetailBody
          track={track}
          insetBottom={insets.bottom}
          onCopy={handleCopy}
          onStop={handleStop}
          onRestart={handleRestart}
          isRefreshing={isRefreshing}
        />
      ) : (
        <View style={[styles.flex, styles.center]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

type DetailBodyProps = {
  track: ParcelTrack;
  insetBottom: number;
  onCopy: () => void;
  onStop: () => void;
  onRestart: () => void;
  isRefreshing: boolean;
};

function DetailBody({
  track,
  insetBottom,
  onCopy,
  onStop,
  onRestart,
  isRefreshing,
}: DetailBodyProps): ReactNode {
  const { colors } = useTheme();
  const carrier = track.carrierName ?? t('parcel.sectionTitle');
  const status = track.statusText ?? t(`parcel.status.level${Math.max(1, Math.min(6, track.level))}`);
  const eta = parcelEtaText(track.level, track.estimate);
  const isStopped = track.state === 'stopped';
  const isDelivered = track.state === 'delivered' || track.level >= 6;

  const contentStyle = useMemo(
    () => ({
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: insetBottom + spacing['4xl'],
      gap: spacing.xl,
    }),
    [insetBottom],
  );

  return (
    <ScrollView style={styles.flex} contentContainerStyle={contentStyle}>
      {/* 택배사 + 마스킹 운송장 + 복사 */}
      <View style={styles.headerBlock}>
        <View style={styles.carrierRow}>
          <Icon name="package" size={20} color="primary" />
          <Text style={[styles.carrier, { color: colors.textPrimary }]} numberOfLines={1}>
            {carrier}
          </Text>
        </View>
        <View style={styles.invoiceRow}>
          <Text style={[styles.invoice, { color: colors.textSecondary }]}>
            {maskInvoice(track.invoiceNo)}
          </Text>
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={t('parcel.copyInvoice')}
            hitSlop={spacing.sm}
            style={styles.copyButton}
          >
            <Icon name="copy" size={20} color="textSecondary" />
          </Pressable>
        </View>
      </View>

      {/* 현재 상태 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('parcel.currentStatus')}
        </Text>
        <View style={styles.statusBadge}>
          <ParcelStatusBadge level={track.level} />
        </View>
        <Text style={[styles.statusText, { color: colors.textPrimary }]}>{status}</Text>
        {eta ? (
          <Text style={[styles.etaText, { color: track.level === 5 ? colors.accent : colors.textSecondary }]}>
            {eta}
          </Text>
        ) : null}
        {isDelivered && track.deliveredAt ? (
          <Text style={[styles.etaText, { color: colors.textSecondary }]}>
            {t('parcel.deliveredAt', { date: formatParcelTime(track.deliveredAt) })}
          </Text>
        ) : null}
        <View style={styles.progress}>
          <ParcelProgress level={track.level} />
        </View>
      </View>

      {/* 중단 안내 */}
      {isStopped ? (
        <Card variant="outlined">
          <Text style={[styles.stoppedTitle, { color: colors.textPrimary }]}>
            {t('parcel.trackingStopped')}
          </Text>
          <Text style={[styles.stoppedBody, { color: colors.textSecondary }]}>
            {t('parcel.trackingStoppedBody')}
          </Text>
        </Card>
      ) : null}

      {/* 타임라인 */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          {t('parcel.timelineTitle')}
        </Text>
        <ParcelTimeline events={track.events} currentLevel={track.level} />
      </View>

      {/* 액션 */}
      <View style={styles.actions}>
        {isStopped || isDelivered ? (
          <Button
            variant="primary"
            size="lg"
            loading={isRefreshing}
            onPress={onRestart}
            accessibilityLabel={t('parcel.restartTracking')}
            leftIcon={<Icon name="refresh-cw" size={20} color="onPrimary" />}
          >
            {t('parcel.restartTracking')}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            onPress={onStop}
            accessibilityLabel={t('parcel.trackingStopped')}
          >
            {t('parcel.trackingStopped')}
          </Button>
        )}
      </View>

      {track.lastCheckedAt ? (
        <Text style={[styles.lastChecked, { color: colors.textSecondary }]}>
          {t('parcel.lastRefreshed', { time: formatParcelTime(track.lastCheckedAt) })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    gap: spacing.sm,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  carrier: {
    flex: 1,
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
    letterSpacing: letterSpacingFor('title'),
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  invoice: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  copyButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  statusBadge: {
    flexDirection: 'row',
  },
  statusText: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
  etaText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  progress: {
    marginTop: spacing.md,
  },
  stoppedTitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  stoppedBody: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.md,
  },
  lastChecked: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    textAlign: 'center',
  },
});
