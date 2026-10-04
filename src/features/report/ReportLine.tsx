import { useEffect } from "react";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/design/components/Button/Button";
import { CropFrame } from "@/design/components/CropFrame/CropFrame";
import { Marked } from "@/design/components/Marked/Marked";
import { PressableScale } from "@/design/components/PressableScale/PressableScale";
import { Text } from "@/design/components/Text/Text";
import { Icon } from "@/design/icons/Icon";
import { haptic } from "@/design/theme/platform";
import { useTheme } from "@/design/theme/useTheme";
import { motion, radius, spacing } from "@/design/tokens";
import type { SemanticColorName } from "@/design/tokens";
import type { ReportFeedback, WeeklyReportItem } from "@/features/report/types";
import { t } from "@/i18n";

// ── 의식(ritual) 모션 ─────────────────────────────────────────────────────────
// 순위 숫자 1~5가 위에서 떨어지며 굴러 들어온다. 줄 하나가 착지하는 데 LAND_MS가 걸리고,
// 다섯 줄의 시작 간격(RITUAL_STEP_MS)은 마지막 줄 착지가 motion.duration.ritual(1.2s)에
// 맞아떨어지도록 역산한다.

/** 리포트 줄 수(1~5위). */
export const REPORT_LINE_COUNT = 5;
/** 줄 하나가 떨어져 자리 잡는 시간. */
const LAND_MS = motion.duration.lazy;
/** 줄 사이 시작 간격 = (전체 - 한 줄) / (줄 수 - 1). */
const RITUAL_STEP_MS =
  (motion.duration.ritual - LAND_MS) / (REPORT_LINE_COUNT - 1);
/** 숫자가 떨어지기 시작하는 높이(px, 위쪽). 글자 높이(56)의 절반쯤 — 화면 밖에서 오지 않게. */
const DROP_FROM = -28;
/** 굴러 들어오는 느낌을 주는 시작 기울기(도). 착지하며 0으로 돌아온다. */
const ROLL_FROM_DEG = -14;

/** i번째 줄(0-base)의 등장 시작 지연(ms). */
export function ritualDelay(index: number): number {
  return Math.min(index, REPORT_LINE_COUNT - 1) * RITUAL_STEP_MS;
}

/** 1위 줄이 착지하는 시점(ms) — 형광펜과 햅틱을 이때 맞춘다. */
export const HERO_LANDED_AT = ritualDelay(0) + LAND_MS;

// ── 표시 상수 ─────────────────────────────────────────────────────────────────

/** 순위 숫자 열 너비 — mega 두 자리("5")까지 들어가고 줄마다 문장 시작이 맞도록 고정. */
export const RANK_COLUMN = 44;
/** 원본 썸네일(세로형 스크린샷 비율). */
export const THUMB_WIDTH = 56;
export const THUMB_HEIGHT = 76;
/** 크롭 모서리 한 변·밖으로 밀어낸 거리. */
const THUMB_CORNER = 10;
const THUMB_OUTSET = 3;
/** 피드백 아이콘 크기. */
const FEEDBACK_ICON = 20;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;

type ReportLineProps = {
  item: WeeklyReportItem;
  /** 목록 내 위치(0-base). 등장 순서. */
  index: number;
  /** 마지막 줄이면 아래 구분선을 그리지 않는다. */
  isLast: boolean;
  onPressOriginal: (captureId: string) => void;
  /** up/down 피드백. 같은 값을 다시 누르면 해제(null). */
  onFeedback: (captureId: string, rating: ReportFeedback) => void;
};

/**
 * ReportLine — 5줄 리포트의 한 줄.
 *
 * [mega 순위 숫자] [한 문장(제목) + 요약] [크롭 모서리 썸네일], 그 아래 "원본 보기"와 피드백.
 * 카드로 감싸지 않고 줄 사이를 머리카락 구분선으로 나눈다.
 * 1위 줄만 순위 숫자에 형광펜(Marked)을 긋는다 — 숫자가 착지한 직후에.
 * 모션 줄이기면 떨어짐·기울기 없이 즉시 최종 상태.
 */
