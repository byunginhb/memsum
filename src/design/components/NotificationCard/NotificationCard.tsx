import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AccessibilityInfo,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';

import { Badge } from '@/design/components/Badge/Badge';
import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import { haptic } from '@/design/theme/platform';
import { useTheme } from '@/design/theme/useTheme';
import { glass, motion, radius, spacing, typography, zIndex } from '@/design/tokens';

export type NotificationCardAction = {
  label: string;
  variant: 'primary' | 'ghost';
  onPress: () => void;
};

export type NotificationCardEvent = {
  date: string;
  location?: string;
};

export type NotificationCardProps = {
  thumbnail?: { uri: string };
  /** 카드 제목. 문구는 호출측이 i18n으로 전달(컴포넌트 내 한국어 리터럴 금지). */
  title: string;
  /** OCR 미리보기 본문. 최대 3줄로 잘린다. */
  body: string;
  /** 이벤트 감지 시 날짜·장소. 있으면 캘린더 한 줄을 추가 렌더. */
  event?: NotificationCardEvent;
  /** "이벤트 감지" 배지 라벨. 미지정 시 배지를 그리지 않는다(문구는 props로만). */
  eventLabel?: string;
  /** 1~2개의 액션 버튼. design.md §24. */
  actions: NotificationCardAction[];
  /** 자동·수동 닫기 콜백. */
  onDismiss: () => void;
  /** 자동 닫힘까지의 시간(ms). 기본 3000. design.md §24. */
  autoHideAfter?: number;
  /** 전체 카드를 읽는 a11y 라벨. 미지정 시 title+body+event로 자체 조합. */
  accessibilityLabel?: string;
};

/** OCR 미리보기 최대 줄 수 — design.md §24 "OCR 미리보기 (3줄)". */
const BODY_MAX_LINES = 3;

/** 상단 safeArea 아래 추가 여백(px) — design.md §24 "top + safeArea + 12". */
const TOP_OFFSET = 12;

/** 자동 닫힘 기본 시간(ms) — design.md §24. */
const DEFAULT_AUTO_HIDE_MS = 3000;

/** 진입 시 translateY 시작값(px) — design.md §24 "translateY: -100 → 0". */
const ENTER_TRANSLATE_Y = -100;

/** 좌측 썸네일 한 변 길이(px). */
const THUMBNAIL_SIZE = 48;

/**
 * "투명도 줄이기"(reduce transparency) 접근성 설정 구독 훅 — design.md P1-4 / CaptureSheet 동일 패턴.
 * 켜져 있으면 Liquid Glass 대신 불투명 폴백으로 가독성을 확보한다.
 * 초기값을 비동기로 읽고 변경 이벤트를 구독하며, cleanup에서 리스너를 해제한다.
 */
function useReduceTransparency(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function readInitial(): Promise<void> {
      const enabled = await AccessibilityInfo.isReduceTransparencyEnabled();
      // 비동기 응답 도착 전 언마운트되면 상태 갱신 금지.
      if (isMounted) setReduceTransparency(enabled);
    }
    void readInitial();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
}

/**
 * 미지정 시 카드 전체를 읽는 a11y 라벨을 title·body·event로 조합한다.
 * 스크린리더가 카드를 한 번에 읽도록 의미 단위로 연결한다.
 */
function buildAccessibilityLabel(
  title: string,
  body: string,
  event: NotificationCardEvent | undefined,
): string {
  const eventPart = event
    ? [event.date, event.location].filter(Boolean).join(' ')
    : '';
  return [title, body, eventPart].filter(Boolean).join('. ');
}

/**
 * NotificationCard — design.md §24 ⭐ Liquid Glass 적용
 *
 * 스크린샷 감지 후 화면 상단에서 슬라이드 인하는 알림 카드.
 * 시각: CaptureSheet의 SheetGlassHandle 패턴 재사용 — iOS 26+ GlassView,
 * 미지원/투명도줄이기 시 불투명 fallback. tint/border/radius/zIndex 모두 토큰.
 * 모션: translateY -100→0 + opacity 0→1 (진입 slow/decel), 햅틱 light.
 * reduce-motion 시 페이드만. autoHideAfter 타이머로 자동 onDismiss.
 */
