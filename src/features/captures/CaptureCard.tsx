import { useCallback } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { CropFrame } from '@/design/components/CropFrame/CropFrame';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing } from '@/design/tokens';
import { t } from '@/i18n';

import { formatShortDate } from './capture-format';
import type { CaptureCardProps } from './types';

/** 썸네일 비율(가로:세로). 스크린샷은 세로형이라 3:4로 위쪽을 넉넉히 보인다. */
export const CAPTURE_THUMB_ASPECT = 3 / 4;
/** 3열에서도 높이가 흔들리지 않게 제목은 두 줄까지. */
const TITLE_MAX_LINES = 2;
/** 크롭 모서리 — 그리드 간격(12) 안에 들어가도록 짧고 얇게, 썸네일 밖으로 살짝. */
const CROP_CORNER = 10;
const CROP_STROKE = 1.5;
const CROP_OUTSET = 3;

/**
 * 캡처 카드 — 홈 최근 캡처·자료실 3열 그리드 공용(명세 §6).
 *
 * 카드 면 없이 썸네일 + 크롭 모서리 + 제목 두 줄 + mono 날짜만 둔다(카드 남발 금지).
 * 일정이 뽑힌 캡처는 썸네일 왼쪽 아래에 형광펜 바탕·잉크 글씨 날짜표(대비 17:1)를 붙인다.
 * 눌림은 PressableScale(scale 0.97). 스크린리더에는 제목·날짜·일정 여부를 한 문장으로 읽힌다.
 */
export function CaptureCard({ item, onPress }: CaptureCardProps): ReactNode {
  const { colors } = useTheme();

  const handlePress = useCallback((): void => {
    onPress(item.id);
  }, [onPress, item.id]);

  const title = item.title.trim().length > 0 ? item.title : t('captures.untitled');
  const dateLabel = formatShortDate(item.createdAt);
  const eventDate = item.hasEvent && item.event ? formatShortDate(item.event.starts_at) : '';
  const a11yLabel = [title, dateLabel, item.hasEvent ? t('captures.card.eventBadge') : '']
    .filter((s) => s.length > 0)
    .join(', ');

  return (
    <PressableScale
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={t('captures.card.open')}
    >
      <CropFrame
        cornerLength={CROP_CORNER}
        strokeWidth={CROP_STROKE}
        outset={CROP_OUTSET}
        color="borderStrong"
      >
        <View style={[styles.thumb, { backgroundColor: colors.bgMuted }]}>
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top"
              transition={motion.duration.fast}
              accessible={false}
            />
          ) : (
            <View style={styles.placeholder}>
              <Icon name="images" size={24} color="textSecondary" />
            </View>
          )}
        </View>

        {/* 일정 배지는 잉크 알약 — 형광펜은 화면당 1곳(홈 헤드라인·캘린더 오늘)만 쓰므로 썸네일마다 칠하지 않는다. */}
        {item.hasEvent ? (
          <View
            style={[styles.badge, { backgroundColor: colors.barBg }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Icon name="calendar" size={16} color="barFg" />
            {eventDate.length > 0 ? (
              <Text variant="mono" color="barFg">
                {eventDate}
              </Text>
            ) : (
              <Text variant="caption" color="barFg">
                {t('captures.card.event')}
              </Text>
            )}
          </View>
        ) : null}
      </CropFrame>

      <Text variant="caption" numberOfLines={TITLE_MAX_LINES} style={styles.title}>
        {title}
      </Text>
      {dateLabel.length > 0 ? <Eyebrow style={styles.date}>{dateLabel}</Eyebrow> : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: '100%',
    aspectRatio: CAPTURE_THUMB_ASPECT,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    borderRadius: radius.sm,
  },
  title: {
    marginTop: spacing.sm,
  },
  date: {
    marginTop: spacing.xs / 2,
  },
});
