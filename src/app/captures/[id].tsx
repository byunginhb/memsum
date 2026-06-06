import { useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack } from 'expo-router';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography } from '@/design/tokens';
import type { CaptureEvent } from '@/features/capture/types';
import type { CaptureListItem } from '@/features/captures/types';
import { useCapture } from '@/hooks/use-capture';
import { t } from '@/i18n';

/**
 * 캡처 상세 화면 — 기능명세 상세 플로우 (W4-C).
 * 큰 이미지 + 제목/요약 + 이벤트 카드(있으면) + OCR 전체 텍스트 + 메타 + 하단 액션.
 * 캘린더/공유 액션은 Week9 예정으로 현재 비활성(disabled) 상태다.
 */
export default function CaptureDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { item, isLoading, error } = useCapture(id);

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ headerShown: true, title: t('captures.detail.title') }} />
      <DetailBody item={item} isLoading={isLoading} error={error} />
    </View>
  );
}

type DetailBodyProps = {
  item: CaptureListItem | null;
  isLoading: boolean;
  error: string | null;
};

function DetailBody({ item, isLoading, error }: DetailBodyProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const contentStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + spacing['4xl'],
      gap: spacing.xl,
    }),
    [insets.bottom],
  );

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgBase }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={[styles.flex, styles.center, { backgroundColor: colors.bgBase }]}>
        <Icon name="x" size={32} color="textSecondary" />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          {error ?? t('captures.detail.notFound')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.bgBase }]}
      contentContainerStyle={contentStyle}
    >
      <DetailImage item={item} />
      <View style={styles.bodySection}>
        <Text style={[styles.itemTitle, { color: colors.textPrimary }]}>{item.title}</Text>
        {item.summary.trim().length > 0 ? (
          <Text style={[styles.summary, { color: colors.textSecondary }]}>{item.summary}</Text>
        ) : null}
      </View>

      {item.hasEvent && item.event ? (
        <View style={styles.bodySection}>
          <EventCard event={item.event} />
        </View>
      ) : null}

      <View style={styles.bodySection}>
        <OcrBlock ocrText={item.ocrText} />
      </View>

      <View style={styles.bodySection}>
        <MetaBlock item={item} />
      </View>

      <View style={styles.bodySection}>
        <DetailActions hasEvent={item.hasEvent} />
      </View>
    </ScrollView>
  );
}

/** 큰 썸네일. thumbnailUrl이 null이면 placeholder 표시. */
function DetailImage({ item }: { item: CaptureListItem }) {
  const { colors } = useTheme();

  if (!item.thumbnailUrl) {
    return (
      <View
        style={[styles.imagePlaceholder, { backgroundColor: colors.bgMuted }]}
        accessibilityRole="image"
        accessibilityLabel={t('captures.detail.imagePlaceholder')}
      >
        <Icon name="images" size={32} color="textSecondary" />
      </View>
    );
  }

  return (
    <Image
      style={styles.image}
      source={{ uri: item.thumbnailUrl }}
      contentFit="cover"
      transition={150}
      accessibilityLabel={item.title}
    />
  );
}

/** 감지된 이벤트 카드 — highlight 변형. 날짜·장소 표시. */
function EventCard({ event }: { event: CaptureEvent }) {
  const { colors } = useTheme();

  return (
    <Card variant="highlight">
      <View style={styles.eventRow}>
        <Icon name="calendar" size={20} color="accent" />
        <View style={styles.eventTexts}>
          <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.title}</Text>
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
            {formatEventDate(event.starts_at)}
          </Text>
          {event.location ? (
            <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
              {event.location}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/** OCR 전체 텍스트 블록. "인식된 텍스트" 라벨 + 본문. */
function OcrBlock({ ocrText }: { ocrText: string }) {
  const { colors } = useTheme();
  const hasText = ocrText.trim().length > 0;

  return (
    <View style={styles.metaGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('captures.detail.ocrLabel')}
      </Text>
      <Card variant="outlined">
        <Text
          style={[styles.ocrText, { color: hasText ? colors.textPrimary : colors.textSecondary }]}
        >
          {hasText ? ocrText : t('captures.detail.ocrEmpty')}
        </Text>
      </Card>
    </View>
  );
}

/** 메타 정보(캡처 일시·상태). */
function MetaBlock({ item }: { item: CaptureListItem }) {
  const { colors } = useTheme();

  return (
    <View style={styles.metaGroup}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {t('captures.detail.metaLabel')}
      </Text>
      <Card variant="flat" compact>
        <MetaRow
          label={t('captures.detail.meta.capturedAt')}
          value={formatDateTime(item.createdAt)}
        />
        <MetaRow
          label={t('captures.detail.meta.status')}
          value={t(`captures.detail.status.${item.status}`)}
        />
      </Card>
    </View>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaRowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metaRowValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

/** 하단 액션. 캘린더 추가(이벤트 있을 때)·공유 — 둘 다 Week9 예정으로 현재 비활성. */
function DetailActions({ hasEvent }: { hasEvent: boolean }) {
  return (
    <View style={styles.actions}>
      {hasEvent ? (
        // Week9 예정: 캘린더 연동 전까지 비활성.
        <Button
          variant="primary"
          size="lg"
          disabled
          onPress={() => undefined}
          accessibilityLabel={t('captures.detail.action.addToCalendar')}
          leftIcon={<Icon name="calendar" size={20} color="onPrimary" />}
        >
          {t('captures.detail.action.addToCalendar')}
        </Button>
      ) : null}
      {/* Week9 예정: 공유 기능 준비 중. */}
      <Button
        variant="secondary"
        size="lg"
        disabled
        onPress={() => undefined}
        accessibilityLabel={t('captures.detail.action.share')}
        leftIcon={<Icon name="share-2" size={20} color="primary" />}
      >
        {t('captures.detail.action.share')}
      </Button>
    </View>
  );
}

/** 이벤트 시작 일시 포맷(KST ISO8601 → 로컬 표시). */
function formatEventDate(iso: string): string {
  return formatDateTime(iso);
}

/** ISO8601 → 사람이 읽는 일시. 파싱 실패 시 원문 반환(앱이 깨지지 않음). */
function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

const IMAGE_ASPECT_RATIO = 4 / 3;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  image: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: IMAGE_ASPECT_RATIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodySection: {
    paddingHorizontal: spacing.xl,
  },
  itemTitle: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
  },
  summary: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    marginTop: spacing.sm,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventTexts: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  eventMeta: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaGroup: {
    gap: spacing.sm,
  },
  label: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
  ocrText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  metaRowLabel: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  metaRowValue: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
  },
  actions: {
    gap: spacing.md,
  },
});
