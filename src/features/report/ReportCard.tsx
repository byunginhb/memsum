import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { haptic } from '@/design/theme/platform';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, motion, radius, spacing, typography } from '@/design/tokens';
import type { SemanticColorName } from '@/design/tokens';
import type { ReportFeedback, WeeklyReportItem } from '@/features/report/types';
import { t } from '@/i18n';

// ── 모션 상수 (design.md §27 Hero reveal) ─────────────────────────────────────

/** 카드 1개 reveal 길이(ms). 전체(5*stagger + DURATION)가 motion.ritual 이내가 되도록 둔다. */
const REVEAL_DURATION_MS = motion.duration.base; // 200ms
/** 카드 간 stagger 간격(ms) — design.md §27. motion.stagger(50) 기반 80ms. */
const REVEAL_STAGGER_MS = motion.stagger + 30; // 80ms
/** reveal 시작 시 아래에서 올라오는 거리(px). */
const REVEAL_TRANSLATE_Y = 12;

// ── 표시 상수 ─────────────────────────────────────────────────────────────────

/** Hero(1위) 썸네일 크기(px). */
const HERO_THUMB_SIZE = 64;
/** 일반(2~5위) 썸네일 크기(px). */
const THUMB_SIZE = 48;
/** 피드백 아이콘 크기(px). */
const FEEDBACK_ICON_SIZE = 20;

type ReportCardProps = {
  item: WeeklyReportItem;
  /** 리스트 내 위치(0-base). stagger delay 계산에 사용. */
  index: number;
  /** 원본 캡처 상세로 이동. */
  onPressOriginal: (captureId: string) => void;
  /** up/down 피드백. 같은 값을 다시 누르면 해제(null). */
  onFeedback: (captureId: string, rating: ReportFeedback) => void;
};

/**
 * ReportCard — 주간 리포트 한 항목(design.md §27).
 *
 * rank===1: Card variant="highlight" padding="spacious"(코랄 좌측 보더) + display(28pt) 제목.
 * rank 2~5: Card variant="elevated" padding="normal" + title 제목.
 * 공통: rank 숫자 + summary + [원본 보기] ghost + up/down 피드백.
 *
 * Hero 모션: 마운트 시 opacity 0→1 + translateY 12→0, index*stagger 지연으로 순차 등장.
 * useReducedMotion()이면 stagger·translate 제거하고 즉시 표시. cleanup에서 애니메이션 취소.
 */
export function ReportCard({
  item,
  index,
  onPressOriginal,
  onFeedback,
}: ReportCardProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();

  const isHero = item.rank === 1;

  // reveal SharedValue — reduce-motion이면 즉시 최종값.
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : REVEAL_TRANSLATE_Y);

  // Hero(1위) 카드 reveal 완료 시 햅틱 1회 — design.md §27. 카드 모션과 결합해
  // 타이밍이 어긋나지 않도록 withTiming 완료 콜백에서 발화한다.
  const fireHeroHaptic = useCallback((): void => {
    void haptic('light');
  }, []);

  useEffect(() => {
    // reduce-motion: 후발로 켜져도 카드가 보이도록 최종값을 명시적으로 강제한다.
    if (reducedMotion) {
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    const delay = index * REVEAL_STAGGER_MS;
    opacity.value = withDelay(
      delay,
      withTiming(
        1,
        { duration: REVEAL_DURATION_MS, easing: motion.easing.decel },
        // Hero 카드 reveal 완료 시점에만 햅틱(UI 스레드 → JS).
        isHero
          ? (finished?: boolean) => {
              'worklet';
              if (finished) runOnJS(fireHeroHaptic)();
            }
          : undefined,
      ),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: REVEAL_DURATION_MS, easing: motion.easing.decel }),
    );

    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [reducedMotion, index, isHero, fireHeroHaptic, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Card
        variant={isHero ? 'highlight' : 'elevated'}
        padding={isHero ? 'spacious' : 'normal'}
      >
        <View style={styles.headerRow}>
          <Text
            style={[styles.rankBadge, { color: colors.accent }]}
            accessibilityElementsHidden
          >
            {item.rank}
          </Text>
          <Thumbnail
            uri={item.thumbnailUrl}
            size={isHero ? HERO_THUMB_SIZE : THUMB_SIZE}
            label={item.title}
          />
        </View>

        <Text
          style={[
            isHero ? styles.heroTitle : styles.title,
            { color: colors.textPrimary },
          ]}
          numberOfLines={isHero ? 3 : 2}
        >
          {item.title}
        </Text>

        {item.summary.trim().length > 0 ? (
          <Text
            style={[styles.summary, { color: colors.textSecondary }]}
            numberOfLines={isHero ? 4 : 2}
          >
            {item.summary}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onPressOriginal(item.captureId)}
            accessibilityLabel={t('report.original')}
            leftIcon={<Icon name="images" size={FEEDBACK_ICON_SIZE} color="primary" />}
          >
            {t('report.original')}
          </Button>

          <View style={styles.feedbackGroup}>
            <FeedbackButton
              icon="thumbs-up"
              active={item.feedback === 'up'}
              activeColor="primary"
              label={t('report.feedback.up')}
              onPress={() =>
                onFeedback(item.captureId, item.feedback === 'up' ? null : 'up')
              }
            />
            <FeedbackButton
              icon="thumbs-down"
              active={item.feedback === 'down'}
              activeColor="accent"
              label={t('report.feedback.down')}
              onPress={() =>
                onFeedback(item.captureId, item.feedback === 'down' ? null : 'down')
              }
            />
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

/** 항목 썸네일. URL 없으면 placeholder(이미지 아이콘). */
function Thumbnail({
  uri,
  size,
  label,
}: {
  uri: string | null;
  size: number;
  label: string;
}): ReactNode {
  const { colors } = useTheme();

  const boxStyle = {
    width: size,
    height: size,
    borderRadius: radius.md,
  };

  if (!uri) {
    return (
      <View
        style={[styles.thumbPlaceholder, boxStyle, { backgroundColor: colors.bgMuted }]}
        accessibilityRole="image"
        accessibilityLabel={label}
      >
        <Icon name="images" size={20} color="textSecondary" />
      </View>
    );
  }

  return (
    <Image
      style={boxStyle}
      source={{ uri }}
      contentFit="cover"
      transition={150}
      accessibilityLabel={label}
    />
  );
}

/** up/down 토글 버튼. 활성 시 지정 색, 비활성 시 textSecondary. 햅틱 피드백. */
function FeedbackButton({
  icon,
  active,
  activeColor,
  label,
  onPress,
}: {
  icon: 'thumbs-up' | 'thumbs-down';
  active: boolean;
  activeColor: SemanticColorName;
  label: string;
  onPress: () => void;
}): ReactNode {
  const handlePress = async (): Promise<void> => {
    if (Platform.OS === 'ios') {
      await haptic('light');
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={spacing.sm}
      style={styles.feedbackButton}
    >
      <Icon
        name={icon}
        size={FEEDBACK_ICON_SIZE}
        color={active ? activeColor : 'textSecondary'}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rankBadge: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
  },
  heroTitle: {
    fontSize: typography.display.size,
    lineHeight: typography.display.line,
    fontWeight: typography.display.weight,
    letterSpacing: letterSpacingFor('display'),
  },
  title: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
    letterSpacing: letterSpacingFor('title'),
  },
  summary: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    marginTop: spacing.sm,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  feedbackGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  feedbackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
