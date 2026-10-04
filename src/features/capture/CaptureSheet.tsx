import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { Image } from 'expo-image';

import {
  Button,
  CropFrame,
  Eyebrow,
  Icon,
  PressableScale,
  ScanReveal,
  Text,
  useTheme,
} from '@/design';
import { elevation, motion, radius, spacing } from '@/design/tokens';
import { SkeletonBlock } from '@/features/home/Skeleton';
import { StaggerIn } from '@/features/home/StaggerIn';
import { ParcelCaptureBlock } from '@/features/parcel/components/ParcelCaptureBlock';
import { t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';

import { ExtractedEventRow } from './ExtractedEventRow';
import type { CaptureDraft, CaptureStage, ProcessCaptureResult } from './types';
import { useAddToCalendar } from './use-add-to-calendar';

// 끌어내려 닫기 판정 — 거리(px) 또는 놓는 속도(px/s) 중 하나만 넘으면 닫는다.
const DISMISS_DRAG_DISTANCE = 96;
const DISMISS_FLING_VELOCITY = 800;
// 세로 끌기로 인정하는 최소 이동, 가로로 이만큼 먼저 움직이면 끌기 취소(가로 스크롤 보호).
const DRAG_ACTIVATE_Y = 6;
const DRAG_FAIL_X = 16;
/** 끌기 손잡이 영역 높이 — 터치 44 이상. */
const HANDLE_AREA = 32;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const SHEET_MAX_HEIGHT = '92%';
/** 스캔 미리보기 폭(시트 대비). 세로 스크린샷이 시트를 다 채우지 않게. */
const SCAN_WIDTH = '62%';
/** 결과 머리 썸네일(스캔 이미지가 빨려 들어가는 자리). */
const THUMB_WIDTH = 56;
const THUMB_HEIGHT = 74;
const THUMB_CORNER = 8;
/** 결과 행은 스캔이 끝나 썸네일 자리가 잡힌 뒤 뜬다. */
const RESULT_BASE_DELAY = motion.duration.fast;
/** 결과 행이 떠오르는 거리 — 목록 등장보다 크게(아래에서 "튀어나오는" 느낌). */
const RESULT_RISE = 16;
/** "인식된 글자 보기" 행 높이 — 터치 44 이상. */
const TOGGLE_HEIGHT = 48;

type Progress = 'uploading' | 'ocr' | 'processing';

const STAGE_LABEL_KEY: Record<Progress, string> = {
  uploading: 'capture.stage.uploading',
  ocr: 'capture.stage.ocr',
  processing: 'capture.stage.processing',
};

function isProgress(stage: CaptureStage): stage is Progress {
  return stage === 'uploading' || stage === 'ocr' || stage === 'processing';
}


/**
 * 캡처 시트 — 처리 중엔 ScanReveal 풀 연출, 끝나면 제목 + 뽑힌 항목 행.
 *
 * capture-store의 current/isSheetOpen이 단일 진실. 시트 슬라이드·끌어내려 닫기는
 * reanimated + gesture-handler(UI 스레드)로 처리한다. Modal은 닫힘 모션이 끝난 뒤에 내린다.
 * Modal은 별도 네이티브 창이라 안쪽을 GestureHandlerRootView로 다시 감싸야 제스처가 동작한다(안드로이드).
 */
export function CaptureSheet(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const current = useCaptureStore((s) => s.current);
  const isSheetOpen = useCaptureStore((s) => s.isSheetOpen);
  const closeSheet = useCaptureStore((s) => s.closeSheet);
  const startCapture = useCaptureStore((s) => s.startCapture);

  // 열림은 즉시 Modal을 띄우고, 닫힘은 내려가는 모션이 끝난 뒤 Modal을 내린다.
  const [modalVisible, setModalVisible] = useState(isSheetOpen);
  const [prevOpen, setPrevOpen] = useState(isSheetOpen);
  if (prevOpen !== isSheetOpen) {
    setPrevOpen(isSheetOpen);
    if (isSheetOpen) setModalVisible(true);
  }

  const offset = useSharedValue(screenHeight);

  useEffect(() => {
    if (isSheetOpen) {
      offset.value = screenHeight;
      offset.value = reducedMotion
        ? 0
        : withTiming(0, { duration: motion.duration.slow, easing: motion.easing.emphasized });
      return;
    }
    offset.value = withTiming(
      screenHeight,
      { duration: reducedMotion ? 0 : motion.duration.base, easing: motion.easing.accel },
      (finished) => {
        if (finished) scheduleOnRN(setModalVisible, false);
      },
    );
  }, [isSheetOpen, reducedMotion, screenHeight, offset]);

  const handleRetry = useCallback((): void => {
    if (!current) return;
    void startCapture({ imageUri: current.imageUri, sourcePlatform: current.sourcePlatform });
  }, [current, startCapture]);

  const pan = Gesture.Pan()
    .activeOffsetY(DRAG_ACTIVATE_Y)
    .failOffsetX([-DRAG_FAIL_X, DRAG_FAIL_X])
    .onUpdate((e) => {
      offset.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DRAG_DISTANCE || e.velocityY > DISMISS_FLING_VELOCITY) {
        scheduleOnRN(closeSheet);
        return;
      }
      offset.set(withSpring(0, motion.spring.snappy));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [0, screenHeight], [1, 0], 'clamp'),
  }));

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={closeSheet}
    >
      <GestureHandlerRootView style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, scrimStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeSheet}
            accessibilityRole="button"
            accessibilityLabel={t('capture.action.close')}
          />
        </Animated.View>

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            elevation[4],
            { backgroundColor: colors.bgSurface, paddingBottom: insets.bottom + spacing.lg },
            sheetStyle,
          ]}
        >
          <GestureDetector gesture={pan}>
            <Pressable
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel={t('capture.action.close')}
              accessibilityHint={t('capture.sheet.dismissHint')}
              style={styles.handleArea}
            >
              <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            </Pressable>
          </GestureDetector>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {current ? (
              <SheetBody key={current.id} draft={current} onClose={closeSheet} onRetry={handleRetry} />
            ) : null}
          </ScrollView>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

