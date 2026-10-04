import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '@/design/components/Button/Button';
import { CropFrame } from '@/design/components/CropFrame/CropFrame';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { ScanReveal } from '@/design/components/ScanReveal/ScanReveal';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import { preview } from '@/dev/preview';
import { ExtractedEventRow } from '@/features/capture/ExtractedEventRow';
import type { CaptureStage } from '@/features/capture/types';
import { StaggerIn } from '@/features/home/StaggerIn';
import { t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';
import { useOnboardingStore } from '@/stores/onboarding-store';

/**
 * 고른 이미지 폭을 정할 때 가정하는 가장 홀쭉한 비율(가로/세로, 요즘 휴대전화 9:19.5).
 * 남은 높이 × 이 비율로 폭을 잡으면 어떤 스크린샷도 문구를 밀어내지 않는다.
 */
const TALLEST_RATIO = 9 / 19.5;
/** 고르기 전 빈 프레임(세로 스크린샷 자리). */
const EMPTY_FRAME_WIDTH = 120;
const EMPTY_FRAME_HEIGHT = 200;

/** 처리 단계 머리표 — 캡처 시트와 같은 문구. */
const STAGE_LABEL_KEY: Partial<Record<CaptureStage, string>> = {
  uploading: 'capture.stage.uploading',
  ocr: 'capture.stage.ocr',
  processing: 'capture.stage.processing',
};

function isProgress(stage: CaptureStage | null): boolean {
  return stage === 'uploading' || stage === 'ocr' || stage === 'processing';
}

/**
 * 온보딩 "내 스크린샷으로 해 보기"(first-aha, 원격 #2).
 *
 * 1페이지 데모가 예시 이미지라면, 여기선 사용자가 고른 실제 스크린샷 1장을 진짜 파이프라인
 * (startCapture, openSheet=false — 시트를 띄우지 않고 이 페이지 안에서 보여 준다)에 태운다.
 * 시스템 사진 선택기는 사진첩 권한 없이 동작하므로 권한 요청 전에 체험할 수 있다.
 * 고르지 않거나 실패해도 아래 [다음]으로 넘어갈 수 있다(막다른 길 없음).
 *
 * 연출: 고른 이미지에 축약 ScanReveal 1회 → 결과(제목 + 뽑힌 일정 행). 캘린더 등록은
 * 온보딩에서 하지 않는다 — 홈 "놓치면 안 돼요"에서 같은 일정을 바로 올릴 수 있다고만 알린다.
 */
export function AhaStep(): ReactNode {
  const { colors } = useTheme();
  const startCapture = useCaptureStore((s) => s.startCapture);
  const current = useCaptureStore((s) => s.current);
  const completeFirstAha = useOnboardingStore((s) => s.completeFirstAha);

  // 웹 미리보기(개발 전용) `?aha=`: 고른 뒤 상태를 바로 보여 준다. 네이티브에서는 항상 null.
  const previewDraft = preview?.ahaDraft ?? null;

  // current는 앱 전체 단일 슬롯이라 이전 캡처가 남아 있을 수 있다 — 여기서 시작한 id만 본다.
  const [draftId, setDraftId] = useState<string | null>(null);
  const [pickedUri, setPickedUri] = useState<string | null>(previewDraft?.imageUri ?? null);
  const [scanDone, setScanDone] = useState(previewDraft !== null && !isProgress(previewDraft.stage));
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const handleLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  const frameWidth = box ? Math.min(box.width, box.height * TALLEST_RATIO) : 0;

  const draft = draftId !== null && current?.id === draftId ? current : draftId === null ? previewDraft : null;
  const stage = draft?.stage ?? (pickedUri ? 'uploading' : null);

  useEffect(() => {
    if (stage === 'done') completeFirstAha();
  }, [stage, completeFirstAha]);

  const pick = useCallback(async (): Promise<void> => {
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      const uri = picked.canceled ? undefined : picked.assets[0]?.uri;
      if (!uri) return;
      setPickedUri(uri);
      setScanDone(false);
      setDraftId(null);
      const sourcePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
      const run = startCapture({ imageUri: uri, sourcePlatform, uri }, { openSheet: false });
      // startCapture는 첫 단계에서 current를 동기 세팅한다 — 그 id를 잡아 둔다.
      setDraftId(useCaptureStore.getState().current?.id ?? null);
      await run;
    } catch (error) {
      console.error('[onboarding] 체험 캡처 실패:', error);
    }
  }, [startCapture]);

  if (!pickedUri) {
    return (
      <View style={styles.body}>
        <Button
          variant="secondary"
          onPress={() => void pick()}
          leftIcon={<Icon name="images" size={20} color="primary" />}
          style={styles.selfStart}
        >
          {t('onboarding.aha.pick')}
        </Button>
        <View style={styles.scanBox} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <CropFrame width={EMPTY_FRAME_WIDTH} height={EMPTY_FRAME_HEIGHT} color="textSecondary" />
        </View>
      </View>
    );
  }

  const imageUri = draft?.imageUri ?? pickedUri;

  // 스캔은 고른 직후 1회. 결과가 먼저 와도 스캔이 끝난 뒤에 보인다(캡처 시트와 같은 규칙).
  if (!scanDone || isProgress(stage)) {
    const stageKey = (stage && STAGE_LABEL_KEY[stage]) ?? 'capture.stage.processing';
    return (
      <View style={styles.body}>
        <Eyebrow accessibilityLiveRegion="polite">{t(stageKey)}</Eyebrow>
        <View style={styles.scanBox} onLayout={handleLayout}>
          {frameWidth > 0 ? (
            <ScanReveal
              compact
              imageUri={imageUri}
              boxes={draft?.ocrBoxes}
              onDone={() => setScanDone(true)}
              style={[styles.scan, { width: frameWidth, borderColor: colors.border }]}
              accessibilityLabel={t('capture.preview.label')}
            />
          ) : null}
        </View>
      </View>
    );
  }

  if (stage === 'error' || !draft?.result) {
    const code = draft?.errorCode ?? 'generic';
    return (
      <View style={styles.body} accessibilityLiveRegion="polite">
        <Text variant="headline">
          {code === 'noText' ? t('capture.empty.title') : t(`capture.error.${code}`)}
        </Text>
        <Button
          variant="secondary"
          onPress={() => void pick()}
          leftIcon={<Icon name="images" size={20} color="primary" />}
          style={styles.selfStart}
        >
          {t('onboarding.aha.pickAgain')}
        </Button>
      </View>
    );
  }

  const result = draft.result;
  const title = result.title.trim().length > 0 ? result.title : t('capture.result.untitled');

  return (
    <View style={styles.body}>
      <StaggerIn index={0}>
        <Eyebrow accessibilityLiveRegion="polite">{t('onboarding.aha.done')}</Eyebrow>
        <Text variant="title" accessibilityRole="header" numberOfLines={2} style={styles.resultTitle}>
          {title}
        </Text>
        {result.summary ? (
          <Text variant="body" color="textSecondary" numberOfLines={2}>
            {result.summary}
          </Text>
        ) : null}
      </StaggerIn>
      {result.event ? (
        <StaggerIn index={1}>
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <ExtractedEventRow event={result.event} markDelay={0} />
          <Text variant="caption" color="textSecondary">
            {t('onboarding.aha.eventHint')}
          </Text>
        </StaggerIn>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  selfStart: {
    alignSelf: 'flex-start',
  },
  body: {
    flex: 1,
    gap: spacing.md,
  },
  scanBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scan: {
    borderRadius: radius.md,
    // 흰 스크린샷이 종이색 바탕에 녹지 않게 머리카락 선.
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  resultTitle: {
    marginTop: spacing.xs,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
});
