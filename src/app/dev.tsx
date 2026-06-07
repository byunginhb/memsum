import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';

import { Button } from '@/design/components/Button/Button';
import type { ButtonSize, ButtonVariant } from '@/design/components/Button/Button';
import { Card } from '@/design/components/Card/Card';
import { Icon } from '@/design/icons/Icon';
import { haptic } from '@/design/theme/platform';
import { useThemeStore } from '@/design/theme/theme-store';
import type { ThemeMode } from '@/design/theme/theme-store';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import type { SemanticColorName } from '@/design/tokens';
import { CaptureSheet } from '@/features/capture/CaptureSheet';
import { useImageOcr } from '@/hooks/use-image-ocr';
import type { ImageOcrState } from '@/hooks/use-image-ocr';
import { useScreenshotOcr } from '@/hooks/use-screenshot-ocr';
import type { OcrItem, OcrStatus } from '@/hooks/use-screenshot-ocr';
import { useScreenshotWatcher } from '@/hooks/use-screenshot-watcher';
import type { ScreenshotEvent } from '@/hooks/use-screenshot-watcher';
import { t } from '@/i18n';
import { useCaptureStore } from '@/stores/capture-store';

// 샘플 스크린샷(시뮬레이션용). use-image-ocr와 동일 에셋을 캡처 흐름에도 재사용.
const SAMPLE_KO = require('@/assets/ocr-test/sample-ko.png');

// 캡처 OCR source 추출용 raw 페이로드(iOS assetId / Android uri).
type ScreenshotRaw = {
  assetId?: string;
  uri?: string;
};

const BUTTON_VARIANTS: ButtonVariant[] = [
  'primary',
  'secondary',
  'ghost',
  'destructive',
  'accent',
];

const BUTTON_SIZES: ButtonSize[] = ['sm', 'md', 'lg'];

const THEME_MODES: ThemeMode[] = ['system', 'light', 'dark'];

const THEME_LABEL_KEY: Record<ThemeMode, string> = {
  system: 'demo.theme.system',
  light: 'demo.theme.light',
  dark: 'demo.theme.dark',
};

/**
 * 디자인 시스템 데모 화면 — 디자인시스템.md §3, §10
 * Button/Card 쇼케이스 + 테마 토글 + 스크린샷 로그 패널.
 */
export default function DemoScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { items } = useScreenshotOcr();
  const { state: sampleOcr, run: runSampleOcr } = useImageOcr();
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const { onSimulate, isSimulating } = useCaptureFlow();

  const contentStyle = useMemo(
    () => ({
      paddingTop: insets.top + spacing.lg,
      paddingBottom: insets.bottom + spacing['4xl'],
      paddingHorizontal: spacing.xl,
      gap: spacing['3xl'],
    }),
    [insets.top, insets.bottom],
  );

  const handleSelectMode = async (next: ThemeMode): Promise<void> => {
    await haptic('light');
    setMode(next);
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <ScrollView contentContainerStyle={contentStyle}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t('demo.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('demo.subtitle')}
          </Text>
        </View>

        <CaptureSection onSimulate={onSimulate} isSimulating={isSimulating} />
        <ThemeSection mode={mode} onSelect={handleSelectMode} />
        <ButtonsSection />
        <CardsSection />
        <OcrSection items={items} sampleOcr={sampleOcr} onRunSample={runSampleOcr} />
      </ScrollView>
      <CaptureSheet />
    </View>
  );
}

/**
 * 캡처 흐름 통합 훅.
 * - 스크린샷 워처의 새 이벤트마다 startCapture를 자동 호출(처리 id 집합으로 무한 루프 방지).
 * - 샘플 시뮬레이션: 번들 sample-ko.png를 localUri로 확보 후 startCapture.
 */
function useCaptureFlow(): { onSimulate: () => void; isSimulating: boolean } {
  const { events } = useScreenshotWatcher();
  const startCapture = useCaptureStore((state) => state.startCapture);
  const [isSimulating, setIsSimulating] = useState(false);
  // 이미 캡처 흐름을 시작한 스크린샷 id. 재렌더 시 중복 트리거를 막는다.
  const triggeredIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pending = events.filter(
      (event) => event.id.length > 0 && !triggeredIds.current.has(event.id),
    );
    if (pending.length === 0) return;

    for (const event of pending) {
      triggeredIds.current.add(event.id);
      void startCapture(toStartCaptureInput(event));
    }
  }, [events, startCapture]);

  const onSimulate = useCallback(() => {
    setIsSimulating(true);
    void (async () => {
      try {
        const asset = Asset.fromModule(SAMPLE_KO);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error('샘플 이미지 경로를 확인할 수 없습니다.');
        }
        // 시뮬레이터에서 현재 OS를 sourcePlatform으로 사용. OCR/업로드 모두 uri 경로.
        const sourcePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
        await startCapture({ imageUri: uri, sourcePlatform, uri });
      } catch (error) {
        console.error('[capture] 샘플 시뮬레이션 실패:', error);
      } finally {
        setIsSimulating(false);
      }
    })();
  }, [startCapture]);

  return { onSimulate, isSimulating };
}