type SheetBodyProps = {
  draft: CaptureDraft;
  onClose: () => void;
  onRetry: () => void;
};

/**
 * 단계별 본문. 스캔은 처리 시작과 함께 1회 재생되고, 결과가 먼저 와도 스캔이 끝난 뒤에 결과를 보인다
 * (연출이 중간에 잘리지 않게). 스캔이 먼저 끝나고 서버가 아직이면 조용한 대기(스켈레톤)로 이어진다.
 */
function SheetBody({ draft, onClose, onRetry }: SheetBodyProps): ReactNode {
  // key={draft.id}로 마운트되므로 처음 본 단계가 진행 중이면 스캔부터 시작한다.
  const [scanning, setScanning] = useState(() => isProgress(draft.stage));
  const handleScanDone = useCallback(() => setScanning(false), []);

  if (draft.stage === 'error') {
    // 글자 없는 이미지는 실패가 아니라 "저장하지 않음" — 조용한 안내로 보인다.
    if (draft.errorCode === 'noText') {
      return <NoTextNotice imageUri={draft.imageUri} onClose={onClose} />;
    }
    return (
      <ErrorNotice
        message={t(`capture.error.${draft.errorCode ?? 'generic'}`)}
        onRetry={onRetry}
        onClose={onClose}
      />
    );
  }

  if (scanning) {
    const stageKey = isProgress(draft.stage) ? STAGE_LABEL_KEY[draft.stage] : 'capture.stage.processing';
    return (
      <View style={styles.body}>
        <View style={styles.headText}>
          <Eyebrow accessibilityLiveRegion="polite">{t(stageKey)}</Eyebrow>
          <Text variant="title" accessibilityRole="header">
            {t('capture.sheet.titleProgress')}
          </Text>
        </View>
        <ScanReveal
          imageUri={draft.imageUri}
          // OCR 전이거나 좌표가 없으면 undefined — 형광펜 없이 스캔선만 지나간다.
          boxes={draft.ocrBoxes}
          onDone={handleScanDone}
          style={styles.scan}
          accessibilityLabel={t('capture.preview.label')}
        />
      </View>
    );
  }

  if (draft.stage === 'done' && draft.result) {
    return <ResultView draft={draft} result={draft.result} onClose={onClose} />;
  }

  // 스캔은 끝났지만 서버 정리가 아직 — 결과 자리만 은은하게 잡아 둔다.
  const waitingKey = isProgress(draft.stage) ? STAGE_LABEL_KEY[draft.stage] : 'capture.stage.processing';
  return (
    <View style={styles.body}>
      <View style={styles.resultHead}>
        <Thumb uri={draft.imageUri} />
        <View style={styles.headTextRow}>
          <Eyebrow accessibilityLiveRegion="polite">{t(waitingKey)}</Eyebrow>
          <SkeletonBlock width="80%" height={22} />
        </View>
      </View>
      <View style={styles.waitRows} accessible accessibilityRole="progressbar" accessibilityLabel={t(waitingKey)}>
        <SkeletonBlock height={16} width="92%" />
        <SkeletonBlock height={16} width="64%" />
      </View>
    </View>
  );
}

