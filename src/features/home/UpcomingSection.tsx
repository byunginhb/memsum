// "놓치면 안 돼요" 섹션 — 홈 최상단 임박 일정 섹션(이슈 #3).
//
// useEventCaptures().upcoming 상위 UPCOMING_LIMIT건만 노출.
// - 가장 임박 1건: Card variant="highlight"(coral 좌 4px) + heading 스케일 D-day 강조.
// - 나머지 2~3건: Card variant="elevated" 간결 행.
// - 0건: 죄책감 없는 안심 카피(UpcomingEmpty).
// 등록·열기 액션은 useCalendarAction으로 캘린더 탭과 공유(중복 금지).

import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { BrandDot } from '@/design/components/BrandDot/BrandDot';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';
import type { CaptureListItem } from '@/features/captures/types';
import { dDayBadge, dDayLabel } from '@/features/home/dday';
import { useCalendarAction } from '@/hooks/use-calendar-action';
import { t } from '@/i18n';

/** 홈 임박 섹션에서 노출할 최대 건수(1 highlight + N-1 elevated). */
const UPCOMING_LIMIT = 4;

// ── 공개 컴포넌트 ──────────────────────────────────────────────────────────

type UpcomingSectionProps = {
  /** useEventCaptures().upcoming — now 이후 오름차순(가까운 순). */
  upcoming: CaptureListItem[];
  /** 첫 로드 중 여부. */
  isLoading: boolean;
  /** 등록 성공 후 목록 갱신 콜백(useCalendarAction에 전달). */
  refresh: () => Promise<void>;
  /** D-day 계산 기준 시각 epoch ms. 부모가 pull-to-refresh·AppState 복귀 시 갱신. */
  now: number;
};

/**
 * 홈 "놓치면 안 돼요" 임박 일정 섹션 — design.md §26(이슈 #3 재설계).
 *
 * 인사 바로 아래 최상단에 위치해 스크롤 없이 임박 일정을 보여준다.
 * 0건이면 죄책감 없는 안심 메시지를 보이고, 그 아래 정리함 섹션은 정상 노출된다.
 * 캡처 0건(완전 빈 앱)이면 HomeEmptyState가 이 섹션보다 우선하므로(index.tsx isEmpty 분기),
 * 이 컴포넌트는 캡처가 존재할 때만 렌더된다.
 */
