import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  scrollTo,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { Asset } from 'expo-asset';
import { useRouter } from 'expo-router';

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
import { radius, spacing } from '@/design/tokens';
import { ONBOARDING_DEMO_BOXES, ONBOARDING_DEMO_RATIO } from '@/features/onboarding/onboarding-demo';
import { t } from '@/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import { useOnboardingStore } from '@/stores/onboarding-store';

import { requestPermission } from '../../../modules/photo-library-watcher';

const PAGE_COUNT = 3;
/** 인디케이터 점: 비활성 8, 활성 24(스크롤에 따라 폭이 부드럽게 바뀐다). */
const DOT_SIZE = 8;
const DOT_ACTIVE_WIDTH = 24;
/** 비활성 점 불투명도(활성은 1). */
const DOT_IDLE_OPACITY = 0.35;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;
/** 스캔 데모 이미지 — 예약 확정 문자 스크린샷(scripts/gen-onboarding-demo.mjs가 줄 좌표와 함께 생성). */
const DEMO_URI = Asset.fromModule(require('../../../assets/images/onboarding-demo.png')).uri;
/** 리포트 미리보기 줄 수(= 5줄 리포트). */
const REPORT_LINES = ['1', '2', '3', '4', '5'] as const;
/** 자동 감지 데모 프레임(세로 스크린샷). */
const DETECT_FRAME_WIDTH = 132;
const DETECT_FRAME_HEIGHT = 220;

type PermissionResult = 'idle' | 'asking' | 'granted' | 'denied';

/**
 * 온보딩 3페이지 — 1) 스캔 데모 2) 자동 감지 + 권한 3) 일요일 5줄 리포트 미리보기.
 *
 * 가로 페이징 스크롤의 위치(scrollX)를 UI 스레드에서 받아 인디케이터 폭을 연속으로 바꾼다.
 * 권한은 2페이지 버튼으로만 묻고, 거부해도 다음으로 갈 수 있다(나중에 설정에서 켠다).
 * 연출은 1페이지 스캔 한 곳. 페이지 전환 햅틱은 쓰지 않는다(명세 §5 햅틱 2곳 제한).
 */
export default function OnboardingScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const complete = useOnboardingStore((s) => s.complete);

  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);
  // 1페이지로 돌아오면 스캔 데모를 다시 보여 준다.
  const [scanRun, setScanRun] = useState(0);

  const pageRef = useRef(0);
  const handlePageChange = useCallback((next: number): void => {
    if (next === pageRef.current) return;
    if (next === 0) setScanRun((n) => n + 1);
    pageRef.current = next;
    setPage(next);
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
    onMomentumEnd: (e) => {
      if (width > 0) scheduleOnRN(handlePageChange, Math.round(e.contentOffset.x / width));
    },
  });

  const isLast = page === PAGE_COUNT - 1;

  const goTo = useCallback(
    (target: number): void => {
      scheduleOnUI(() => {
        'worklet';
        // 모션 줄이기면 미끄러지지 않고 바로 넘어간다.
        scrollTo(scrollRef, target * width, 0, !reducedMotion);
      });
      handlePageChange(target);
    },
    [scrollRef, width, reducedMotion, handlePageChange],
  );

  const finish = useCallback((): void => {
    complete();
    // replace로 온보딩을 스택에서 지운다 — 홈에서 뒤로가기로 돌아오지 않는다.
    router.replace('/');
  }, [complete, router]);

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.flex}
      >
        <Page width={width} topInset={insets.top}>
          <ScanDemo run={scanRun} />
          <Copy index={0} titleKey="onboarding.scan.title" bodyKey="onboarding.scan.body" />
        </Page>

        <Page width={width} topInset={insets.top}>
          <View style={[styles.visual, styles.center]}>
            <DetectDemo />
          </View>
          <Copy index={1} titleKey="onboarding.detect.title" bodyKey="onboarding.detect.body" />
          <PermissionAsk />
        </Page>

        <Page width={width} topInset={insets.top}>
          <View style={styles.visual}>
            <ReportPreview />
          </View>
          <Copy index={2} titleKey="onboarding.report.title" bodyKey="onboarding.report.body" />
        </Page>
      </Animated.ScrollView>

      {!isLast ? (
        <PressableScale
          onPress={finish}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
          hitSlop={spacing.sm}
          containerStyle={[styles.skip, { top: insets.top + spacing.sm }]}
          style={styles.skipInner}
        >
          <Text variant="bodyStrong" color="textSecondary">
            {t('onboarding.skip')}
          </Text>
        </PressableScale>
      ) : null}

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <PageIndicator scrollX={scrollX} width={width} />
        <Button
          size="lg"
          onPress={isLast ? finish : () => goTo(page + 1)}
          rightIcon={isLast ? undefined : <Icon name="chevron-right" size={20} color="onPrimary" />}
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </Button>
      </View>
    </View>
  );
}

