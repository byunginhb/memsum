import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/design/components/Button/Button';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import {
  dayParts,
  formatClock,
  formatSpokenDateTime,
} from '@/features/captures/capture-format';
import { listEntering } from '@/features/captures/list-entering';
import type { CaptureListItem } from '@/features/captures/types';
import { t } from '@/i18n';

import { MonoDay } from './MonoDay';

/**
 * 캘린더 탭 타임라인 — 명세 §6 "날짜를 mono 큰 숫자 왼쪽 열 + 내용 오른쪽의 타임라인 행".
 *
 * 다가오는/지난 두 단을 Eyebrow(`다가오는 일정 · 3`)로 열고, 행은 카드 없이 머리카락 구분선으로 나눈다.
 * - 왼쪽 열: 월(mono 작은) · 일(mono 큰, 오늘이면 형광펜 바탕) · 요일.
 * - 오른쪽: 제목·시각/장소(누르면 원본 캡처) + 등록 버튼(44pt) 또는 "등록됨" 줄.
 * "등록됨" 글씨는 잉크색, 체크 아이콘만 success 색: 라이트 success(#0F8A4A)는 종이 바탕에서
 * 약 4.0:1이라 작은 글씨 AA(4.5)에 못 미치지만 아이콘(비텍스트 3:1)으로는 충분하다.
 */
export type EventCaptureListProps = {
  /** 다가오는 일정(오름차순). */
  upcoming: CaptureListItem[];
  /** 지난 일정(내림차순). */
  past: CaptureListItem[];
  /** 미등록 항목의 "등록" 액션. 상위(calendar.tsx)가 store.registerCapture로 처리. */
  onRegister: (item: CaptureListItem) => void;
  /** 등록된 항목의 htmlLink를 외부 캘린더로 연다. */
  onOpen: (htmlLink: string) => void;
  /** 행 내용을 누르면 원본 캡처 상세로. */
  onOpenCapture: (id: string) => void;
  /** 현재 등록 진행 중인 캡처 id(있으면). 해당 행은 로딩·비활성 처리. */
  registeringId: string | null;
};

export function EventCaptureList({
  upcoming,
  past,
  ...rowProps
}: EventCaptureListProps): ReactNode {
  return (
    <View style={styles.root}>
      {upcoming.length > 0 ? (
        <Section
          label={t('calendar.section.upcoming', { count: upcoming.length })}
          items={upcoming}
          isPast={false}
          {...rowProps}
        />
      ) : null}
      {past.length > 0 ? (
        <Section
          label={t('calendar.section.past', { count: past.length })}
          items={past}
          isPast
          // 다가오는 단이 먼저 등장하므로 지난 단은 그 뒤 순번으로 이어서 연출한다.
          indexOffset={upcoming.length}
          {...rowProps}
        />
      ) : null}
    </View>
  );
}

type RowActions = Omit<EventCaptureListProps, 'upcoming' | 'past'>;

type SectionProps = RowActions & {
  label: string;
  items: CaptureListItem[];
  isPast: boolean;
  indexOffset?: number;
};

function Section({ label, items, isPast, indexOffset = 0, ...actions }: SectionProps): ReactNode {
  const reducedMotion = useReducedMotion();
  return (
    <View>
      <Eyebrow accessibilityRole="header" style={styles.sectionLabel}>
        {label}
      </Eyebrow>
      {items.map((item, i) => (
        <Animated.View key={item.id} entering={listEntering(indexOffset + i, reducedMotion)}>
          <EventRow item={item} isPast={isPast} {...actions} />
        </Animated.View>
      ))}
    </View>
  );
}

type EventRowProps = Omit<RowActions, 'registeringId'> & {
  item: CaptureListItem;
  isPast: boolean;
  registeringId: string | null;
};

function EventRow({
  item,
  isPast,
  onRegister,
  onOpen,
  onOpenCapture,
  registeringId,
}: EventRowProps): ReactNode {
  const { colors } = useTheme();

  const isRegistering = registeringId === item.id;
  const isRegistered = item.calendarEventId !== null;
  const htmlLink = item.calendarHtmlLink;
  const startsAt = item.event?.starts_at ?? '';
  const parts = startsAt ? dayParts(startsAt) : null;
  const title = item.title.trim().length > 0 ? item.title : t('captures.untitled');
  const location = item.event?.location?.trim() ?? '';
  const clock = startsAt ? formatClock(startsAt) : '';
  const metaLine = [clock, location].filter((s) => s.length > 0).join(' · ');
  const dim = isPast ? 'textSecondary' : 'textPrimary';

  const handleRegister = useCallback((): void => onRegister(item), [onRegister, item]);
  const handleOpenCapture = useCallback((): void => onOpenCapture(item.id), [onOpenCapture, item.id]);
  const handleOpen = useCallback((): void => {
    if (htmlLink) onOpen(htmlLink);
  }, [onOpen, htmlLink]);

  const spokenWhen = startsAt ? formatSpokenDateTime(startsAt) : '';

  return (
    <View style={[styles.row, { borderTopColor: colors.border }]}>
      <View
        style={styles.dateCol}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {parts ? (
          <>
            <Eyebrow>{parts.month}</Eyebrow>
            <MonoDay day={parts.day} color={dim} marked={parts.isToday} />
            <Eyebrow color={parts.isToday ? 'textPrimary' : 'textSecondary'}>
              {parts.isToday ? t('calendar.item.today') : parts.weekday}
            </Eyebrow>
          </>
        ) : null}
      </View>

      <View style={styles.content}>
        <PressableScale
          onPress={handleOpenCapture}
          accessibilityRole="button"
          accessibilityLabel={[title, spokenWhen, location].filter((s) => s.length > 0).join(', ')}
          accessibilityHint={t('calendar.item.openCapture')}
          style={styles.contentPress}
        >
          <Text variant="headline" color={dim} numberOfLines={2}>
            {title}
          </Text>
          {metaLine.length > 0 ? (
            <Text variant="mono" color="textSecondary" numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
        </PressableScale>

        <View style={styles.actionRow}>
          {isRegistered ? (
            <>
              <View style={styles.registered}>
                <Icon name="check-circle" size={16} color="success" />
                <Text variant="bodyStrong">{t('calendar.item.registered')}</Text>
              </View>
              {htmlLink ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={handleOpen}
                  accessibilityLabel={t('calendar.item.openInCalendar')}
                >
                  {t('calendar.item.openInCalendar')}
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleRegister}
              loading={isRegistering}
              disabled={registeringId !== null && !isRegistering}
              accessibilityLabel={
                isRegistering ? t('calendar.item.registering') : t('calendar.item.register')
              }
              leftIcon={<Icon name="calendar" size={16} color="primary" />}
            >
              {t('calendar.item.register')}
            </Button>
          )}
        </View>
      </View>
    </View>
  );
}

/** 왼쪽 날짜 열 폭 — 두 자리 큰 mono 숫자 + 여유. */
const DATE_COL_WIDTH = 56;
/** 등록됨 줄도 옆 버튼(44)과 높이를 맞춘다. */
const MIN_TOUCH = 44;

const styles = StyleSheet.create({
  root: {
    gap: spacing['3xl'],
  },
  sectionLabel: {
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  dateCol: {
    width: DATE_COL_WIDTH,
    alignItems: 'flex-start',
    gap: spacing.xs / 2,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  contentPress: {
    gap: spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  registered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: MIN_TOUCH,
  },
});
