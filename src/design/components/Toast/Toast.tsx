import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/design/components/Button/Button';
import { useTheme } from '@/design/theme/useTheme';
import { elevation, motion, radius, spacing, typography, zIndex } from '@/design/tokens';
import type { SemanticColorName } from '@/design/tokens';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

/**
 * Toast 액션 슬롯 — 우측 ghost 버튼. 라벨은 호출측에서 i18n으로 채운다.
 * (컴포넌트 내 한국어 리터럴 금지 규칙: 모든 문구는 props로 주입)
 */
export type ToastAction = {
  label: string;
  onPress: () => void;
};

type ToastProps = {
  tone: ToastTone;
  /** 제목 — 호출측에서 i18n 문구 주입. */
  title: string;
  /** 보조 설명 — 선택. */
  description?: string;
  action?: ToastAction;
};

/** stroke-width — Icon.tsx와 동일하게 1.75로 통일. */
const ICON_STROKE_WIDTH = 1.75;
/** leading 아이콘 크기(px). */
const ICON_SIZE = 20;

/** 안전영역 위/아래 추가 오프셋(px) — design.md §21 위치 명세. */
const IOS_TOP_OFFSET = spacing.md; // statusBar + 12 (Dynamic Island 회피)
const ANDROID_BOTTOM_OFFSET = spacing.lg; // navigation bar 위 16 (Material 결)

/** 진입 시 슬라이드 거리(px). iOS는 위에서, Android는 아래에서. */
const SLIDE_DISTANCE = spacing['2xl'];

type ToneVisual = {
  /** leading 아이콘 컴포넌트. */
  Icon: LucideIcon;
  /** 아이콘 색 의미 토큰 이름. */
  color: SemanticColorName;
};

/** tone → leading 아이콘 + 색 매핑. 색은 모두 의미 토큰(하드코딩 금지). */
const TONE_VISUAL: Record<ToastTone, ToneVisual> = {
  info: { Icon: Info, color: 'info' },
  success: { Icon: CheckCircle2, color: 'success' },
  warning: { Icon: AlertTriangle, color: 'warning' },
  danger: { Icon: AlertCircle, color: 'danger' },
};

/**
 * iOS는 상단, Android는 하단에 고정하기 위한 위치 스타일.
 * Platform.select를 상수로 추상화(인라인 분기 금지 규칙).
 */
function positionStyle(insets: ReturnType<typeof useSafeAreaInsets>) {
  return Platform.select({
    ios: { top: insets.top + IOS_TOP_OFFSET },
    android: { bottom: insets.bottom + ANDROID_BOTTOM_OFFSET },
    default: { top: insets.top + IOS_TOP_OFFSET },
  });
}

/**
 * 진입 시작 시 화면 밖으로 밀어둘 초기 translateY.
 * iOS(상단)는 위로(-), Android(하단)는 아래로(+).
 */
const ENTER_FROM_Y = Platform.OS === 'android' ? SLIDE_DISTANCE : -SLIDE_DISTANCE;

/**
 * Toast — design.md §21 시각 컴포넌트.
 *
 * bgElevated + elevation[4] + radius.xl 컨테이너에 tone별 leading 아이콘/색,
 * 제목·설명, 우측 ghost 액션 버튼. 위치/모션/큐는 ToastProvider가 관리하고,
 * 이 컴포넌트는 "보이는 1개"의 진입/퇴장 애니메이션과 레이아웃만 담당한다.
 *
 * 진입: slide(translateY)+fade duration.base(200), 퇴장: fade duration.fast(150).
 * reduce-motion이 켜져 있으면 애니메이션 없이 즉시 표시(opacity 1, translateY 0).
 *
 * a11y: accessibilityRole="alert" + Android live region "polite".
 * (iOS announceForAccessibility는 ToastProvider에서 show 시 호출)
 */
export function Toast({ tone, title, description, action }: ToastProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const visual = TONE_VISUAL[tone];

  // reduce-motion이면 시작부터 최종 상태(보임)로 둬 즉시 표시한다.
  const opacity = useSharedValue(reducedMotion ? 1 : 0);
  const translateY = useSharedValue(reducedMotion ? 0 : ENTER_FROM_Y);

  useEffect(() => {
    if (reducedMotion) {
      // 접근성: 즉시 표시(애니메이션 생략).
      opacity.value = 1;
      translateY.value = 0;
      return;
    }

    // 진입: slide + fade, base(200) + standard easing — design.md §21.
    opacity.value = withTiming(1, {
      duration: motion.duration.base,
      easing: motion.easing.standard,
    });
    translateY.value = withTiming(0, {
      duration: motion.duration.base,
      easing: motion.easing.standard,
    });

    // 언마운트 시 진행 중 애니메이션 취소(worklet 잔존 방지).
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [reducedMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const ToneIcon = visual.Icon;

  return (
    <Animated.View
      // 화면에 고정된 토스트 컨테이너. 좌우 여백 + 플랫폼별 상/하 위치.
      pointerEvents="box-none"
      style={[styles.anchor, positionStyle(insets)]}
    >
      <Animated.View
        accessibilityRole="alert"
        // Android: 내용 변경을 스크린리더가 공손히 읽음. iOS는 Provider가 announce.
        accessibilityLiveRegion="polite"
        style={[
          styles.container,
          // elevation[4] — 플랫폼별 shadow/elevation(테마 독립).
          elevation[4],
          { backgroundColor: colors.bgElevated },
          animatedStyle,
        ]}
      >
        <View style={styles.leading}>
          <ToneIcon
            size={ICON_SIZE}
            color={colors[visual.color]}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </View>

        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {title}
          </Text>
          {description ? (
            <Text
              style={[styles.description, { color: colors.textSecondary }]}
              numberOfLines={3}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {action ? (
          <View style={styles.actionSlot}>
            <Button
              variant="ghost"
              size="sm"
              onPress={action.onPress}
              accessibilityLabel={action.label}
            >
              {action.label}
            </Button>
          </View>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: zIndex.toast,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.title.weight,
  },
  description: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  actionSlot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
