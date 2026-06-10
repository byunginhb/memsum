import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, radius, spacing, typography } from '@/design/tokens';
import { getLocale, t } from '@/i18n';

import type { CaptureListItem } from '@/features/captures/types';

/**
 * 캘린더 탭의 이벤트 캡처 리스트 (C2).
 *
 * upcoming/past 두 섹션을 각각 SectionLabel + 캡처 행으로 쌓는다.
 * 각 행: 썸네일 · 제목 · 일시 · 장소 + 우측 액션.
 * - 이미 등록됨(calendarEventId 존재): "등록됨" 배지 + htmlLink가 있으면 행을 탭해
 *   캘린더에서 열 수 있다(onOpen).
 * - 미등록: "캘린더에 등록" 버튼(small). registeringId가 이 항목이면 "등록하는 중…" + 비활성.
 *
 * 일시 포맷은 타 파일 함수에 의존하지 않도록 이 파일 내 자체 헬퍼로 둔다(요구사항).
 */
export type EventCaptureListProps = {
  /** 다가오는 일정(오름차순). */
  upcoming: CaptureListItem[];
  /** 지난 일정(내림차순). */
  past: CaptureListItem[];
  /** 미등록 항목의 "등록" 액션. 상위(calendar.tsx)가 store.registerCapture로 처리. */
  onRegister: (item: CaptureListItem) => void;
  /** 등록된 항목의 htmlLink를 외부 캘린더로 여는 액션. null이면 호출 측이 무시. */
  onOpen: (htmlLink: string | null) => void;
  /** 현재 등록 진행 중인 캡처 id(있으면). 해당 행은 로딩·비활성 처리. */
  registeringId: string | null;
};

export function EventCaptureList({
  upcoming,
  past,
  onRegister,
  onOpen,
  registeringId,
}: EventCaptureListProps): ReactNode {
  return (
    <View style={styles.root}>
      {upcoming.length > 0 ? (
        <Section
          label={t('calendar.section.upcoming')}
          items={upcoming}
          onRegister={onRegister}
          onOpen={onOpen}
          registeringId={registeringId}
        />
      ) : null}

      {past.length > 0 ? (
        <Section
          label={t('calendar.section.past')}
          items={past}
          onRegister={onRegister}
          onOpen={onOpen}
          registeringId={registeringId}
        />
      ) : null}
    </View>
  );
}

type SectionProps = {
  label: string;
  items: CaptureListItem[];
  onRegister: (item: CaptureListItem) => void;
  onOpen: (htmlLink: string | null) => void;
  registeringId: string | null;
};

