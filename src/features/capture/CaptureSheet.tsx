import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Image } from 'expo-image';

import { BrandDot } from '@/design/components/BrandDot/BrandDot';
import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { ConfidenceBadge } from '@/design/components/ConfidenceBadge';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { glass, motion, radius, spacing, typography, zIndex } from '@/design/tokens';
import { ParcelCaptureBlock } from '@/features/parcel/components/ParcelCaptureBlock';
import { getLocale, t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';
import { useCalendarStore } from '@/stores/calendar-store';

import type { CaptureDraft, CaptureEvent, CaptureStage } from './types';

// Sheet 상단 Glass 핸들 밴드 높이. design.md §20 "Sheet 상단 64px Glass".
const GLASS_HANDLE_HEIGHT = 64;

// 핸들 스와이프 다운 닫기 판정 — 이동 거리(px) 또는 릴리즈 속도(px/ms) 중 하나만 넘으면 닫는다.
const DISMISS_DRAG_DISTANCE = 96;
const DISMISS_FLING_VELOCITY = 0.8;
// 수평 스크롤·탭과 구분하기 위한 제스처 시작 임계(아래 방향 px).
const DRAG_START_THRESHOLD = 6;

// 측정 전(첫 프레임) 시트를 화면 밖에 숨겨 두는 폴백 오프셋(px). 열릴 때 실제 window 높이로 재설정한다.
const SHEET_HIDDEN_OFFSET = 1000;
// 스캔라인 "과정 자랑" 절제(이슈 #9 D9 · design.md §2 원칙2): 은은한 투명도로 결과 중심 톤 유지.
const SCANLINE_OPACITY = 0.3;
// 스캔라인 1회 순환 길이(ms) — motion 토큰(ritual) 참조. 느린 속도로 차분함 유지.
const SCANLINE_CYCLE_MS = motion.duration.ritual;

// 진행 중(스피너) 단계 → 라벨 i18n 키.
const PROGRESS_LABEL_KEY: Record<'uploading' | 'ocr' | 'processing', string> = {
  uploading: 'capture.stage.uploading',
  ocr: 'capture.stage.ocr',
  processing: 'capture.stage.processing',
};

function isProgress(stage: CaptureStage): stage is 'uploading' | 'ocr' | 'processing' {
  return stage === 'uploading' || stage === 'ocr' || stage === 'processing';
}

/**
 * 시트 본문 제목을 단계에 맞춘다. 캡처는 무음 자동 저장되므로 "저장할까요?"가 아니라,
 * 진행 중엔 "정리하고 있어요", 완료엔 "이렇게 정리했어요", 오류엔 문제를 알리는 문구를 쓴다.
 */
function sheetHeadingKey(stage: CaptureStage): string {
  if (stage === 'done') return 'capture.sheet.titleDone';
  if (stage === 'error') return 'capture.sheet.titleError';
  return 'capture.sheet.titleProgress';
}

/**
 * "투명도 줄이기"(reduce transparency) 접근성 설정 구독 훅 — design.md P1-4.
 * 켜져 있으면 Liquid Glass 대신 불투명 폴백을 써야 가독성이 유지된다.
 * 초기값을 비동기로 읽고, 변경 이벤트를 구독한다. cleanup에서 리스너 해제.
 */
function useReduceTransparency(): boolean {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function readInitial() {
      const enabled = await AccessibilityInfo.isReduceTransparencyEnabled();
      // 비동기 응답 도착 전에 언마운트되면 상태 갱신 금지.
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
 * 캡처 확인 Sheet — 기능명세 Screen 09 / 디자인시스템 §3.7.
 *
 * capture-store의 current/isSheetOpen만 구독한다(스토어가 단일 진실).
 * NOTE: 디자인시스템 §3.7은 @gorhom/bottom-sheet를 권장하나, 현재 스택
 * (RN0.85 New Arch + reanimated4)에서 @gorhom v5 애니메이션이 silent fail 하여
 * RN 내장 Modal 기반 바텀시트로 구현한다(slide-up, 동일 UX). reanimated 호환
 * 개선 시 @gorhom로 되돌릴 수 있다.
 * 이미지 미리보기 + 단계 표시(스피너) → 완료 시 제목·요약·OCR·이벤트 카드 + 액션.
 */
export function CaptureSheet() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const current = useCaptureStore((state) => state.current);
  const isSheetOpen = useCaptureStore((state) => state.isSheetOpen);
  const closeSheet = useCaptureStore((state) => state.closeSheet);
  const startCapture = useCaptureStore((state) => state.startCapture);

  const handleRetry = useCallback(() => {
    if (!current) return;
    void startCapture({
      imageUri: current.imageUri,
      sourcePlatform: current.sourcePlatform,
    });
  }, [current, startCapture]);

  const { height: windowHeight } = useWindowDimensions();

  // 핸들 드래그 추적값 — 손가락을 따라 시트가 내려가고, 임계 미만이면 스프링 복귀한다.
  // useRef(...).current는 렌더 중 ref 접근이라 React Compiler 린트에 걸린다 — useMemo로 고정.
  const dragY = useMemo(() => new Animated.Value(0), []);
  // 등장 오프셋 — 화면 밖(아래)에서 gentle spring으로 올라온다(design.md §20, 이슈 #9 D7).
  const entranceY = useMemo(() => new Animated.Value(SHEET_HIDDEN_OFFSET), []);
  // 백드롭 딤 페이드(0→1) — 시트 등장과 함께 배경이 부드럽게 어두워진다.
  const backdropOpacity = useMemo(() => new Animated.Value(0), []);

  // 열림: 시트를 window 높이만큼 아래에 두고 gentle spring으로 0까지 올린다 + 백드롭 페이드인.
  // 닫힘: 다음 열림이 화면 밖에서 시작되도록 오프셋·드래그·딤을 초기화한다.
  useEffect(() => {
    if (isSheetOpen) {
      entranceY.setValue(windowHeight);
      Animated.parallel([
        Animated.spring(entranceY, {
          toValue: 0,
          useNativeDriver: true,
          stiffness: motion.spring.gentle.stiffness,
          damping: motion.spring.gentle.damping,
          mass: 1,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: motion.duration.base,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      dragY.setValue(0);
      entranceY.setValue(SHEET_HIDDEN_OFFSET);
      backdropOpacity.setValue(0);
    }
  }, [isSheetOpen, windowHeight, dragY, entranceY, backdropOpacity]);

  // 핸들 밴드 전용 스와이프 다운 제스처(시트 본문 스크롤과 충돌하지 않도록 핸들에만 부착).
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          gesture.dy > DRAG_START_THRESHOLD && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_event, gesture) => {
          // 위로는 끌리지 않게 0에서 클램프.
          dragY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_event, gesture) => {
          const shouldDismiss =
            gesture.dy > DISMISS_DRAG_DISTANCE || gesture.vy > DISMISS_FLING_VELOCITY;
          if (shouldDismiss) {
            closeSheet();
            return;
          }
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, closeSheet],
  );

  return (
    <Modal
      visible={isSheetOpen}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeSheet}
    >
      <View style={styles.overlay}>
        {/* 상단 빈 영역 탭 → 닫기(backdrop). 딤은 등장과 함께 페이드인. */}
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.scrim, opacity: backdropOpacity }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel={t('capture.action.close')}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            { backgroundColor: colors.bgElevated, paddingBottom: insets.bottom + spacing.lg },
            // gentle spring 등장(entranceY) + 드래그(dragY)를 합성해 자연스러운 질감을 만든다.
            { transform: [{ translateY: Animated.add(entranceY, dragY) }] },
          ]}
          accessibilityLabel={t('capture.sheet.title')}
        >
          {/* Calm Glass: 상단 핸들 영역만 Liquid Glass — 스와이프 다운(또는 스크린리더 탭)으로 닫는다. */}
          <View {...panResponder.panHandlers}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('capture.action.close')}
              accessibilityHint={t('capture.sheet.dismissHint')}
              onPress={closeSheet}
            >
              <SheetGlassHandle isDark={isDark} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            {current ? (
              <SheetBody draft={current} onClose={closeSheet} onRetry={handleRetry} />
            ) : null}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * 캡처 Sheet 상단 핸들 영역 — Calm Glass의 유일한 Liquid Glass 적용부.
 * iOS 26+에서는 GlassView(실제 Liquid Glass), 그 외에는 반투명 tint 폴백.
 * design.md §6.4 glass 토큰 + §20 Sheet 명세.
 */
function SheetGlassHandle({ isDark }: { isDark: boolean }) {
  const { colors } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const g = isDark ? glass.dark : glass.light;
  const handleBar = (
    <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
  );

  // reduce-transparency가 켜져 있으면 GlassView 대신 불투명 폴백으로 가독성 확보(P1-4).
  if (isLiquidGlassAvailable() && !reduceTransparency) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor={g.tint}
        colorScheme={isDark ? 'dark' : 'light'}
        style={styles.glassHandle}
      >
        {handleBar}
      </GlassView>
    );
  }

  // 폴백: Liquid Glass 미지원(Android·iOS26 미만)은 반투명 tint로 근사.
  return <View style={[styles.glassHandle, { backgroundColor: g.fallback }]}>{handleBar}</View>;
}