/**
 * 1페이지 스캔 데모. 남은 세로 공간에 맞춰(넘치지 않게) 이미지 폭을 정한다 —
 * 폭 100% + 비율만 주면 작은 화면에서 이미지가 문구를 밀어낸다.
 */
function ScanDemo({ run }: { run: number }): ReactNode {
  const { colors } = useTheme();
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const handleLayout = (e: LayoutChangeEvent): void => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ width, height });
  };
  const frameWidth = box ? Math.min(box.width, box.height * ONBOARDING_DEMO_RATIO) : 0;
  return (
    <View style={[styles.visual, styles.center]} onLayout={handleLayout}>
      {frameWidth > 0 ? (
        <ScanReveal
          key={run}
          compact
          imageUri={DEMO_URI}
          boxes={ONBOARDING_DEMO_BOXES}
          aspectRatio={ONBOARDING_DEMO_RATIO}
          style={[styles.demoFrame, { width: frameWidth, borderColor: colors.border }]}
          accessibilityLabel={t('onboarding.scan.demoLabel')}
        />
      ) : null}
    </View>
  );
}

type PageProps = {
  width: number;
  topInset: number;
  children: ReactNode;
};

function Page({ width, topInset, children }: PageProps): ReactNode {
  return (
    <View style={[styles.page, { width, paddingTop: topInset + spacing['5xl'] }]}>{children}</View>
  );
}

type CopyProps = {
  index: number;
  titleKey: string;
  bodyKey: string;
};

function Copy({ index, titleKey, bodyKey }: CopyProps): ReactNode {
  return (
    <View style={styles.copy}>
      <Eyebrow>{t('onboarding.step', { current: index + 1, total: PAGE_COUNT })}</Eyebrow>
      <Text variant="display" accessibilityRole="header">
        {t(titleKey)}
      </Text>
      <Text variant="body" color="textSecondary">
        {t(bodyKey)}
      </Text>
    </View>
  );
}

/** 자동 감지 데모 — 빈 스크린샷 프레임 + 탭바와 같은 `● 감지 중` 표시. 정적(연출은 1페이지만). */
function DetectDemo(): ReactNode {
  const { colors } = useTheme();
  return (
    <View style={styles.detect} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <CropFrame width={DETECT_FRAME_WIDTH} height={DETECT_FRAME_HEIGHT} color="textPrimary">
        <View style={[styles.detectInner, { backgroundColor: colors.bgMuted }]}>
          {[0.7, 0.9, 0.5].map((w, i) => (
            <View
              key={i}
              style={[styles.detectLine, { width: `${w * 100}%`, backgroundColor: colors.borderStrong }]}
            />
          ))}
        </View>
      </CropFrame>
      <View style={styles.detectBadge}>
        <View style={[styles.detectDot, { backgroundColor: colors.primary }]} />
        <Text variant="mono" color="textSecondary">
          {t('home.tab.detecting')}
        </Text>
      </View>
    </View>
  );
}