function Thumb({ uri }: { uri: string }): ReactNode {
  const { colors } = useTheme();
  return (
    <CropFrame width={THUMB_WIDTH} height={THUMB_HEIGHT} cornerLength={THUMB_CORNER} outset={3}>
      <Image
        source={{ uri }}
        style={[styles.thumb, { backgroundColor: colors.bgMuted }]}
        contentFit="cover"
        contentPosition="top"
        accessibilityLabel={t('capture.preview.label')}
      />
    </CropFrame>
  );
}

type ResultViewProps = {
  draft: CaptureDraft;
  result: ProcessCaptureResult;
  onClose: () => void;
};

function ResultView({ draft, result, onClose }: ResultViewProps): ReactNode {
  const { colors } = useTheme();
  const [ocrOpen, setOcrOpen] = useState(false);
  const event = result.event;
  const ocrText = result.clean_text || draft.ocrText || '';
  const calendar = useAddToCalendar({ captureId: result.capture_id, event });
  const title = result.title.trim().length > 0 ? result.title : t('capture.result.untitled');

  // 행 순서: 0 제목 블록, 1 일정, 2 택배, 3 원문. 없는 행은 건너뛰어도 간격 규칙은 같다.
  let row = 0;
  const next = (): number => row++;

  return (
    <View style={styles.body}>
      <StaggerIn index={next()} baseDelay={RESULT_BASE_DELAY} offset={RESULT_RISE}>
        <View style={styles.resultHead}>
          <Thumb uri={draft.imageUri} />
          <View style={styles.headTextRow}>
            <Eyebrow>{t('capture.sheet.titleDone')}</Eyebrow>
            <Text variant="title" accessibilityRole="header" numberOfLines={3}>
              {title}
            </Text>
          </View>
        </View>
        {result.summary ? (
          <Text variant="body" color="textSecondary" style={styles.summary}>
            {result.summary}
          </Text>
        ) : null}
      </StaggerIn>

      <View>
        {event ? (
          <StaggerIn index={next()} baseDelay={RESULT_BASE_DELAY} offset={RESULT_RISE}>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            <ExtractedEventRow
              event={event}
              markDelay={RESULT_BASE_DELAY + motion.stagger * 2}
              showLowConfidenceHint={!calendar.added}
            />
          </StaggerIn>
        ) : null}

        {/* 택배 문자면 추적 시작 블록(ko + 설정 ON일 때만 — 컴포넌트가 스스로 가린다). */}
        <StaggerIn index={next()} baseDelay={RESULT_BASE_DELAY} offset={RESULT_RISE}>
          <ParcelCaptureBlock ocrText={ocrText} captureId={result.capture_id} />
        </StaggerIn>

        {ocrText ? (
          <StaggerIn index={next()} baseDelay={RESULT_BASE_DELAY} offset={RESULT_RISE}>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            <PressableScale
              onPress={() => setOcrOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: ocrOpen }}
              accessibilityLabel={t('capture.ocr.toggle')}
              style={styles.ocrToggle}
            >
              <Text variant="bodyStrong">{t('capture.ocr.toggle')}</Text>
              <View style={ocrOpen ? styles.chevronOpen : undefined}>
                <Icon name="chevron-right" size={16} color="textSecondary" />
              </View>
            </PressableScale>
            {ocrOpen ? (
              <Text variant="caption" color="textSecondary" selectable style={styles.ocrText}>
                {ocrText}
              </Text>
            ) : null}
          </StaggerIn>
        ) : null}
      </View>

      <View style={styles.actions}>
        {event ? (
          <>
            <Button variant="secondary" onPress={onClose} style={styles.flex}>
              {t('capture.action.done')}
            </Button>
            <Button
              loading={calendar.busy}
              onPress={() => void (calendar.added ? calendar.open() : calendar.add())}
              leftIcon={<Icon name="calendar" size={16} color="onPrimary" />}
              style={styles.flex}
            >
              {calendar.added
                ? t('capture.action.openInCalendar')
                : // 확신 낮은 일정은 "확인 후 추가"로 한 번 더 보게 한다(자동 등록은 capture-store가 막는다).
                  event.confidence === 'high'
                  ? t('capture.action.addToCalendar')
                  : t('capture.action.confirmAndAdd')}
            </Button>
          </>
        ) : (
          <Button onPress={onClose} fullWidth style={styles.flex}>
            {t('capture.action.done')}
          </Button>
        )}
      </View>
    </View>
  );
}