/**
 * 이미지 미리보기 + 처리 중 스캔라인 — 스캔 시그니처 핵심 요소.
 * processing 단계에만 translateY 루프 애니메이션을 실행하고,
 * 완료·오류·언마운트 시 정리한다.
 */
function PreviewWithScanLine({
  imageUri,
  isProcessing,
}: {
  imageUri: string;
  isProcessing: boolean;
}) {
  const { colors } = useTheme();
  const translateY = useMemo(() => new Animated.Value(0), []);
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_HEIGHT);

  useEffect(() => {
    if (!isProcessing) {
      translateY.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(translateY, {
        toValue: previewHeight > 0 ? previewHeight : PREVIEW_HEIGHT,
        duration: SCANLINE_CYCLE_MS,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => {
      loop.stop();
      translateY.setValue(0);
    };
  }, [isProcessing, previewHeight, translateY]);

  return (
    <View
      style={styles.previewWrapper}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (h > 0) setPreviewHeight(h);
      }}
    >
      <Image
        source={{ uri: imageUri }}
        style={styles.preview}
        contentFit="cover"
        accessibilityLabel={t('capture.preview.label')}
        accessibilityRole="image"
      />
      {isProcessing ? (
        <Animated.View
          style={[
            styles.scanLine,
            { backgroundColor: colors.primary, transform: [{ translateY }] },
          ]}
          pointerEvents="none"
        />
      ) : null}
    </View>
  );
}