/** 2페이지 권한 버튼 — 사진(자동 감지)과 알림(일정·택배·리포트)을 차례로 묻는다. */
function PermissionAsk(): ReactNode {
  const [result, setResult] = useState<PermissionResult>('idle');

  const ask = useCallback(async (): Promise<void> => {
    setResult('asking');
    try {
      const photo = await requestPermission();
      // 알림은 사진 권한과 별개 — 거부돼도 자동 감지 자체는 동작한다.
      await ensureNotificationPermission();
      setResult(photo === 'granted' || photo === 'limited' ? 'granted' : 'denied');
    } catch (error) {
      console.error('[onboarding] 권한 요청 실패:', error);
      setResult('denied');
    }
  }, []);

  if (result === 'granted' || result === 'denied') {
    const granted = result === 'granted';
    return (
      <View style={styles.permissionResult} accessibilityLiveRegion="polite">
        <Icon name={granted ? 'check-circle' : 'alert-circle'} size={20} color={granted ? 'success' : 'textSecondary'} />
        <Text variant="bodyStrong" color={granted ? 'success' : 'textSecondary'} style={styles.flex}>
          {granted ? t('onboarding.detect.granted') : t('onboarding.detect.denied')}
        </Text>
      </View>
    );
  }

  return (
    <Button
      variant="secondary"
      loading={result === 'asking'}
      onPress={() => void ask()}
      style={styles.permissionButton}
    >
      {t('onboarding.detect.allow')}
    </Button>
  );
}

/** 3페이지 — 일요일 5줄 리포트 미리보기. 1위 줄만 형광펜(정적). */
function ReportPreview(): ReactNode {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.report, { borderColor: colors.border, backgroundColor: colors.bgSurface }]}
      accessible
      accessibilityLabel={t('onboarding.report.previewLabel')}
    >
      <Eyebrow>{t('onboarding.report.previewEyebrow')}</Eyebrow>
      {REPORT_LINES.map((n, i) => (
        <View
          key={n}
          style={[
            styles.reportRow,
            i < REPORT_LINES.length - 1 ? { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth } : null,
          ]}
        >
          <Text variant="monoLg" color="textSecondary" style={styles.reportNo}>
            {`0${n}`}
          </Text>
          <View style={styles.flex}>
            <Text
              variant={i === 0 ? 'bodyStrong' : 'body'}
              color={i === 0 ? 'onMarker' : 'textPrimary'}
              numberOfLines={1}
              style={i === 0 ? [styles.reportTop, { backgroundColor: colors.marker }] : undefined}
            >
              {t(`onboarding.report.line${n}`)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function PageIndicator({ scrollX, width }: { scrollX: SharedValue<number>; width: number }): ReactNode {
  return (
    <View style={styles.indicator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: PAGE_COUNT }, (_, i) => (
        <Dot key={i} index={i} scrollX={scrollX} width={width} />
      ))}
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }): ReactNode {
  const { colors } = useTheme();
  const range = useMemo(
    () => [(index - 1) * width, index * width, (index + 1) * width],
    [index, width],
  );
  const style = useAnimatedStyle(() => {
    const p = width > 0 ? interpolate(scrollX.value, range, [0, 1, 0], 'clamp') : index === 0 ? 1 : 0;
    return {
      width: DOT_SIZE + (DOT_ACTIVE_WIDTH - DOT_SIZE) * p,
      opacity: DOT_IDLE_OPACITY + (1 - DOT_IDLE_OPACITY) * p,
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: colors.textPrimary }, style]} />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    gap: spacing['2xl'],
  },
  visual: {
    flex: 1,
    justifyContent: 'center',
  },
  copy: {
    gap: spacing.sm,
  },
  skip: {
    position: 'absolute',
    right: spacing.md,
  },
  skipInner: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: radius.pill,
  },
  detect: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  detectInner: {
    flex: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  detectLine: {
    height: spacing.sm,
    borderRadius: radius.sm / 2,
  },
  detectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detectDot: {
    width: DOT_SIZE - 2,
    height: DOT_SIZE - 2,
    borderRadius: radius.pill,
  },
  demoFrame: {
    // 흰 스크린샷이 종이색 바탕에 녹아 사라지지 않게 머리카락 선을 두른다.
    borderWidth: StyleSheet.hairlineWidth,
  },
  permissionButton: {
    alignSelf: 'flex-start',
  },
  permissionResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
  },
  report: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  reportNo: {
    width: spacing['2xl'],
  },
  reportTop: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm / 2,
  },
});
