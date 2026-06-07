import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';

import type { CaptureCardProps } from './types';

// 썸네일 비율(가로:세로). 스크린샷이 세로형이 많아 4:5로 약간 세로를 길게.
const THUMB_ASPECT_RATIO = 4 / 5;
// 카드 제목 최대 줄 수(2열 그리드에서 높이 안정화).
const TITLE_MAX_LINES = 2;

/** ISO8601 → "6월 6일" 류 짧은 날짜 라벨. 파싱 실패 시 빈 문자열. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * 캡처 카드 — 홈 2열 그리드 / 검색 결과 공용(기능명세 Screen 01).
 *
 * 썸네일(없으면 images placeholder) + 제목(빈문자면 untitled 폴백) + 날짜,
 * 이벤트 감지 시 캘린더 배지. 탭하면 onPress(item.id)로 상세 라우팅을 상위에 위임한다.
 */
export function CaptureCard({ item, onPress }: CaptureCardProps): ReactNode {
  const { colors } = useTheme();

  const handlePress = useCallback((): void => {
    onPress(item.id);
  }, [onPress, item.id]);

  const title = item.title.trim().length > 0 ? item.title : t('captures.untitled');
  const dateLabel = formatDate(item.createdAt);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={t('captures.card.open')}
      accessibilityHint={title}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Card variant="elevated" compact>
        <View style={[styles.thumb, { backgroundColor: colors.bgMuted }]}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              accessibilityLabel={t('captures.card.thumbnail')}
            />
          ) : (
            <View style={styles.placeholder} accessible accessibilityLabel={t('captures.card.noImage')}>
              <Icon name="images" size={32} color="textSecondary" />
            </View>
          )}
          {item.hasEvent ? (
            <View
              style={[styles.badge, { backgroundColor: colors.accent }]}
              accessibilityLabel={t('captures.card.eventBadge')}
            >
              <Icon name="calendar" size={16} color="textOnAccent" />
              <Text style={[styles.badgeText, { color: colors.textOnAccent }]} numberOfLines={1}>
                {t('captures.card.event')}
              </Text>
            </View>
          ) : null}
        </View>

        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={TITLE_MAX_LINES}
        >
          {title}
        </Text>
        {dateLabel.length > 0 ? (
          <Text style={[styles.date, { color: colors.textSecondary }]} numberOfLines={1}>
            {dateLabel}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  thumb: {
    width: '100%',
    aspectRatio: THUMB_ASPECT_RATIO,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
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
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
    marginTop: spacing.md,
  },
  date: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    marginTop: spacing.xs,
  },
});