type SheetBodyProps = {
  draft: CaptureDraft;
  onClose: () => void;
  onRetry: () => void;
};

function SheetBody({ draft, onClose, onRetry }: SheetBodyProps) {
  const { colors } = useTheme();
  const event = draft.result?.event ?? null;

  return (
    <View style={styles.body}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {t(sheetHeadingKey(draft.stage))}
      </Text>

      <PreviewWithScanLine imageUri={draft.imageUri} isProcessing={isProgress(draft.stage)} />

      {isProgress(draft.stage) ? <ProgressRow stage={draft.stage} /> : null}

      {draft.stage === 'error' ? (
        <ErrorBlock message={draft.error} onRetry={onRetry} />
      ) : null}

      {draft.stage === 'done' && draft.result ? (
        <ResultBlock
          title={draft.result.title}
          summary={draft.result.summary}
          ocrText={draft.result.clean_text || draft.ocrText || ''}
          captureId={draft.result.capture_id}
          event={event}
        />
      ) : null}

      <ActionRow
        stage={draft.stage}
        hasEvent={!!event}
        eventConfidence={event?.confidence}
        captureId={draft.result?.capture_id}
        event={event}
        onClose={onClose}
      />
    </View>
  );
}

type ProgressRowProps = {
  stage: 'uploading' | 'ocr' | 'processing';
};

