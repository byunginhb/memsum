import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import { formatParcelStamp, formatParcelTime } from '@/features/parcel/eta-text';
import type { ParcelEvent, ParcelLevel } from '@/features/parcel/types';
import { t } from '@/i18n';

type ParcelTimelineProps = {
  /** 배송 이벤트(API 정규화 형태). 순서는 여기서 최신순으로 다시 정렬한다. */
  events: ParcelEvent[];
  /** 현재 진행 단계(완료 표시용). */
  currentLevel: ParcelLevel;
};

/** 왼쪽 시각 열 너비 — mono "10.04"/"14:32"가 들어가는 고정 폭. */
const STAMP_COLUMN = 56;
/** 최신 이벤트 표시 점. */
const LATEST_DOT = 8;
/** 한 칸 안 두 줄(날짜·시각, 상태·위치) 사이의 좁은 간격. */
const LINE_GAP = 2;

/**
 * ParcelTimeline — 배송 기록을 구분선 행으로 나열한다.
 *
 * 왼쪽 열은 mono 날짜·시각, 오른쪽은 상태(종류)와 위치. 행 사이는 머리카락 구분선.
 * 맨 위(최신) 행만 글자를 진하게 하고 코발트 점(완료면 success)을 붙인다.
 */
export function ParcelTimeline({ events, currentLevel }: ParcelTimelineProps): ReactNode {
  const { colors } = useTheme();

  if (events.length === 0) {
    return (
      <Text variant="caption" color="textSecondary">
        {t('parcel.timelineEmpty')}
      </Text>
    );
  }

  // SweetTracker는 과거→최신 순으로 준다. 최신을 맨 위에 두려고 timeString 내림차순 정렬
  // (형식 "YYYY-MM-DD HH:mm:ss"는 사전식 정렬 = 시간순).
  const ordered = [...events].sort((a, b) => (b.timeString ?? '').localeCompare(a.timeString ?? ''));

  return (
    <View accessibilityRole="list">
      {ordered.map((event, index) => {
        const isLatest = index === 0;
        const isLast = index === ordered.length - 1;
        const stamp = formatParcelStamp(event.timeString);
        const kind = event.kind.length > 0 ? event.kind : '—';
        const dotColor = currentLevel >= 6 ? colors.success : colors.primary;
        const a11y = [kind, event.where, formatParcelTime(event.timeString)]
          .filter((s) => s.length > 0)
          .join(', ');

        return (
          <View
            key={`${event.timeString}-${index}`}
            accessible
            accessibilityLabel={a11y}
            style={[
              styles.row,
              !isLast
                ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }
                : null,
            ]}
          >
            <View style={styles.stamp}>
              {stamp ? (
                <>
                  <Text variant="mono" color="textSecondary">
                    {stamp.date}
                  </Text>
                  <Text variant="monoLg" color={isLatest ? 'textPrimary' : 'textSecondary'}>
                    {stamp.time}
                  </Text>
                </>
              ) : null}
            </View>

            <View style={styles.body}>
              <View style={styles.kindRow}>
                {isLatest ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
                <Text
                  variant={isLatest ? 'bodyStrong' : 'body'}
                  color={isLatest ? 'textPrimary' : 'textSecondary'}
                  style={styles.kind}
                >
                  {kind}
                </Text>
              </View>
              {event.where.length > 0 ? (
                <Text variant="caption" color="textSecondary">
                  {event.where}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingVertical: spacing.md,
  },
  stamp: {
    width: STAMP_COLUMN,
    gap: LINE_GAP,
  },
  body: {
    flex: 1,
    gap: LINE_GAP,
  },
  kindRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kind: {
    flexShrink: 1,
  },
  dot: {
    width: LATEST_DOT,
    height: LATEST_DOT,
    borderRadius: radius.pill,
  },
});
