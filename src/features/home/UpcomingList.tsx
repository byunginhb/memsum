import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { formatEventWhen } from '@/features/capture/event-format';
import type { CaptureListItem } from '@/features/captures/types';
import { parcelEtaText } from '@/features/parcel/eta-text';
import type { ParcelTrack } from '@/features/parcel/types';
import { t } from '@/i18n';

/** 왼쪽 시각 열 폭 — mono "10.06"/"Oct 12"가 한 줄에 들어가는 너비. */
const WHEN_COLUMN = 64;
/** 행 최소 높이(두 줄 + 여백). 터치 44 이상. */
const ROW_MIN_HEIGHT = 64;
/** 행 전체가 줄어드는 건 과해서 버튼보다 약한 눌림. */
const ROW_PRESS_SCALE = 0.985;

type UpcomingListProps = {
  events: readonly CaptureListItem[];
  parcels: readonly ParcelTrack[];
  onOpenCapture: (id: string) => void;
  onOpenParcel: (id: string) => void;
};

/**
 * 홈 "다가오는 것" — 다가오는 일정과 진행 중 택배를 구분선 목록으로.
 * 카드로 감싸지 않고 머리카락 rule로만 나눈다. 시각은 mono 왼쪽 열.
 */
export function UpcomingList({
  events,
  parcels,
  onOpenCapture,
  onOpenParcel,
}: UpcomingListProps): ReactNode {
  const total = events.length + parcels.length;

  return (
    <View>
      {events.map((item, i) => (
        <EventRow
          key={item.id}
          item={item}
          showDivider={i < total - 1}
          onPress={() => onOpenCapture(item.id)}
        />
      ))}
      {parcels.map((track, i) => (
        <ParcelRow
          key={track.id}
          track={track}
          showDivider={events.length + i < total - 1}
          onPress={() => onOpenParcel(track.id)}
        />
      ))}
    </View>
  );
}

type RowShellProps = {
  when: ReactNode;
  title: string;
  meta: string;
  accessibilityLabel: string;
  showDivider: boolean;
  onPress: () => void;
};

function RowShell({ when, title, meta, accessibilityLabel, showDivider, onPress }: RowShellProps): ReactNode {
  const { colors } = useTheme();
  return (
    <View>
      <PressableScale
        onPress={onPress}
        scaleTo={ROW_PRESS_SCALE}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={styles.row}
      >
        <View style={styles.when}>{when}</View>
        <View style={styles.body}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {title}
          </Text>
          {meta ? (
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        <Icon name="chevron-right" size={16} color="textSecondary" />
      </PressableScale>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
    </View>
  );
}

function EventRow({
  item,
  showDivider,
  onPress,
}: {
  item: CaptureListItem;
  showDivider: boolean;
  onPress: () => void;
}): ReactNode {
  const event = item.event;
  const when = event ? formatEventWhen(event.starts_at) : null;
  const title = event?.title || item.title || t('home.upcoming.untitled');
  const meta = event?.location ?? t('home.upcoming.event');

  return (
    <RowShell
      title={title}
      meta={meta}
      showDivider={showDivider}
      onPress={onPress}
      accessibilityLabel={[t('home.upcoming.event'), title, when?.spoken, event?.location]
        .filter(Boolean)
        .join(', ')}
      when={
        when ? (
          <>
            <Text variant="monoLg">{when.date}</Text>
            <Text variant="mono" color="textSecondary">
              {`${when.weekday} ${when.time}`}
            </Text>
          </>
        ) : (
          <Icon name="calendar" size={20} color="textSecondary" />
        )
      }
    />
  );
}

function ParcelRow({
  track,
  showDivider,
  onPress,
}: {
  track: ParcelTrack;
  showDivider: boolean;
  onPress: () => void;
}): ReactNode {
  const title = track.carrierName ?? t('home.upcoming.parcel');
  const meta = parcelEtaText(track.level, track.estimate) ?? track.statusText ?? '';

  return (
    <RowShell
      title={title}
      meta={meta}
      showDivider={showDivider}
      onPress={onPress}
      accessibilityLabel={[t('home.upcoming.parcel'), title, meta].filter(Boolean).join(', ')}
      when={<Icon name="truck" size={20} color="textPrimary" />}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  when: {
    width: WHEN_COLUMN,
    gap: 2,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