function ProgressRow({ stage }: ProgressRowProps) {
  const { colors } = useTheme();
  const label = t(PROGRESS_LABEL_KEY[stage]);
  return (
    <View
      style={styles.progressRow}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

type ErrorBlockProps = {
  message?: string;
  onRetry: () => void;
};

function ErrorBlock({ message, onRetry }: ErrorBlockProps) {
  const { colors } = useTheme();
  return (
    <Card variant="outlined">
      <View style={styles.errorRow}>
        <Icon name="x" size={20} color="danger" />
        <Text style={[styles.errorText, { color: colors.danger }]}>
          {message ?? t('capture.error.generic')}
        </Text>
      </View>
      <View style={styles.retryButton}>
        <Button
          variant="secondary"
          size="md"
          onPress={onRetry}
          accessibilityLabel={t('capture.action.retry')}
          leftIcon={<Icon name="refresh-cw" size={16} color="primary" />}
        >
          {t('capture.action.retry')}
        </Button>
      </View>
    </Card>
  );
}

type ResultBlockProps = {
  title: string;
  summary: string;
  ocrText: string;
  /** 서버 발급 capture_id(택배 추적 등록 시 연결용). */
  captureId: string;
  event: CaptureEvent | null;
};

function ResultBlock({ title, summary, ocrText, captureId, event }: ResultBlockProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.resultBlock}>
      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{title}</Text>
      {summary ? (
        <Text style={[styles.resultSummary, { color: colors.textSecondary }]}>{summary}</Text>
      ) : null}

      {event ? <EventCard event={event} /> : null}

      {/* 택배 SMS 감지 시 추적 시작 블록(ko + 토글 ON일 때만, 컴포넌트 자체 게이트). */}
      <ParcelCaptureBlock ocrText={ocrText} captureId={captureId} />

      {ocrText ? (
        <View style={styles.ocrBlock}>
          <View style={styles.ocrLabelRow}>
            <BrandDot />
            <Text style={[styles.ocrLabel, { color: colors.textSecondary }]}>
              {t('capture.ocr.label')}
            </Text>
          </View>
          <Text style={[styles.ocrText, { color: colors.textSecondary }]}>{ocrText}</Text>
        </View>
      ) : null}
    </View>
  );
}

type EventCardProps = {
  event: CaptureEvent;
};

function EventCard({ event }: EventCardProps) {
  const { colors } = useTheme();
  // confidence 없는 구버전 캡처는 배지를 숨긴다(크래시 없이 안전 렌더).
  const confidence = event.confidence;
  return (
    <Card variant="highlight" compact>
      <View style={styles.eventRow}>
        <Icon name="calendar" size={20} color="accent" />
        <View style={styles.eventText}>
          <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>{event.title}</Text>
          <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
            {formatEventWhen(event.starts_at)}
          </Text>
          {event.location ? (
            <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
              {event.location}
            </Text>
          ) : null}
          {confidence ? <ConfidenceBadge level={confidence} /> : null}
        </View>
      </View>
    </Card>
  );
}

type ActionRowProps = {
  stage: CaptureStage;
  hasEvent: boolean;
  /** 이벤트 확신도. 없으면 'low'로 취급(구버전 호환). */
  eventConfidence?: 'high' | 'low';
  /** 서버 발급 capture_id. 캘린더 등록 키. */
  captureId?: string;
  /** 감지된 이벤트. 캘린더 등록 페이로드. */
  event?: CaptureEvent | null;
  onClose: () => void;
};

