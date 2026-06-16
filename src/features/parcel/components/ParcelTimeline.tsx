import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { formatParcelTime } from '@/features/parcel/eta-text';
import type { ParcelEvent, ParcelLevel } from '@/features/parcel/types';

type ParcelTimelineProps = {
  /** 배송 이벤트(API 정규화 형태). 최신순으로 정렬되어 들어온다고 가정한다. */
  events: ParcelEvent[];
  /** 현재 진행 단계(현재 이벤트 강조용). */
  currentLevel: ParcelLevel;
};

/** dot 직경 — 현재(최신) 이벤트는 크게. */
const DOT_SIZE = 8;
const CURRENT_DOT_SIZE = 12;

/**
 * ParcelTimeline — 배송 이벤트 세로 타임라인(design.md §5.3).
 * 최신 이벤트가 위에 오고, dot+연결선으로 흐름을 표현한다.
 * 첫 항목(최신·현재 단계)은 primary dot으로 강조, 나머지는 약하게(textSecondary).
 */
export function ParcelTimeline({ events, currentLevel }: ParcelTimelineProps): ReactNode {
  const { colors } = useTheme();

  if (events.length === 0) {
    return (
      <Text style={[styles.empty, { color: colors.textSecondary }]}>—</Text>
    );
  }

  return (
    <View accessibilityRole="list">
      {events.map((event, index) => {
        const isFirst = index === 0;
        const isLast = index === events.length - 1;
        const delivered = currentLevel >= 6 && isFirst;
        const dotColor = delivered
          ? colors.accent
          : isFirst
            ? colors.primary
            : colors.borderStrong;
        const dotSize = isFirst ? CURRENT_DOT_SIZE : DOT_SIZE;
        const label = [event.where, formatParcelTime(event.timeString)]
          .filter((s) => s.length > 0)
          .join(' · ');
        return (
          <View key={`${event.timeString}-${index}`} style={styles.row} accessibilityRole="text">
            <View style={styles.markerColumn}>
              <View
                style={[
                  styles.dot,
                  {
                    width: dotSize,
                    height: dotSize,
                    borderRadius: radius.full,
                    backgroundColor: dotColor,
                  },
                ]}
              />
              {/* 마지막 항목 아래에는 연결선 생략. */}
              {!isLast ? (
                <View style={[styles.connector, { backgroundColor: colors.border }]} />
              ) : null}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.kind,
                  { color: isFirst ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {event.kind.length > 0 ? event.kind : '—'}
              </Text>
              {label.length > 0 ? (
                <Text style={[styles.meta, { color: colors.textSecondary }]}>{label}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  markerColumn: {
    alignItems: 'center',
    width: CURRENT_DOT_SIZE,
  },
  dot: {
    marginTop: spacing.xs,
  },
  connector: {
    flex: 1,
    width: 2,
    marginVertical: spacing.xs,
    borderRadius: radius.full,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  kind: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  meta: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
});