export function NotificationCard({
  thumbnail,
  title,
  body,
  event,
  eventLabel,
  actions,
  onDismiss,
  autoHideAfter = DEFAULT_AUTO_HIDE_MS,
  accessibilityLabel,
}: NotificationCardProps): ReactNode {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // reduce-motion 시엔 이동을 끄고 페이드만 — 초기 translateY를 0으로 둔다.
  const translateY = useSharedValue(reducedMotion ? 0 : ENTER_TRANSLATE_Y);
  const opacity = useSharedValue(0);

  // 진입 애니메이션 + 햅틱. 토큰 duration/easing만 사용(매직넘버 금지).
  // reduce-motion 시엔 페이드만(이동 없음, base 속도), 아니면 slow + decel로 슬라이드.
  useEffect(() => {
    void haptic('light');

    const enter = reducedMotion
      ? { duration: motion.duration.base }
      : { duration: motion.duration.slow, easing: motion.easing.decel };

    opacity.value = withTiming(1, enter);
    if (!reducedMotion) {
      translateY.value = withTiming(0, enter);
    }

    return () => {
      // 언마운트 시 진행 중 애니메이션 취소(worklet 잔존 방지).
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [reducedMotion, opacity, translateY]);

  // autoHideAfter 타이머로 자동 닫힘. cleanup에서 타이머 해제.
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoHideAfter);
    return () => clearTimeout(timer);
  }, [autoHideAfter, onDismiss]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const g = isDark ? glass.dark : glass.light;
  const reduceTransparency = useReduceTransparency();
  const useLiquidGlass = isLiquidGlassAvailable() && !reduceTransparency;

  const resolvedLabel =
    accessibilityLabel ?? buildAccessibilityLabel(title, body, event);

  const inner = (
    <CardContent
      thumbnail={thumbnail}
      title={title}
      body={body}
      event={event}
      eventLabel={eventLabel}
      actions={actions}
    />
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      accessibilityRole="alert"
      accessibilityLabel={resolvedLabel}
      style={[
        styles.container,
        {
          top: insets.top + TOP_OFFSET,
          width: Dimensions.get('window').width - spacing.lg * 2,
          left: spacing.lg,
          borderColor: g.border,
          zIndex: zIndex.toast,
        },
        animatedStyle,
      ]}
    >
      {useLiquidGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={g.tint}
          colorScheme={isDark ? 'dark' : 'light'}
          style={styles.surface}
        >
          {inner}
        </GlassView>
      ) : (
        // 폴백: Liquid Glass 미지원(Android·iOS26 미만) 또는 투명도줄이기 → 불투명 tint.
        <View style={[styles.surface, { backgroundColor: g.fallback }]}>{inner}</View>
      )}
    </Animated.View>
  );
}

type CardContentProps = {
  thumbnail?: { uri: string };
  title: string;
  body: string;
  event?: NotificationCardEvent;
  eventLabel?: string;
  actions: NotificationCardAction[];
};

/** 카드 내부 레이아웃 — 썸네일·텍스트·이벤트 한 줄·액션. */
function CardContent({
  thumbnail,
  title,
  body,
  event,
  eventLabel,
  actions,
}: CardContentProps): ReactNode {
  const { colors } = useTheme();

  return (
    <View style={styles.content}>
      <View style={styles.topRow}>
        {thumbnail ? (
          <Image
            source={{ uri: thumbnail.uri }}
            style={styles.thumbnail}
            contentFit="cover"
            accessibilityRole="image"
          />
        ) : null}

        <View style={styles.textColumn}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.body, { color: colors.textSecondary }]}
            numberOfLines={BODY_MAX_LINES}
          >
            {body}
          </Text>

          {event ? (
            <EventRow event={event} eventLabel={eventLabel} />
          ) : null}
        </View>
      </View>

      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <View key={action.label} style={styles.actionItem}>
              <Button
                variant={action.variant}
                size="sm"
                onPress={action.onPress}
                accessibilityLabel={action.label}
              >
                {action.label}
              </Button>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

type EventRowProps = {
  event: NotificationCardEvent;
  eventLabel?: string;
};

/** 이벤트 감지 시 캘린더 아이콘 + 날짜/장소 한 줄 + (eventLabel 있으면) accent 배지. */
function EventRow({ event, eventLabel }: EventRowProps): ReactNode {
  const { colors } = useTheme();
  const whenWhere = [event.date, event.location].filter(Boolean).join(' ');

  return (
    <View style={styles.eventBlock}>
      <View style={styles.eventLine}>
        {/* 와이어의 📅 이모지는 Icon calendar로 대체(이모지 금지). */}
        <Icon name="calendar" size={16} color="accent" />
        <Text
          style={[styles.eventText, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {whenWhere}
        </Text>
      </View>

      {eventLabel ? (
        <Badge tone="accent" variant="subtle">
          {eventLabel}
        </Badge>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    // 둥근 모서리 밖으로 Glass 표면이 새지 않도록 클립.
    overflow: 'hidden',
  },
  surface: {
    borderRadius: radius.xl,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radius.md,
  },
  textColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.title.weight,
  },
  body: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  eventBlock: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  eventLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eventText: {
    flex: 1,
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  actionItem: {
    minWidth: 0,
  },
});
