import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import { ParcelTrackCard } from '@/features/parcel/components/ParcelTrackCard';
import type { ParcelTrack } from '@/features/parcel/types';
import { getLocale, t } from '@/i18n';
import { useParcelStore } from '@/stores/parcel-store';
import { useSettingsStore } from '@/stores/settings-store';

/** 배송완료 후 홈 섹션에서 숨기기까지의 유예(24h). design.md §4.1. */
const DELIVERED_HIDE_MS = 24 * 60 * 60 * 1000;

/**
 * 홈에 표시할 추적만 추린다.
 * - 중단(stopped) 제외(목록 자체가 제외하지만 방어적으로 한 번 더).
 * - 배송완료 후 24h 경과분 숨김(deliveredAt 우선, 없으면 lastCheckedAt 기준).
 */
function visibleTracks(tracks: ParcelTrack[], now: number): ParcelTrack[] {
  return tracks.filter((track) => {
    if (track.state === 'stopped') return false;
    const delivered = track.state === 'delivered' || track.level >= 6;
    if (!delivered) return true;
    const ref = track.deliveredAt ?? track.lastCheckedAt;
    if (!ref) return true;
    const refMs = new Date(ref).getTime();
    if (Number.isNaN(refMs)) return true;
    return now - refMs < DELIVERED_HIDE_MS;
  });
}

/**
 * ParcelHomeSection — 홈 "배송 현황" 섹션(design.md §4).
 *
 * 노출 조건: ko + parcelTracking ON + 표시할 활성 택배 ≥ 1. 그 외엔 null(섹션 자체 미렌더).
 * 마운트 시 목록을 1회 새로고침하고(폴링 훅과 별개로 화면 진입 시 최신화), 카드 리스트를 그린다.
 */
export function ParcelHomeSection(): ReactNode {
  const { colors } = useTheme();
  const router = useRouter();

  const parcelTracking = useSettingsStore((state) => state.parcelTracking);
  const tracks = useParcelStore((state) => state.tracks);
  const refresh = useParcelStore((state) => state.refresh);

  const enabled = getLocale() === 'ko' && parcelTracking;

  // 화면 진입 시 1회 최신화(토글 ON 상태에서만).
  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  // 24h 숨김 기준 시각은 마운트 1회만 고정한다(렌더 중 Date.now() 호출 회피 — 순수성 규칙).
  // 화면 진입마다 재마운트되므로 기준이 충분히 최신이다.
  const [now] = useState(() => Date.now());
  const shown = useMemo(() => visibleTracks(tracks, now), [tracks, now]);

  const handleOpen = useCallback(
    (id: string): void => {
      router.push({ pathname: '/parcel/[id]', params: { id } });
    },
    [router],
  );

  // 게이트 미충족 또는 표시할 택배 없음 → 섹션 자체를 렌더하지 않는다.
  if (!enabled || shown.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionLabel, { color: colors.textSecondary }]}
        >
          {t('parcel.sectionTitle')}
        </Text>
        <Icon name="truck" size={16} color="textSecondary" />
      </View>
      <View style={styles.cards}>
        {shown.map((track) => (
          <ParcelTrackCard key={track.id} track={track} onPress={handleOpen} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  cards: {
    gap: spacing.md,
  },
});