export function ReportLine({
  item,
  index,
  isLast,
  onPressOriginal,
  onFeedback,
}: ReportLineProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const isHero = item.rank === 1;

  const progress = useSharedValue(reducedMotion ? 1 : 0);
  const drop = useSharedValue(reducedMotion ? 0 : DROP_FROM);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = 1;
      drop.value = 0;
      return;
    }
    const delay = ritualDelay(index);
    // 떨어짐은 살짝 튀는 스프링(착지감), 나머지(기울기·투명도)는 같은 시간에 감속 곡선으로.
    drop.value = withDelay(delay, withSpring(0, motion.spring.bouncy));
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: LAND_MS, easing: motion.easing.decel }),
    );
    return () => {
      cancelAnimation(drop);
      cancelAnimation(progress);
    };
  }, [reducedMotion, index, drop, progress]);

  // 1위 공개 햅틱(약하게) — 앱에서 허용된 두 햅틱 중 하나. 숫자가 착지하는 순간에 맞춘다.
  useEffect(() => {
    if (!isHero) return;
    const timer = setTimeout(
      () => {
        void haptic("light");
      },
      reducedMotion ? 0 : HERO_LANDED_AT,
    );
    return () => clearTimeout(timer);
  }, [isHero, reducedMotion]);

  const rankStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: drop.value },
      { rotate: `${(1 - progress.value) * ROLL_FROM_DEG}deg` },
    ],
  }));

  // 문장·썸네일은 숫자를 따라 아래에서 살짝 올라오며 나타난다(목록 등장 규칙과 같은 거리).
  const bodyStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * motion.enterOffset }],
  }));

  const hasSummary = item.summary.trim().length > 0;
  const rankLabel = t("report.rankLabel", { rank: item.rank });

  return (
    <View
      style={[
        styles.line,
        !isLast
          ? {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }
          : null,
      ]}
    >
      <View
        style={styles.main}
        accessible
        accessibilityRole="text"
        accessibilityLabel={[
          rankLabel,
          item.title,
          hasSummary ? item.summary : "",
        ]
          .filter((s) => s.length > 0)
          .join(". ")}
      >
        <Animated.View style={[styles.rank, rankStyle]}>
          {isHero ? (
            // 형광펜은 착지 직후 그어진다(숫자가 떨어지는 중에 칠해지면 어색하다).
            <Marked
              text={String(item.rank)}
              mark={String(item.rank)}
              variant="mega"
              delay={reducedMotion ? 0 : HERO_LANDED_AT}
            />
          ) : (
            <Text variant="mega" color="textPrimary">
              {item.rank}
            </Text>
          )}
        </Animated.View>

        <Animated.View style={[styles.text, bodyStyle]}>
          <Text
            variant={isHero ? "title" : "headline"}
            numberOfLines={isHero ? 3 : 2}
          >
            {item.title}
          </Text>
          {hasSummary ? (
            <Text
              variant="caption"
              color="textSecondary"
              numberOfLines={isHero ? 3 : 2}
            >
              {item.summary}
            </Text>
          ) : null}
          <View style={styles.footer}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onPressOriginal(item.captureId)}
              accessibilityLabel={`${rankLabel} ${t("report.original")}`}
              style={styles.originalButton}
            >
              {t("report.original")}
            </Button>

            <View style={styles.feedback}>
              <FeedbackButton
                icon="thumbs-up"
                active={item.feedback === "up"}
                activeColor="primary"
                label={t("report.feedback.up")}
                onPress={() =>
                  onFeedback(
                    item.captureId,
                    item.feedback === "up" ? null : "up",
                  )
                }
              />
              <FeedbackButton
                icon="thumbs-down"
                active={item.feedback === "down"}
                activeColor="textPrimary"
                label={t("report.feedback.down")}
                onPress={() =>
                  onFeedback(
                    item.captureId,
                    item.feedback === "down" ? null : "down",
                  )
                }
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <Thumbnail uri={item.thumbnailUrl} />
        </Animated.View>
      </View>
    </View>
  );
}

/** 원본 썸네일 — 크롭 모서리 브랜드 장치로 두른다. URL이 없으면 빈 면 + 이미지 아이콘. */
function Thumbnail({ uri }: { uri: string | null }): ReactNode {
  const { colors } = useTheme();
  return (
    <CropFrame
      width={THUMB_WIDTH}
      height={THUMB_HEIGHT}
      cornerLength={THUMB_CORNER}
      outset={THUMB_OUTSET}
      color="textPrimary"
    >
      {uri ? (
        <Image
          style={styles.thumb}
          source={{ uri }}
          contentFit="cover"
          contentPosition="top"
          transition={motion.duration.fast}
          accessible={false}
        />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbEmpty,
            { backgroundColor: colors.bgMuted },
          ]}
        >
          <Icon name="images" size={FEEDBACK_ICON} color="textSecondary" />
        </View>
      )}
    </CropFrame>
  );
}

/** up/down 토글. 활성이면 지정 색 + selected 상태. 햅틱 없음(명세: 1위 공개만). */
function FeedbackButton({
  icon,
  active,
  activeColor,
  label,
  onPress,
}: {
  icon: "thumbs-up" | "thumbs-down";
  active: boolean;
  activeColor: SemanticColorName;
  label: string;
  onPress: () => void;
}): ReactNode {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.feedbackButton}
    >
      <Icon
        name={icon}
        size={FEEDBACK_ICON}
        color={active ? activeColor : "textSecondary"}
      />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  line: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  main: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  rank: {
    width: RANK_COLUMN,
    transformOrigin: "left bottom",
  },
  text: {
    flex: 1,
    gap: spacing.xs,
    // mega 숫자(56)의 윗선과 문장 첫 줄을 맞추기 위한 상단 보정.
    paddingTop: spacing.xs,
  },
  thumb: {
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: radius.md,
  },
  thumbEmpty: {
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // ghost sm 버튼의 좌우 여백(md)만큼 당겨 버튼 글자를 문장 시작선에 맞춘다.
    marginLeft: -spacing.md,
  },
  originalButton: {
    alignSelf: "flex-start",
  },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
  },
  feedbackButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: "center",
    justifyContent: "center",
  },
});