/** 섹션(라벨 + 행 목록). index.tsx SectionLabel 패턴(caption·textSecondary)을 따른다. */
function Section({
  label,
  items,
  onRegister,
  onOpen,
  registeringId,
}: SectionProps): ReactNode {
  const { colors } = useTheme();

  return (
    <View style={styles.section}>
      <Text
        accessibilityRole="header"
        style={[styles.sectionLabel, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>

      <View style={styles.rows}>
        {items.map((item) => (
          <EventRow
            key={item.id}
            item={item}
            onRegister={onRegister}
            onOpen={onOpen}
            isRegistering={registeringId === item.id}
          />
        ))}
      </View>
    </View>
  );
}

type EventRowProps = {
  item: CaptureListItem;
  onRegister: (item: CaptureListItem) => void;
  onOpen: (htmlLink: string | null) => void;
  isRegistering: boolean;
};

/** 썸네일 한 변 크기(px). 행 높이 안정화를 위해 정사각 고정. */
const THUMB_SIZE = 48;

/**
 * 단일 이벤트 행.
 * 등록된 항목(calendarEventId)은 htmlLink가 있으면 Card 자체가 탭 가능해져 캘린더에서 연다.
 * 미등록 항목은 우측 등록 버튼만 동작한다(행 탭은 비활성).
 */
function EventRow({
  item,
  onRegister,
  onOpen,
  isRegistering,
}: EventRowProps): ReactNode {
  const { colors } = useTheme();

  const isRegistered = item.calendarEventId !== null;
  const canOpen = isRegistered && item.calendarHtmlLink !== null;

  const title = item.title.trim().length > 0 ? item.title : t('captures.untitled');
  // 일시·장소는 감지된 이벤트(event)에서 가져온다. event는 null일 수 있으므로 가드.
  const whenLabel = item.event ? formatEventDateTime(item.event.starts_at) : '';
  const location = item.event?.location?.trim() ?? '';

  const handleRegister = useCallback((): void => {
    onRegister(item);
  }, [onRegister, item]);

  const handleOpen = useCallback((): void => {
    onOpen(item.calendarHtmlLink);
  }, [onOpen, item.calendarHtmlLink]);

  return (
    <Card
      variant="outlined"
      padding="compact"
      // 등록 + 열기 링크가 있을 때만 행을 탭 가능하게 만든다(미등록은 우측 버튼만 동작).
      onPress={canOpen ? handleOpen : undefined}
      accessibilityRole={canOpen ? 'link' : undefined}
    >
      <View style={styles.row}>
        <View style={[styles.thumb, { backgroundColor: colors.bgMuted }]}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              accessibilityLabel={title}
            />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Icon name="images" size={20} color="textSecondary" />
            </View>
          )}
        </View>

        <View style={styles.texts}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {whenLabel.length > 0 ? (
            <Text
              style={[styles.meta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {whenLabel}
            </Text>
          ) : null}
          {location.length > 0 ? (
            <Text
              style={[styles.meta, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {location}
            </Text>
          ) : null}
        </View>

        <View style={styles.action}>
          {isRegistered ? (
            <RegisteredBadge canOpen={canOpen} />
          ) : (
            <Button
              variant="primary"
              size="sm"
              onPress={handleRegister}
              loading={isRegistering}
              disabled={isRegistering}
              accessibilityLabel={
                isRegistering
                  ? t('calendar.item.registering')
                  : t('calendar.item.register')
              }
            >
              {isRegistering
                ? t('calendar.item.registering')
                : t('calendar.item.register')}
            </Button>
          )}
        </View>
      </View>
    </Card>
  );
}

/** "등록됨" 배지. 열 수 있으면(htmlLink 보유) 캘린더에서 열기 힌트를 함께 보인다. */
function RegisteredBadge({ canOpen }: { canOpen: boolean }): ReactNode {
  const { colors } = useTheme();

  return (
    <View style={styles.badgeCol}>
      <View style={[styles.badge, { backgroundColor: colors.bgMuted }]}>
        <Icon name="check" size={16} color="success" />
        <Text style={[styles.badgeText, { color: colors.success }]} numberOfLines={1}>
          {t('calendar.item.registered')}
        </Text>
      </View>
      {canOpen ? (
        <View style={styles.openHint}>
          <Text
            style={[styles.openHintText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {t('calendar.item.openInCalendar')}
          </Text>
          <Icon name="chevron-right" size={16} color="textSecondary" />
        </View>
      ) : null}
    </View>
  );
}

/**
 * 이벤트 시작 일시 포맷(ISO8601 → 사람이 읽는 일시).
 * 타 파일 함수 import 금지 요구사항에 따라 이 파일 자체 헬퍼로 둔다.
 * 디바이스 로케일이 아니라 앱 로케일(ko/en)을 명시해 KO/EN 표시 일관성을 유지한다.
 * 파싱 실패 시 원문을 그대로 반환해 앱이 깨지지 않게 한다.
 */
function formatEventDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const locale = getLocale() === 'ko' ? 'ko-KR' : 'en-US';
  return date.toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  thumbPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  meta: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  action: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.bodyMd.weight,
  },
  openHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  openHintText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
});
