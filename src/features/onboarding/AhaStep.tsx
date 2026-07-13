import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

import { Button } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { motion, radius, spacing, typography } from '@/design/tokens';
import { getLocale, t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

import type { CaptureEvent, ProcessCaptureResult } from '@/features/capture/types';

// 스캔라인 투명도 — CaptureSheet 패턴 준수(design.md §2 원칙2 Invisible AI 절제).
const SCANLINE_OPACITY = 0.3;
// 스캔라인 순환 주기. motion.duration.ritual(1200)은 일요일 Hero Moment 전용이므로 사용 금지.
const SCANLINE_CYCLE_MS = motion.duration.lazy;
const PREVIEW_HEIGHT = 180;

/** 처리 단계 라벨 — CaptureSheet.PROGRESS_LABEL_KEY 패턴 재사용. */
const PROGRESS_LABEL_KEY = {
  uploading: 'capture.stage.uploading',
  ocr: 'capture.stage.ocr',
  processing: 'capture.stage.processing',
} as const;

/**
 * 온보딩 first-aha 스텝 — 이슈 #2 핵심 체험.
 *
 * 사용자의 실제 스크린샷 1장을 즉석 처리해 "아, 이게 되는구나"를 만든다.
 * 시스템 사진 선택기(PHPicker/Photo Picker)는 추가 미디어 권한 없이 동작한다.
 * startCapture(openSheet=false)로 current를 추적하되 CaptureSheet 모달은 열지 않는다.
 * 선택 취소·빈 사진첩이어도 "다음" 진행이 가능하다(막다른 길 없음).
 *
 * a11y: reduce-motion 환경에서 스캔라인 루프를 멈추고 progressbar role로 알린다.
 *       스크린리더에서 결과 블록은 summary role로 접근 가능하다(CaptureSheet 패턴 준수).
 */
export function AhaStep() {
  const { colors } = useTheme();
  const startCapture = useCaptureStore((state) => state.startCapture);
  const current = useCaptureStore((state) => state.current);
  const completeFirstAha = useOnboardingStore((state) => state.completeFirstAha);

  /**
   * 이 스텝에서 캡처를 시작했는지. current는 단일 슬롯이라 이전 세션 잔여 데이터와
   * 구분하기 위해 별도 플래그로 "우리 캡처인지"를 판단한다.
   */
  const [hasStarted, setHasStarted] = useState(false);

  // hasStarted 이후 current.stage를 읽어 단계와 결과를 판단한다.
  const stage = hasStarted ? (current?.stage ?? null) : null;
  const result = stage === 'done' ? (current?.result ?? null) : null;
  const captureError = stage === 'error' ? (current?.error ?? null) : null;
  const imageUri = hasStarted ? (current?.imageUri ?? null) : null;
  const isScanning =
    stage === 'uploading' || stage === 'ocr' || stage === 'processing';

  // done 도달 시 first-aha 완료 마킹(재실행 시 중복 강제 방지).
  useEffect(() => {
    if (stage === 'done') {
      completeFirstAha();
    }
  }, [stage, completeFirstAha]);

  const onPick = useCallback((): void => {
    void (async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const uri = picked.assets[0].uri;
      setHasStarted(true);
      // openSheet=false: current를 추적하되 CaptureSheet 모달을 열지 않는다.
      await startCapture(
        {
          imageUri: uri,
          sourcePlatform: Platform.OS === 'ios' ? 'ios' : 'android',
          uri,
        },
        { openSheet: false },
      );
    })();
  }, [startCapture]);

  // ── idle 상태 ───────────────────────────────────────────────────────────────
  if (!hasStarted) {
    return (
      <View style={styles.idleContainer}>
        <View style={[styles.idleIconBadge, { backgroundColor: colors.primaryMuted }]}>
          <Icon name="images" size={32} color="primary" />
        </View>
        <Text style={[styles.idleTitle, { color: colors.textPrimary }]}>
          {t('onboarding.aha.title')}
        </Text>
        <Text style={[styles.idleSubtitle, { color: colors.textSecondary }]}>
          {t('onboarding.aha.subtitle')}
        </Text>
        <Button
          variant="primary"
          size="lg"
          onPress={onPick}
          accessibilityLabel={t('onboarding.aha.pick')}
          leftIcon={<Icon name="images" size={16} color="onPrimary" />}
        >
          {t('onboarding.aha.pick')}
        </Button>
      </View>
    );
  }

  // ── 선택 후: 스캔라인 + 결과 ────────────────────────────────────────────────
  const progressKey = isScanning
    ? PROGRESS_LABEL_KEY[stage as 'uploading' | 'ocr' | 'processing']
    : null;

  return (
    <View style={styles.activeContainer}>
      {imageUri ? (
        <AhaPreview imageUri={imageUri} isScanning={isScanning} />
      ) : null}

      {isScanning && progressKey ? (
        <View
          style={styles.progressRow}
          accessibilityRole="progressbar"
          accessibilityLabel={t(progressKey)}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
            {t(progressKey)}
          </Text>
        </View>
      ) : null}

      {stage === 'done' && result ? (
        <AhaResult result={result} />
      ) : null}

      {stage === 'error' ? (
        <View style={styles.errorRow} accessibilityRole="alert">
          <Icon name="x" size={16} color="danger" />
          <Text style={[styles.progressLabel, { color: colors.danger }]} numberOfLines={2}>
            {captureError ?? t('capture.error.generic')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────────────────────

type AhaPreviewProps = {
  imageUri: string;
  isScanning: boolean;
};

/** 이미지 미리보기 + 스캔라인 — CaptureSheet.PreviewWithScanLine 패턴 준수. */
function AhaPreview({ imageUri, isScanning }: AhaPreviewProps) {
  const { colors } = useTheme();
  const translateY = useMemo(() => new Animated.Value(0), []);
  const [previewHeight, setPreviewHeight] = useState(PREVIEW_HEIGHT);

  useEffect(() => {
    if (!isScanning) {
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
  }, [isScanning, previewHeight, translateY]);

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
      {isScanning ? (
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

type AhaResultProps = {
  result: ProcessCaptureResult;
};

/** 처리 완료 결과 — 이벤트 감지 시 캘린더 카드, 미감지 시 카테고리 폴백. */
function AhaResult({ result }: AhaResultProps) {
  const { colors } = useTheme();
  const { event } = result;

  return (
    <View
      style={styles.resultBlock}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={t('onboarding.aha.done')}
    >
      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
        {t('onboarding.aha.done')}
      </Text>

      {event ? (
        <AhaEventCard event={event} />
      ) : (
        <Card variant="flat">
          <View style={styles.categoryRow}>
            <Icon name="folder" size={16} color="primary" />
            <Text style={[styles.categoryText, { color: colors.textPrimary }]}>
              {t('onboarding.aha.categoryResult').replace(
                '{category}',
                result.title || '기타',
              )}
            </Text>
          </View>
        </Card>
      )}
    </View>
  );
}

type AhaEventCardProps = {
  event: CaptureEvent;
};

/** 이벤트 감지 카드 — Card variant="highlight" + 캘린더 미리보기 액션(실제 등록 미연결). */
function AhaEventCard({ event }: AhaEventCardProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.eventBlock}>
      <Text style={[styles.eventPrompt, { color: colors.textSecondary }]}>
        {t('onboarding.aha.eventPrompt')}
      </Text>
      <Card variant="highlight" compact>
        <View style={styles.eventRow}>
          <Icon name="calendar" size={20} color="accent" />
          <View style={styles.eventTextCol}>
            <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
              {event.title}
            </Text>
            <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
              {formatEventWhen(event.starts_at)}
            </Text>
            {event.location ? (
              <Text style={[styles.eventMeta, { color: colors.textSecondary }]}>
                {event.location}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
      {/*
       * 캘린더 등록은 OAuth 검증 완료 후 구현 예정.
       * 미리보기 의사만 보여주고(나중에 톤), 버튼은 disabled로 표시한다.
       * CaptureSheet.ActionRow의 addToCalendar disabled 패턴 준수.
       */}
      <View style={styles.eventActions}>
        <View style={styles.eventActionItem}>
          {/* 캘린더 등록은 OAuth 검증 완료 후 구현 예정(나중에 톤). disabled 표시. */}
          <Button
            variant="accent"
            size="md"
            disabled
            onPress={() => {}}
            accessibilityLabel={t('onboarding.aha.eventConfirm')}
            leftIcon={<Icon name="calendar" size={16} color="textOnAccent" />}
          >
            {t('onboarding.aha.eventConfirm')}
          </Button>
        </View>
        <View style={styles.eventActionItem}>
          <Button
            variant="ghost"
            size="md"
            disabled
            onPress={() => {}}
            accessibilityLabel={t('onboarding.aha.eventLater')}
          >
            {t('onboarding.aha.eventLater')}
          </Button>
        </View>
      </View>
    </View>
  );
}

/** 이벤트 시작 시각 표시 — CaptureSheet.formatEventWhen 패턴 동일. */
function formatEventWhen(startsAt: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return startsAt;
  return date.toLocaleString(getLocale() === 'ko' ? 'ko-KR' : 'en-US');
}

// ── 스타일 ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  idleIconBadge: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleTitle: {
    fontSize: typography.display.size,
    lineHeight: typography.display.line,
    fontWeight: typography.display.weight,
    textAlign: 'center',
  },
  idleSubtitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  activeContainer: {
    flex: 1,
    gap: spacing.lg,
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
    opacity: SCANLINE_OPACITY,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressLabel: {
    flex: 1,
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultBlock: {
    gap: spacing.md,
  },
  resultTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryText: {
    flex: 1,
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.body.weight,
  },
  eventBlock: {
    gap: spacing.md,
  },
  eventPrompt: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.body.weight,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  eventTextCol: {
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
  eventActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  eventActionItem: {
    flex: 1,
  },
});