/** 스크린샷 이벤트 → startCapture 입력. iOS는 assetId, Android는 uri를 OCR source로. */
function toStartCaptureInput(event: ScreenshotEvent): {
  imageUri: string;
  sourcePlatform: 'ios' | 'android';
  assetId?: string;
  uri?: string;
} {
  const raw = (event.raw ?? {}) as ScreenshotRaw;
  if (event.platform === 'ios') {
    // iOS는 미리보기 uri 확보가 어려우면 assetId만 사용(미리보기는 placeholder 허용).
    return {
      imageUri: raw.uri ?? '',
      sourcePlatform: 'ios',
      assetId: raw.assetId,
      uri: raw.uri,
    };
  }
  return {
    imageUri: raw.uri ?? '',
    sourcePlatform: 'android',
    uri: raw.uri,
  };
}

type CaptureSectionProps = {
  onSimulate: () => void;
  isSimulating: boolean;
};

function CaptureSection({ onSimulate, isSimulating }: CaptureSectionProps) {
  const { colors } = useTheme();
  return (
    <Section titleKey="demo.section.capture">
      <Button
        variant="primary"
        size="lg"
        loading={isSimulating}
        onPress={onSimulate}
        accessibilityLabel={t('demo.capture.simulate')}
        leftIcon={<Icon name="camera" size={20} color="onPrimary" />}
      >
        {t('demo.capture.simulate')}
      </Button>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        {t('demo.capture.hint')}
      </Text>
    </Section>
  );
}

type ThemeSectionProps = {
  mode: ThemeMode;
  onSelect: (mode: ThemeMode) => void;
};

function ThemeSection({ mode, onSelect }: ThemeSectionProps) {
  const { colors } = useTheme();
  return (
    <Section titleKey="demo.section.theme">
      <View style={styles.row}>
        {THEME_MODES.map((m) => (
          <View key={m} style={styles.flexItem}>
            <Button
              variant={mode === m ? 'primary' : 'secondary'}
              size="md"
              onPress={() => onSelect(m)}
              accessibilityLabel={t(THEME_LABEL_KEY[m])}
            >
              {t(THEME_LABEL_KEY[m])}
            </Button>
          </View>
        ))}
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>{mode}</Text>
    </Section>
  );
}

function ButtonsSection() {
  return (
    <Section titleKey="demo.section.buttons">
      {BUTTON_VARIANTS.map((variant) => (
        <View key={variant} style={styles.buttonRow}>
          {BUTTON_SIZES.map((size) => (
            <View key={size} style={styles.flexItem}>
              <Button
                variant={variant}
                size={size}
                onPress={() => undefined}
                accessibilityLabel={`${variant} ${size}`}
                leftIcon={<Icon name="camera" size={16} color="onPrimary" />}
              >
                {variant}
              </Button>
            </View>
          ))}
        </View>
      ))}
      <View style={styles.buttonRow}>
        <View style={styles.flexItem}>
          <Button variant="primary" size="md" loading onPress={() => undefined}>
            {t('button.capture')}
          </Button>
        </View>
        <View style={styles.flexItem}>
          <Button variant="primary" size="md" disabled onPress={() => undefined}>
            {t('button.capture')}
          </Button>
        </View>
      </View>
    </Section>
  );
}

function CardsSection() {
  const { colors } = useTheme();
  return (
    <Section titleKey="demo.section.cards">
      <Card variant="flat">
        <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>flat</Text>
      </Card>
      <Card variant="elevated">
        <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>elevated</Text>
      </Card>
      <Card variant="outlined">
        <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>outlined</Text>
      </Card>
      <Card variant="highlight">
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
          {t('demo.card.sample.title')}
        </Text>
        <Text style={[styles.cardBody, { color: colors.textSecondary }]}>
          {t('demo.card.sample.body')}
        </Text>
      </Card>
    </Section>
  );
}

// OCR 인식 텍스트 표시 최대 줄 수(긴 결과 잘림 처리).
const OCR_TEXT_MAX_LINES = 8;

const OCR_STATUS_LABEL_KEY: Record<OcrStatus, string> = {
  pending: 'demo.ocr.pending',
  done: 'demo.ocr.done',
  error: 'demo.ocr.error',
};

