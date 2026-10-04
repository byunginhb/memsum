import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Stack, useRouter } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Header } from '@/design/components/Header/Header';
import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { ParcelProgress } from '@/features/parcel/components/ParcelProgress';
import { ParcelTimeline } from '@/features/parcel/components/ParcelTimeline';
import { formatParcelTime, parcelEtaText } from '@/features/parcel/eta-text';
import { refreshParcelTracking, startParcelTracking } from '@/features/parcel/start-tracking';
import type { ParcelTrack } from '@/features/parcel/types';
import { levelToStatusKey, maskInvoice } from '@/lib/parcel';
import { ParcelNotConfiguredError, stopParcelTrack } from '@/lib/parcel-api';
import { t } from '@/i18n';
import { useParcelStore } from '@/stores/parcel-store';

/** 배송 완료 단계. */
const LEVEL_DELIVERED = 6;
/** 배송 출발(오늘 도착 예상) 단계 — 도착 예상 문구를 코발트로 강조한다. */
const LEVEL_OUT_FOR_DELIVERY = 5;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;
/** 중단 안내 메모의 왼쪽 막대 두께. */
const NOTE_RULE_WIDTH = 2;

type ParcelDetailScreenProps = {
  trackId: string;
};

/**
 * 택배 추적 상세 화면.
 *
 * 공용 Header(뒤로·새로고침) → 택배사 머리표 + 현재 상태(display) + 도착 예상 → 진행 점 →
 * 운송장(monoLg, 복사) → 배송 기록(구분선 타임라인) → 추적 그만하기/다시 추적.
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

  // 알림 딥링크로 바로 열렸다면 돌아갈 화면이 없으니 홈으로.
  const handleBack = useCallback((): void => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  }, [router]);

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

  // 추적 그만하기 — 무엇이 바뀌는지 알린 뒤 확인받는다. 목록에서 빼고 뒤로 간다.
  const handleStop = useCallback((): void => {
    if (!track) return;
    Alert.alert(t('parcel.stop.confirmTitle'), t('parcel.stop.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('parcel.stop.confirm'),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await stopParcelTrack(track.id);
              remove(track.id);
              handleBack();
            } catch (error) {
              console.error('[parcel/detail] 추적 중단 실패:', error);
              toast.show({ tone: 'danger', title: t('parcel.stop.error') });
            }
          })();
        },
      },
    ]);
  }, [track, remove, handleBack, toast]);

  const handleCopy = useCallback(async (): Promise<void> => {
    if (!track) return;
    try {
      await Clipboard.setStringAsync(track.invoiceNo);
      toast.show({ tone: 'success', title: t('parcel.copied') });
    } catch (error) {
      console.error('[parcel/detail] 운송장 복사 실패:', error);
    }
  }, [track, toast]);

  const refreshButton = track ? (
    <PressableScale
      onPress={() => void handleRefresh()}
      disabled={isRefreshing}
      accessibilityRole="button"
      accessibilityLabel={t('parcel.refresh')}
      accessibilityState={{ busy: isRefreshing }}
      style={styles.iconButton}
    >
      {isRefreshing ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="refresh-cw" size={24} color="textPrimary" />
      )}
    </PressableScale>
  ) : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={t('parcel.detailTitle')}
        onBack={handleBack}
        backLabel={t('common.back')}
        right={refreshButton}
        topInset={insets.top}
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
  const status = track.statusText ?? t(levelToStatusKey(track.level));
  const eta = parcelEtaText(track.level, track.estimate);
  const isStopped = track.state === 'stopped';
  const isDelivered = track.state === 'delivered' || track.level >= LEVEL_DELIVERED;
  const masked = maskInvoice(track.invoiceNo);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingBottom: insetBottom + spacing['4xl'] }]}
    >
      {/* 택배사 머리표 + 현재 상태 + 도착 예상 */}
      <View style={styles.statusBlock}>
        <Eyebrow>{carrier}</Eyebrow>
        <Text variant="display" accessibilityRole="header">
          {status}
        </Text>
        {eta ? (
          // 도착 예상은 글자색으로 형광펜을 쓰지 않는다 — 출발 단계만 코발트, 나머지는 잉크.
          <Text
            variant="bodyStrong"
            color={track.level === LEVEL_OUT_FOR_DELIVERY ? 'primary' : 'textPrimary'}
          >
            {eta}
          </Text>
        ) : null}
        {isDelivered && track.deliveredAt ? (
          <Text variant="body" color="textSecondary">
            {t('parcel.deliveredAt', { date: formatParcelTime(track.deliveredAt) })}
          </Text>
        ) : null}
      </View>

      <ParcelProgress level={track.level} />

      {/* 운송장 — mono로 또박또박, 오른쪽에 복사 */}
      <View style={[styles.invoiceRow, { borderColor: colors.border }]}>
        <View style={styles.invoiceText}>
          <Eyebrow>{t('parcel.manualInvoice')}</Eyebrow>
          <Text variant="monoLg" accessibilityLabel={`${t('parcel.manualInvoice')} ${masked}`}>
            {masked}
          </Text>
        </View>
        <PressableScale
          onPress={onCopy}
          accessibilityRole="button"
          accessibilityLabel={t('parcel.copyInvoice')}
          style={styles.iconButton}
        >
          <Icon name="copy" size={20} color="textSecondary" />
        </PressableScale>
      </View>

      {/* 중단 안내 — 카드 대신 왼쪽 막대 메모 */}
      {isStopped ? (
        <View style={[styles.note, { borderLeftColor: colors.borderStrong }]}>
          <Text variant="bodyStrong">{t('parcel.trackingStopped')}</Text>
          <Text variant="caption" color="textSecondary">
            {t('parcel.trackingStoppedBody')}
          </Text>
        </View>
      ) : null}

      {/* 배송 기록 */}
      <View style={styles.section}>
        <Eyebrow accessibilityRole="header">{t('parcel.timelineTitle')}</Eyebrow>
        <ParcelTimeline events={track.events} currentLevel={track.level} />
      </View>

      {track.lastCheckedAt ? (
        <Eyebrow>{t('parcel.lastRefreshed', { time: formatParcelTime(track.lastCheckedAt) })}</Eyebrow>
      ) : null}

      {isStopped || isDelivered ? (
        <Button
          variant="primary"
          size="lg"
          fullWidth
          loading={isRefreshing}
          onPress={onRestart}
          accessibilityLabel={t('parcel.restartTracking')}
          leftIcon={<Icon name="refresh-cw" size={20} color="onPrimary" />}
        >
          {t('parcel.restartTracking')}
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="md"
          onPress={onStop}
          accessibilityLabel={t('parcel.stop.action')}
          style={styles.stopButton}
        >
          {t('parcel.stop.action')}
        </Button>
      )}
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
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing['2xl'],
  },
  iconButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBlock: {
    gap: spacing.sm,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  invoiceText: {
    flex: 1,
    gap: spacing.xs,
  },
  note: {
    borderLeftWidth: NOTE_RULE_WIDTH,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
  stopButton: {
    alignSelf: 'flex-start',
    // ghost 버튼 안쪽 여백만큼 당겨 본문 시작선에 맞춘다.
    marginLeft: -spacing.lg,
  },
});