export function UpcomingSection({
  upcoming,
  isLoading,
  refresh,
  now,
}: UpcomingSectionProps): ReactNode {
  const { colors } = useTheme();
  const { handleRegister, handleOpen, registeringId } = useCalendarAction(refresh);

  // 상위 N건만 홈 미리보기로 노출. 전체 목록은 캘린더 탭에서 확인.
  const visible = upcoming.slice(0, UPCOMING_LIMIT);
  const isEmpty = !isLoading && upcoming.length === 0;

  return (
    <View style={styles.wrapper}>
      {/* 섹션 라벨 — coral BrandDot + caption(이슈 #9 BrandDot·elevation 위계). */}
      <View style={styles.labelRow} accessibilityRole="header">
        <BrandDot tone="accent" />
        <Text
          style={[styles.sectionLabel, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {t('home.upcoming.section')}
        </Text>
      </View>

      {isLoading && visible.length === 0 ? (
        /* 첫 로드 중: 콘텐츠가 없을 때만 인디케이터를 보인다(깜빡임 방지). */
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isEmpty ? (
        <UpcomingEmpty />
      ) : (
        <View style={styles.list}>
          {visible.map((item, index) =>
            index === 0 ? (
              <HighlightCard
                key={item.id}
                item={item}
                now={now}
                registeringId={registeringId}
                onRegister={handleRegister}
                onOpen={handleOpen}
              />
            ) : (
              <ElevatedCard
                key={item.id}
                item={item}
                now={now}
                registeringId={registeringId}
                onRegister={handleRegister}
                onOpen={handleOpen}
              />
            ),
          )}
        </View>
      )}
    </View>
  );
}

// ── 내부 카드 컴포넌트 ────────────────────────────────────────────────────

type CardInternalProps = {
  item: CaptureListItem;
  now: number;
  registeringId: string | null;
  onRegister: (item: CaptureListItem) => void;
  onOpen: (htmlLink: string | null) => void;
};

/**
 * 가장 임박한 1건 — highlight 카드(coral 좌 4px).
 * D-day를 heading 스케일 coral 텍스트로 강조하고, 제목·시각·위치를 아래에 표시한다.
 * 탭 시 등록됨이면 외부 캘린더 열기, 미등록이면 등록 경로.
 */
function HighlightCard({
  item,
  now,
  registeringId,
  onRegister,
  onOpen,
}: CardInternalProps): ReactNode {
  const { colors } = useTheme();

  if (!item.event) return null;

  const isRegistered = item.calendarEventId !== null && item.calendarHtmlLink !== null;
  const isRegistering = registeringId === item.id;

  const badge = dDayBadge(item.event.starts_at, now);
  const label = dDayLabel(item.event.starts_at, now);
  const location = item.event.location ?? null;

  // a11y: D-day + 제목 + 시각 + 위치를 하나의 의미 단위로 합성(§35).
  const a11yParts = [badge, item.title, label];
  if (location) a11yParts.push(location);
  const a11yLabel = a11yParts.join(', ');

  const handleAction = (): void => {
    if (isRegistered) {
      onOpen(item.calendarHtmlLink);
    } else {
      onRegister(item);
    }
  };

  return (
    <Card variant="highlight" onPress={handleAction} accessibilityRole="button">
      <View accessible accessibilityLabel={a11yLabel}>
        {/* D-day 배지 — heading 스케일 coral 강조. */}
        <Text style={[styles.heroBadge, { color: colors.accent }]} numberOfLines={1}>
          {badge}
        </Text>

        {/* 제목 */}
        <Text
          style={[styles.heroTitle, { color: colors.textPrimary }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* 시각 + 위치(있을 때) */}
        <Text
          style={[styles.heroSub, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {location ? `${label} · ${location}` : label}
        </Text>

        {/* 액션 행 — 등록됨: 캘린더 열기, 미등록: 등록. */}
        <View style={styles.actionRow}>
          {isRegistering ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <View style={styles.actionLabel}>
              <Text style={[styles.actionText, { color: colors.accent }]} numberOfLines={1}>
                {isRegistered
                  ? t('home.upcoming.openCalendar')
                  : t('home.upcoming.register')}
              </Text>
              <Icon name="chevron-right" size={16} color="accent" />
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

/**
 * 2~4번째 임박 건 — elevated 카드, 배지·제목·시각을 가로 행으로 간결히 표시.
 */
function ElevatedCard({
  item,
  now,
  registeringId,
  onRegister,
  onOpen,
}: CardInternalProps): ReactNode {
  const { colors } = useTheme();

  if (!item.event) return null;

  const isRegistered = item.calendarEventId !== null && item.calendarHtmlLink !== null;
  const isRegistering = registeringId === item.id;

  const badge = dDayBadge(item.event.starts_at, now);
  const label = dDayLabel(item.event.starts_at, now);

  const a11yParts = [badge, item.title, label];
  if (item.event.location) a11yParts.push(item.event.location);
  const a11yLabel = a11yParts.join(', ');

  const handleAction = (): void => {
    if (isRegistered) {
      onOpen(item.calendarHtmlLink);
    } else {
      onRegister(item);
    }
  };

  return (
    <Card variant="elevated" padding="compact" onPress={handleAction} accessibilityRole="button">
      <View accessible accessibilityLabel={a11yLabel} style={styles.elevatedRow}>
        {/* D-day 배지 — bodyMd, 최소 너비 고정해 제목 넘침 방지. */}
        <View style={styles.elevatedBadgeWrap}>
          <Text style={[styles.elevatedBadge, { color: colors.accent }]} numberOfLines={1}>
            {badge}
          </Text>
        </View>

        {/* 제목 + 시각 */}
        <View style={styles.elevatedContent}>
          <Text
            style={[styles.elevatedTitle, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles.elevatedSub, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>

        {/* 상태 아이콘 — 등록 중이면 스피너, 등록됨이면 calendar, 미등록이면 chevron. */}
        {isRegistering ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Icon
            name={isRegistered ? 'calendar' : 'chevron-right'}
            size={16}
            color="textSecondary"
          />
        )}
      </View>
    </Card>
  );
}

/** 임박 일정 0건 — 죄책감 없는 안심 인라인 메시지. */
function UpcomingEmpty(): ReactNode {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyRow}>
      <Icon name="calendar" size={16} color="textSecondary" />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {t('home.upcoming.empty.title')}
      </Text>
    </View>
  );
}

// ── 스타일 ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: 1.5,
  },
  loadingWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  list: {
    gap: spacing.md,
  },
  // ── highlight card ─────────────────────────────────────────
  heroBadge: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
  heroTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
    letterSpacing: letterSpacingFor('title'),
    marginTop: spacing.xs,
  },
  heroSub: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    marginTop: spacing.xs,
  },
  actionRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actionText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
  },
  // ── elevated card ──────────────────────────────────────────
  elevatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  elevatedBadgeWrap: {
    minWidth: 52,
    alignItems: 'flex-start',
  },
  elevatedBadge: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  elevatedContent: {
    flex: 1,
    gap: spacing.xs,
  },
  elevatedTitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  elevatedSub: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
  // ── empty ──────────────────────────────────────────────────
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
});