function NoTextNotice({ imageUri, onClose }: { imageUri: string; onClose: () => void }): ReactNode {
  return (
    <View style={styles.body}>
      <View style={styles.resultHead}>
        <Thumb uri={imageUri} />
        <View style={styles.headTextRow}>
          <Text variant="title" accessibilityRole="header">
            {t('capture.empty.title')}
          </Text>
          <Text variant="body" color="textSecondary">
            {t('capture.empty.body')}
          </Text>
        </View>
      </View>
      <Button variant="secondary" onPress={onClose} fullWidth>
        {t('capture.action.done')}
      </Button>
    </View>
  );
}

type ErrorNoticeProps = {
  message: string;
  onRetry: () => void;
  onClose: () => void;
};

function ErrorNotice({ message, onRetry, onClose }: ErrorNoticeProps): ReactNode {
  return (
    <View style={styles.body}>
      <View style={styles.headText}>
        <Text variant="title" accessibilityRole="header">
          {t('capture.sheet.titleError')}
        </Text>
        <Text variant="body" color="textSecondary" accessibilityLiveRegion="polite">
          {message}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button variant="ghost" onPress={onClose} style={styles.flex}>
          {t('capture.action.close')}
        </Button>
        <Button
          onPress={onRetry}
          leftIcon={<Icon name="refresh-cw" size={16} color="onPrimary" />}
          style={styles.flex}
        >
          {t('capture.action.retry')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  flex: {
    flex: 1,
  },
  sheet: {
    maxHeight: SHEET_MAX_HEIGHT,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  handleArea: {
    height: HANDLE_AREA + spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.pill,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  body: {
    gap: spacing.xl,
  },
  headText: {
    gap: spacing.xs,
  },
  headTextRow: {
    flex: 1,
    gap: spacing.xs,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  scan: {
    width: SCAN_WIDTH,
    alignSelf: 'center',
  },
  resultHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  thumb: {
    flex: 1,
    borderRadius: radius.sm,
  },
  summary: {
    marginTop: spacing.md,
  },
  waitRows: {
    gap: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  ocrToggle: {
    minHeight: TOGGLE_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ocrText: {
    paddingBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