function ActionRow({ stage, hasEvent, eventConfidence, captureId, event, onClose }: ActionRowProps) {
  const isDone = stage === 'done';
  // confidence 없는 구버전은 안전하게 'low'로 취급한다.
  const isLowConfidence = !eventConfidence || eventConfidence === 'low';

  const registerCapture = useCalendarStore((state) => state.registerCapture);
  const calendarStatus = useCalendarStore((state) => state.status);
  const toast = useToast();

  // 확신 낮은 이벤트는 사용자 확인이 필요하다는 라벨로 표시(원칙5 Always Confirm).
  const calendarLabel = isLowConfidence
    ? t('capture.action.confirmAndAdd')
    : t('capture.action.addToCalendar');

  const handleAddToCalendar = useCallback(() => {
    if (!captureId || !event) return;
    void (async () => {
      if (calendarStatus !== 'connected') {
        toast.show({ tone: 'warning', title: t('calendar.toast.needConnect') });
        return;
      }
      try {
        await registerCapture({ captureId, event });
        toast.show({ tone: 'success', title: t('calendar.toast.registerSuccess') });
        onClose();
      } catch (error) {
        console.error('[CaptureSheet] 캘린더 등록 실패:', error);
        toast.show({ tone: 'danger', title: t('calendar.toast.registerError') });
      }
    })();
  }, [captureId, event, calendarStatus, registerCapture, toast, onClose]);

  return (
    <View style={styles.actions}>
      <View style={styles.flexItem}>
        <Button
          variant={isDone ? 'primary' : 'secondary'}
          size="md"
          onPress={onClose}
          accessibilityLabel={isDone ? t('capture.action.done') : t('capture.action.close')}
          leftIcon={<Icon name="check" size={16} color={isDone ? 'onPrimary' : 'primary'} />}
        >
          {isDone ? t('capture.action.done') : t('capture.action.close')}
        </Button>
      </View>

      {isDone && hasEvent ? (
        <View style={styles.flexItem}>
          <Button
            variant="accent"
            size="md"
            onPress={handleAddToCalendar}
            accessibilityLabel={calendarLabel}
            leftIcon={<Icon name="calendar" size={16} color="textOnAccent" />}
          >
            {calendarLabel}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 이벤트 시작 시각 표시. starts_at은 ISO8601(KST). 파싱 실패 시 원문 노출.
 */
function formatEventWhen(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return startsAt;
  // 기기 로케일이 아닌 앱 i18n 로케일을 명시(LOW): ko → ko-KR, 그 외 → en-US.
  return date.toLocaleString(getLocale() === 'ko' ? 'ko-KR' : 'en-US');
}

const PREVIEW_HEIGHT = 200;

const SHEET_MAX_HEIGHT = '90%';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // 딤 색은 렌더에서 colors.scrim 토큰을 인라인 적용(라이트/다크 대응).
    zIndex: zIndex.overlay,
  },
  sheet: {
    maxHeight: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    // 상단 Liquid Glass 밴드가 둥근 모서리 밖으로 새지 않도록 클립.
    overflow: 'hidden',
    zIndex: zIndex.modal,
  },
  // Calm Glass: Sheet 상단 글래스 밴드(드래그 핸들 포함). design.md §20 (64px Glass)
  glassHandle: {
    minHeight: GLASS_HANDLE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  body: {
    gap: spacing.lg,
  },
  title: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  previewWrapper: {
    width: '100%',
    height: PREVIEW_HEIGHT,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    // 과정 자랑 절제 — 은은한 투명도로 "AI가 일하는 중" 과시를 낮춘다(이슈 #9 D9).
    opacity: SCANLINE_OPACITY,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  resultBlock: {
    gap: spacing.md,
  },
  resultTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  resultSummary: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  ocrBlock: {
    gap: spacing.xs,
  },
  ocrLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ocrLabel: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: 1.5,
  },
  ocrText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventText: {
    flex: 1,
    gap: spacing.xs,
  },
  eventTitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.title.weight,
  },
  eventMeta: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
});
