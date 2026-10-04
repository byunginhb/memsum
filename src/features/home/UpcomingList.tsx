import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { formatEventWhen } from '@/features/capture/event-format';
import type { CaptureListItem } from '@/features/captures/types';
import { dDayBadge, localDayDiff } from '@/features/home/dday';
import { parcelEtaText } from '@/features/parcel/eta-text';
import type { ParcelTrack } from '@/features/parcel/types';
import { t } from '@/i18n';

/** 왼쪽 D-day 열 폭 — mono "D-12"/"Tomorrow"가 한 줄에 들어가는 너비. */
const WHEN_COLUMN = 72;
/** 행 최소 높이(두 줄 + 여백). 터치 44 이상. */
const ROW_MIN_HEIGHT = 64;
/** 행 전체가 줄어드는 건 과해서 버튼보다 약한 눌림. */
const ROW_PRESS_SCALE = 0.985;
/** 트레일링 액션의 최소 터치 영역. */
const MIN_TOUCH = 44;
/** 다른 행이 등록 중일 때 잠긴 액션의 불투명도. */
const LOCKED_OPACITY = 0.4;

type UpcomingListProps = {
  events: readonly CaptureListItem[];
  parcels: readonly ParcelTrack[];
  /** D-day 기준 시각(epoch ms). 부모가 당겨서 새로고침·포그라운드 복귀 때 갱신한다. */
  now: number;
  /** 등록 중인 캡처 id(그 행만 로딩). */
  registeringId: string | null;
  onRegister: (item: CaptureListItem) => void;
  onOpenCalendar: (htmlLink: string | null) => void;
  onOpenCapture: (id: string) => void;
  onOpenParcel: (id: string) => void;
};

/**
 * 홈 "놓치면 안 돼요" — 다가오는 일정(D-day 순)과 배송 중 택배를 구분선 목록으로.
 *
 * 카드로 감싸지 않고 머리카락 rule로만 나눈다. 왼쪽 열은 mono D-day, 가장 임박한 첫 줄만
 * 코발트로 칠해 눈이 먼저 가게 한다(형광펜은 헤드라인 한 곳 전용).
 * 일정 행 오른쪽엔 캘린더 등록/열기 액션 — 로직은 캘린더 탭과 같은 useCalendarAction(원격 #3).
 */
export function UpcomingList({
  events,
  parcels,
  now,
  registeringId,
  onRegister,
  onOpenCalendar,
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
          now={now}
          emphasized={i === 0}
          showDivider={i < total - 1}
          registering={registeringId === item.id}
          locked={registeringId !== null && registeringId !== item.id}
          onPress={() => onOpenCapture(item.id)}
          onRegister={() => onRegister(item)}
          onOpenCalendar={() => onOpenCalendar(item.calendarHtmlLink)}
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
  trailing?: ReactNode;
};

function RowShell({
  when,
  title,
  meta,
  accessibilityLabel,
  showDivider,
  onPress,
  trailing,
}: RowShellProps): ReactNode {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.row}>
        <PressableScale
          onPress={onPress}
          scaleTo={ROW_PRESS_SCALE}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          containerStyle={styles.flex}
          style={styles.rowMain}
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
          {trailing ? null : <Icon name="chevron-right" size={16} color="textSecondary" />}
        </PressableScale>
        {trailing}
      </View>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
    </View>
  );
}

type EventRowProps = {
  item: CaptureListItem;
  now: number;
  emphasized: boolean;
  showDivider: boolean;
  registering: boolean;
  locked: boolean;
  onPress: () => void;
  onRegister: () => void;
  onOpenCalendar: () => void;
};

function EventRow({
  item,
  now,
  emphasized,
  showDivider,
  registering,
  locked,
  onPress,
  onRegister,
  onOpenCalendar,
}: EventRowProps): ReactNode {
  const { colors } = useTheme();
  const event = item.event;
  const when = event ? formatEventWhen(event.starts_at) : null;
  const badge = event ? dDayBadge(event.starts_at, now) : t('home.upcoming.dday.fallback');
  const isSoon = event ? (localDayDiff(event.starts_at, now) ?? Infinity) <= 1 : false;
  const title = event?.title || item.title || t('home.upcoming.untitled');
  const meta = [when ? `${when.date} ${when.weekday}` : null, event?.location]
    .filter(Boolean)
    .join(' · ');
  const isRegistered = item.calendarEventId !== null;
  // 등록됐지만 딥링크가 없으면(응답 누락) 열 곳이 없다 — 등록됨 표시만 남긴다.
  const canOpen = isRegistered && item.calendarHtmlLink !== null;
  const actionLabel = isRegistered ? t('home.upcoming.openCalendar') : t('home.upcoming.register');

  return (
    <RowShell
      title={title}
      meta={meta}
      showDivider={showDivider}
      onPress={onPress}
      accessibilityLabel={[badge, title, when?.spoken, event?.location].filter(Boolean).join(', ')}
      when={
        <>
          <Text variant="monoLg" color={emphasized || isSoon ? 'primary' : 'textPrimary'} numberOfLines={1}>
            {badge}
          </Text>
          {when ? (
            <Text variant="mono" color="textSecondary">
              {when.time}
            </Text>
          ) : null}
        </>
      }
      trailing={
        event && isRegistered && !canOpen ? (
          <View
            style={styles.action}
            accessible
            accessibilityLabel={t('home.upcoming.registered')}
          >
            <Icon name="check" size={20} color="success" />
          </View>
        ) : event ? (
          <PressableScale
            onPress={isRegistered ? onOpenCalendar : onRegister}
            disabled={registering || locked}
            accessibilityRole="button"
            accessibilityLabel={`${actionLabel}, ${title}`}
            accessibilityState={{ busy: registering, disabled: registering || locked }}
            style={[styles.action, locked ? styles.locked : null]}
          >
            {registering ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name={isRegistered ? 'calendar' : 'plus'} size={20} color="primary" />
            )}
          </PressableScale>
        ) : undefined
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
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowMain: {
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
  action: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locked: {
    opacity: LOCKED_OPACITY,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
