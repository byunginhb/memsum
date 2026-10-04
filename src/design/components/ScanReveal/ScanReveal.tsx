import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import type { ImageLoadEventData } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/design/theme/useTheme';
import { motion, radius } from '@/design/tokens';

/** 정규화 좌표(0~1, 이미지 기준) 글자 영역. OCR 블록 좌표를 그대로 넘긴다. */
export type ScanBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScanRevealProps = {
  imageUri: string;
  /**
   * 글자 영역(이미지 기준 정규화 좌표). 없거나 비면 형광펜 단계 없이 스캔선만 지나간다 —
   * 이미지와 무관한 자리에 형광펜을 긋는 것보다 낫다.
   */
  boxes?: readonly ScanBox[];
  /** 연출이 끝나면 1회 호출(모션 줄이기면 즉시). */
  onDone?: () => void;
  /**
   * 축약 연출(스플래시·온보딩·작은 미리보기): 스캔 600ms, 끝에 빨려 들어가는 퇴장 없음, 햅틱 없음.
   * 기본 false = 캡처 시트용 풀 연출(스캔 900ms → 박스 → 축소 퇴장 → 성공 햅틱).
   */
  compact?: boolean;
  /** 이미지 가로/세로 비. 생략하면 이미지 로드 후 실제 비율을 쓴다. */
  aspectRatio?: number;
  /** 바깥 컨테이너(너비·여백). 높이는 aspectRatio로 정해진다. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** 스캔선 두께(px). */
const LINE_HEIGHT = 2;
/** 스캔선 아래로 번지는 꼬리 높이(px). */
const TAIL_HEIGHT = 56;
/** 꼬리 시작 불투명도(12%). */
const TAIL_OPACITY = 0.12;
/** 형광펜 박스 한 개가 그어지는 시간. */
const BOX_DRAW_MS = motion.duration.base;
/**
 * 형광펜 박스 합성. 명세 "형광펜 위 글씨는 잉크색" — 반투명으로 덮으면 글자가 탁해지므로
 * 불투명 형광펜을 곱하기(multiply)로 얹는다: 흰 바탕은 형광펜색, 검은 글자는 검정 그대로.
 * - iOS(Fabric): RCTViewComponentView가 layer.compositingFilter="multiplyBlendMode"로 그린다.
 * - Android(Fabric): ReactViewGroup.drawChild가 saveLayer + Paint.blendMode로 그리는데 API 29(Q)+ 한정.
 *   그 미만은 조용히 normal로 그려져 글자가 가려지므로, 예전처럼 반투명으로 대체한다.
 * - 웹: react-native-web이 CSS mix-blend-mode로 그대로 넘긴다.
 */
const SUPPORTS_MULTIPLY = Platform.OS !== 'android' || (typeof Platform.Version === 'number' && Platform.Version >= 29);
/** multiply를 못 쓰는 구형 안드로이드에서 아래 글자가 비쳐 보이게 하는 불투명도. */
const BOX_FALLBACK_OPACITY = 0.55;
const BOX_BLEND: ViewStyle = SUPPORTS_MULTIPLY
  ? { mixBlendMode: 'multiply' }
  : { opacity: BOX_FALLBACK_OPACITY };
/** 마지막 박스 뒤 퇴장 시작까지 숨 고르기. */
const EXIT_PAUSE_MS = motion.duration.fast;
/** 퇴장 시 최종 배율. */
const EXIT_SCALE = 0.6;
/** 이미지 비율을 모를 때 임시 비율(세로형 스크린샷). */
const FALLBACK_RATIO = 9 / 19.5;

const EMPTY_BOXES: readonly ScanBox[] = [];

/**
 * 이미지 기준 정규화 좌표 → 프레임 기준 정규화 좌표. 이미지는 contentFit="cover"(가운데 정렬)라
 * 프레임 비율과 이미지 비율이 다르면 긴 쪽이 잘린다 — 같은 배율·오프셋으로 박스를 옮기고
 * 프레임 밖으로 나간 부분은 잘라 낸다(완전히 밖이면 null).
 */
export function mapBoxToCoverFrame(box: ScanBox, imageRatio: number, frameRatio: number): ScanBox | null {
  // 이미지가 프레임보다 넓으면 가로가 잘리고(높이 맞춤), 좁으면 세로가 잘린다(너비 맞춤).
  const sx = imageRatio > frameRatio ? imageRatio / frameRatio : 1;
  const sy = imageRatio > frameRatio ? 1 : frameRatio / imageRatio;
  const left = (box.x - 0.5) * sx + 0.5;
  const top = (box.y - 0.5) * sy + 0.5;
  const right = left + box.width * sx;
  const bottom = top + box.height * sy;
  const x = Math.max(0, left);
  const y = Math.max(0, top);
  const width = Math.min(1, right) - x;
  const height = Math.min(1, bottom) - y;
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

async function successHaptic(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // 햅틱 미지원 기기 — 무시.
  }
}

/**
 * ScanReveal — 시그니처 모션 "스캔".
 *
 * 1) 코발트 스캔선(2px + 아래로 번지는 12% 꼬리)이 위→아래로 훑는다(900ms, compact 600ms).
 * 2) 글자 영역에 형광펜 박스가 120ms 간격으로 왼→오 그어진다(보이는 순서 = 위→아래).
 * 3) 풀 연출이면 이미지가 작아지며 사라지고(결과 카드 자리로 빨려 들어감), onDone + 성공 햅틱.
 *
 * 이미지 로드(또는 실패) 후에 시작한다. 모션 줄이기면 박스가 칠해진 최종 상태로 즉시 보이고 onDone.
 * 결과 카드 배치는 호출측 몫 — onDone에서 결과 화면으로 바꾼다.
 */
export function ScanReveal({
  imageUri,
  boxes,
  onDone,
  compact = false,
  aspectRatio,
  style,
  accessibilityLabel,
}: ScanRevealProps): ReactNode {
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const [loadedRatio, setLoadedRatio] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(0);

  const scan = useSharedValue(0);
  const exit = useSharedValue(0);
  const boxProgress = useSharedValue(reducedMotion ? 1 : 0);

  // onDone은 ref로 들고 있어 effect 재실행(=연출 재시작)을 막는다.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const ratio = aspectRatio ?? loadedRatio ?? FALLBACK_RATIO;
  // 박스는 이미지 기준 좌표라 실제 이미지 비율을 알아야 프레임 좌표로 옮길 수 있다.
  // 모르면(로드 실패 등) 프레임 비율과 같다고 본다 = 변환 없음.
  const imageRatio = loadedRatio ?? ratio;
  const rows = (boxes ?? EMPTY_BOXES)
    .map((b) => mapBoxToCoverFrame(b, imageRatio, ratio))
    .filter((b): b is ScanBox => b !== null)
    .sort((a, b) => a.y - b.y);
  const rowCount = rows.length;
  const scanMs = compact ? motion.duration.scanShort : motion.duration.scan;
  // 박스 i는 0..rowCount 구간의 진행값으로 그린다(하나의 공유값으로 순차 표현). 박스가 없으면 단계 생략.
  const boxesMs = rowCount > 0 ? (rowCount - 1) * motion.markerStagger + BOX_DRAW_MS : 0;
  const boxesMsRef = useRef(boxesMs);
  useEffect(() => {
    boxesMsRef.current = boxesMs;
  }, [boxesMs]);

  useEffect(() => {
    if (!ready || height === 0) return;

    const finish = (): void => {
      if (!compact) void successHaptic();
      onDoneRef.current?.();
    };

    if (reducedMotion) {
      scan.value = 1;
      boxProgress.value = 1;
      finish();
      return;
    }

    // 박스 단계 길이는 스캔이 끝나는 순간의 값으로 정한다. OCR 좌표는 스캔 도중에 도착하기도 하는데,
    // 그때 effect를 다시 돌리면 스캔이 처음부터 재시작되므로 의존성 대신 ref로 읽는다.
    let cancelled = false;
    const afterScan = (): void => {
      if (cancelled) return;
      const ms = boxesMsRef.current;
      if (ms > 0) boxProgress.value = withTiming(1, { duration: ms });
      exit.value = withDelay(
        ms + (compact ? 0 : EXIT_PAUSE_MS),
        withTiming(1, { duration: compact ? 0 : motion.duration.slow, easing: motion.easing.accel }, (finished) => {
          if (finished) scheduleOnRN(finish);
        }),
      );
    };
    scan.value = withTiming(1, { duration: scanMs, easing: motion.easing.scan }, (finished) => {
      if (finished) scheduleOnRN(afterScan);
    });

    return () => {
      cancelled = true;
      cancelAnimation(scan);
      cancelAnimation(boxProgress);
      cancelAnimation(exit);
    };
  }, [ready, height, reducedMotion, compact, scanMs, scan, boxProgress, exit]);

  const handleLoad = (e: ImageLoadEventData): void => {
    const { width, height: h } = e.source;
    if (width > 0 && h > 0) setLoadedRatio(width / h);
    setReady(true);
  };

  const handleLayout = (e: LayoutChangeEvent): void => {
    setHeight(e.nativeEvent.layout.height);
  };

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scan.value * height }],
    // 다 훑고 나면 선은 사라진다.
    opacity: interpolate(scan.value, [0, 0.9, 1], [1, 1, 0]),
  }));

  const exitStyle = useAnimatedStyle(() => {
    if (compact) return {};
    return {
      opacity: interpolate(exit.value, [0, 1], [1, 0]),
      transform: [{ scale: interpolate(exit.value, [0, 1], [1, EXIT_SCALE]) }],
    };
  });

  return (
    <Animated.View
      onLayout={handleLayout}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={[styles.frame, { aspectRatio: ratio, backgroundColor: colors.bgMuted }, style, exitStyle]}
    >
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        onLoad={handleLoad}
        onError={() => setReady(true)}
      />

      {/* 이미지 로드 전엔 비율이 임시값이라 박스 자리가 틀린다 — 로드 뒤에만 그린다. */}
      {(ready ? rows : EMPTY_BOXES).map((box, i) => (
        <MarkerBox
          key={`${box.x}-${box.y}-${i}`}
          box={box}
          index={i}
          count={rowCount}
          progress={boxProgress}
          color={colors.marker}
        />
      ))}

      {reducedMotion ? null : (
        <Animated.View pointerEvents="none" style={[styles.scanner, lineStyle]}>
          <View style={[styles.line, { backgroundColor: colors.primary }]} />
          <Svg width="100%" height={TAIL_HEIGHT}>
            <Defs>
              <LinearGradient id="scanTail" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity={TAIL_OPACITY} />
                <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height={TAIL_HEIGHT} fill="url(#scanTail)" />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
}

type MarkerBoxProps = {
  box: ScanBox;
  index: number;
  count: number;
  progress: SharedValue<number>;
  color: string;
};

/** 형광펜 박스 1개. 공유 진행값(0~1)에서 자기 구간만 잘라 왼→오로 그어진다. */
function MarkerBox({ box, index, count, progress, color }: MarkerBoxProps): ReactNode {
  const total = (count - 1) * motion.markerStagger + BOX_DRAW_MS;
  const start = (index * motion.markerStagger) / total;
  const end = (index * motion.markerStagger + BOX_DRAW_MS) / total;

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.value, [start, end], [0, 1], 'clamp') }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.box,
        {
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.width * 100}%`,
          height: `${box.height * 100}%`,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  scanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  line: {
    height: LINE_HEIGHT,
  },
  box: {
    position: 'absolute',
    ...BOX_BLEND,
    borderRadius: radius.sm / 2,
    transformOrigin: 'left center',
  },
});