// status별 의미 색 토큰 매핑(하드코딩 금지).
const OCR_STATUS_COLOR: Record<OcrStatus, SemanticColorName> = {
  pending: 'textSecondary',
  done: 'primary',
  error: 'danger',
};

type OcrSectionProps = {
  items: OcrItem[];
  sampleOcr: ImageOcrState;
  onRunSample: () => void;
};

function OcrSection({ items, sampleOcr, onRunSample }: OcrSectionProps) {
  const { colors } = useTheme();
  const isSampleLoading = sampleOcr.status === 'pending';
  const isEmpty = items.length === 0 && sampleOcr.status === 'idle';

  return (
    <Section titleKey="demo.section.ocr">
      <Button
        variant="accent"
        size="md"
        loading={isSampleLoading}
        onPress={onRunSample}
        accessibilityLabel={t('demo.ocr.test')}
        leftIcon={<Icon name="images" size={16} color="textOnAccent" />}
      >
        {t('demo.ocr.test')}
      </Button>

      {sampleOcr.status !== 'idle' ? (
        <SampleOcrCard state={sampleOcr} />
      ) : null}

      {isEmpty ? (
        <Card variant="outlined">
          <View style={styles.emptyState}>
            <Icon name="images" size={32} color="textSecondary" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('demo.ocr.empty')}
            </Text>
          </View>
        </Card>
      ) : (
        items.map((item) => <OcrItemCard key={item.id} item={item} />)
      )}
    </Section>
  );
}

type StatusBadgeProps = {
  status: OcrStatus;
};

function StatusBadge({ status }: StatusBadgeProps) {
  const { colors } = useTheme();
  const color = colors[OCR_STATUS_COLOR[status]];
  return (
    <View
      style={[styles.badge, { borderColor: color }]}
      accessibilityLabel={t(OCR_STATUS_LABEL_KEY[status])}
    >
      <Text style={[styles.badgeText, { color }]}>{t(OCR_STATUS_LABEL_KEY[status])}</Text>
    </View>
  );
}

type OcrItemCardProps = {
  item: OcrItem;
};

function OcrItemCard({ item }: OcrItemCardProps) {
  const { colors } = useTheme();
  const hasText = item.status === 'done' && !!item.text && item.text.trim().length > 0;
  const bodyText =
    item.status === 'error'
      ? item.error
      : hasText
        ? item.text
        : item.status === 'done'
          ? t('demo.ocr.noText')
          : undefined;

  return (
    <Card variant="flat" compact>
      <View style={styles.logRow}>
        <Icon name="camera" size={20} color="primary" />
        <View style={styles.logText}>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{item.platform}</Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            {new Date(item.createdAt * 1000).toLocaleString()}
          </Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      {bodyText ? (
        <Text
          style={[styles.ocrText, { color: colors.textSecondary }]}
          numberOfLines={OCR_TEXT_MAX_LINES}
        >
          {bodyText}
        </Text>
      ) : null}
    </Card>
  );
}

type SampleOcrCardProps = {
  state: ImageOcrState;
};

function SampleOcrCard({ state }: SampleOcrCardProps) {
  const { colors } = useTheme();
  const status: OcrStatus = state.status === 'idle' ? 'pending' : state.status;
  const hasText = state.status === 'done' && !!state.text && state.text.trim().length > 0;
  const bodyText =
    state.status === 'error'
      ? state.error
      : hasText
        ? state.text
        : state.status === 'done'
          ? t('demo.ocr.noText')
          : undefined;

  return (
    <Card variant="highlight" compact>
      <View style={styles.logRow}>
        <Icon name="file-text" size={20} color="accent" />
        <View style={styles.logText}>
          <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>
            {t('demo.ocr.testTitle')}
          </Text>
        </View>
        <StatusBadge status={status} />
      </View>
      {bodyText ? (
        <Text
          style={[styles.ocrText, { color: colors.textSecondary }]}
          numberOfLines={OCR_TEXT_MAX_LINES}
        >
          {bodyText}
        </Text>
      ) : null}
    </Card>
  );
}

type SectionProps = {
  titleKey: string;
  children: React.ReactNode;
};

function Section({ titleKey, children }: SectionProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{t(titleKey)}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: typography.display.size,
    lineHeight: typography.display.line,
    fontWeight: typography.display.weight,
  },
  subtitle: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  sectionBody: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
  caption: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
  },
  cardLabel: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  cardTitle: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  cardBody: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing['2xl'],
  },
  emptyText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    textAlign: 'center',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  logText: {
    flex: 1,
    gap: spacing.xs,
  },
  badge: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.bodyMd.weight,
  },
  ocrText: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
    marginTop: spacing.md,
  },
});
