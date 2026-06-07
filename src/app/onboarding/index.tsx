import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type {
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Button } from '@/design/components';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { haptic } from '@/design/theme/platform';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';
import { useOnboardingStore } from '@/stores/onboarding-store';

/** 환영 화면 DotsGrid 크기(로고 모티프, 화면 주인공). */
const HERO_DOTS_SIZE = 168;
/** 가치 시연 아이콘을 감싸는 원형 배지 지름. */
const VALUE_BADGE_SIZE = 112;

type OnboardingStep = {
  /** 환영 화면만 DotsGrid 히어로를 쓴다. 나머지는 lucide 아이콘. */
  readonly kind: 'welcome' | 'value';
  readonly icon?: IconName;
  readonly titleKey: string;
  readonly subtitleKey: string;
};

/**
 * 온보딩 4스텝 — 기능명세 §1.1(Screen01~02), 브랜드 톤.
 * 1) 환영(DotsGrid 히어로) 2~4) 자동 감지 / 캘린더 / 일요일 5줄 리포트.
 * 로그인·실제 권한 요청은 다음 단계라 가치 전달에만 집중한다.
 */
const STEPS: readonly OnboardingStep[] = [
  {
    kind: 'welcome',
    titleKey: 'onboarding.welcome.title',
    subtitleKey: 'onboarding.welcome.subtitle',
  },
  {
    kind: 'value',
    icon: 'images',
    titleKey: 'onboarding.value1.title',
    subtitleKey: 'onboarding.value1.body',
  },
  {
    kind: 'value',
    icon: 'calendar',
    titleKey: 'onboarding.value2.title',
    subtitleKey: 'onboarding.value2.body',
  },
  {
    kind: 'value',
    icon: 'file-text',
    titleKey: 'onboarding.value3.title',
    subtitleKey: 'onboarding.value3.body',
  },
] as const;

/**
 * 온보딩 메인 — 가로 스와이프 페이저(pagingEnabled ScrollView).
 *
 * 스와이프·[다음] 양쪽으로 진행하고, 마지막에서만 [시작하기]가 뜬다.
 * 페이지 전환·완료에 햅틱을 준다. 완료 시 onboarding-store.complete() 후
 * router.replace('/')로 게이트를 통과시킨다(뒤로가기로 다시 안 옴).
 */
export default function OnboardingScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const complete = useOnboardingStore((state) => state.complete);

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  // 햅틱 중복 발화 방지를 위해 마지막으로 본 페이지를 기억한다.
  const lastPage = useRef(0);

  const isLast = index === STEPS.length - 1;

  const goToPage = useCallback(
    (page: number): void => {
      scrollRef.current?.scrollTo({ x: page * width, animated: true });
    },
    [width],
  );

  const handleMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      const page = Math.round(event.nativeEvent.contentOffset.x / width);
      if (page !== lastPage.current) {
        lastPage.current = page;
        void haptic('light');
      }
      setIndex(page);
    },
    [width],
  );

  const handleNext = useCallback((): void => {
    if (isLast) return;
    goToPage(index + 1);
  }, [goToPage, index, isLast]);

  const handleFinish = useCallback((): void => {
    void haptic('medium');
    complete();
    // replace로 온보딩을 스택에서 제거 — 홈에서 뒤로가기로 돌아오지 않는다.
    router.replace('/');
  }, [complete, router]);

  const skipPaddingStyle = useMemo(
    () => ({ paddingTop: insets.top + spacing.sm }),
    [insets.top],
  );

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        scrollEventThrottle={16}
        style={styles.flex}
      >
        {STEPS.map((step) => (
          <Step key={step.titleKey} step={step} width={width} topInset={insets.top} />
        ))}
      </ScrollView>

      {/* 건너뛰기 — 마지막 페이지에선 숨겨 [시작하기]에 집중. */}
      <View style={[styles.skip, skipPaddingStyle]} pointerEvents="box-none">
        {!isLast ? (
          <Button
            variant="ghost"
            size="sm"
            onPress={handleFinish}
            accessibilityLabel={t('onboarding.skip')}
          >
            {t('onboarding.skip')}
          </Button>
        ) : null}
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <PageIndicator count={STEPS.length} active={index} />
        <Button
          variant="primary"
          size="lg"
          onPress={isLast ? handleFinish : handleNext}
          accessibilityLabel={isLast ? t('onboarding.start') : t('onboarding.next')}
          rightIcon={
            isLast ? undefined : <Icon name="chevron-right" size={20} color="onPrimary" />
          }
        >
          {isLast ? t('onboarding.start') : t('onboarding.next')}
        </Button>
      </View>
    </View>
  );
}

type StepProps = {
  step: OnboardingStep;
  width: number;
  topInset: number;
};

/** 단일 온보딩 페이지. 환영은 DotsGrid 히어로, 가치 시연은 아이콘 배지. */
function Step({ step, width, topInset }: StepProps) {
  const { colors } = useTheme();
  const title = t(step.titleKey);
  const subtitle = t(step.subtitleKey);

  return (
    <View
      style={[styles.page, { width, paddingTop: topInset + spacing['6xl'] }]}
      accessible
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View style={styles.hero}>
        {step.kind === 'welcome' ? (
          <DotsGrid size={HERO_DOTS_SIZE} animated />
        ) : (
          <View
            style={[
              styles.valueBadge,
              { backgroundColor: colors.primaryMuted },
            ]}
          >
            <Icon name={step.icon ?? 'camera'} size={32} color="primary" />
          </View>
        )}
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

type PageIndicatorProps = {
  count: number;
  active: number;
};

/** 점 N개 인디케이터 — 현재 페이지만 코랄 액센트로 강조(브랜드 "발견" 점). */
function PageIndicator({ count, active }: PageIndicatorProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.indicator} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              {
                width: isActive ? spacing.xl : spacing.sm,
                backgroundColor: isActive ? colors.accent : colors.borderStrong,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBadge: {
    width: VALUE_BADGE_SIZE,
    height: VALUE_BADGE_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
  },
  title: {
    fontSize: typography.display.size,
    lineHeight: typography.display.line,
    fontWeight: typography.display.weight,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  skip: {
    position: 'absolute',
    top: 0,
    right: spacing.lg,
    alignItems: 'flex-end',
  },
  footer: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.lg,
    gap: spacing.xl,
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: spacing.sm,
    borderRadius: radius.full,
  },
});
