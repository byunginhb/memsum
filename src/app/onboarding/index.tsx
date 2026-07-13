import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
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
import { AhaStep } from '@/features/onboarding/AhaStep';
import { OnboardingPermissionStep } from '@/features/onboarding/OnboardingPermissionStep';
import { t } from '@/i18n';
import { ensureNotificationPermission } from '@/lib/notifications';
import { requestAndroidMediaPermission } from '@/lib/permissions';
import { useOnboardingStore } from '@/stores/onboarding-store';

/** 환영 화면 DotsGrid 크기(로고 모티프, 화면 주인공). */
const HERO_DOTS_SIZE = 168;
/** 가치 시연 아이콘을 감싸는 원형 배지 지름. */
const VALUE_BADGE_SIZE = 112;

type OnboardingStep = {
  /**
   * 'welcome': DotsGrid 히어로.
   * 'value': 통합 가치 압축 슬라이드(아이콘 배지).
   * 'aha': 실제 스크린샷 즉석 처리 체험(AhaStep).
   * 'permission': 자동 정리 권한 + 기대 심기(OnboardingPermissionStep).
   */
  readonly kind: 'welcome' | 'value' | 'aha' | 'permission';
  readonly icon?: IconName;
  readonly titleKey?: string;
  readonly subtitleKey?: string;
};

/**
 * 온보딩 4스텝 재편 — 이슈 #2 "first-aha" 구조.
 * [1] 환영(DotsGrid 히어로)
 * [2] 가치 압축 1장(자동 감지·캘린더·주간요약 통합)
 * [3] ⭐ first-aha: 사용자 실제 스크린샷 즉석 처리 체험
 * [4] 권한 + 기대 심기(aha 직후 → 납득한 상태에서 권한 요청)
 *
 * value 슬라이드를 3→1장으로 축약해 "배우지 않고도 첫 세션에 가치를 체험"한다.
 * 권한 요청은 가치를 본 직후 [4]에서만 발생한다(use-auto-capture 온보딩 가드와 협력).
 */
const STEPS: readonly OnboardingStep[] = [
  {
    kind: 'welcome',
    titleKey: 'onboarding.welcome.title',
    subtitleKey: 'onboarding.welcome.subtitle',
  },
  {
    kind: 'value',
    icon: 'camera',
    titleKey: 'onboarding.value.title',
    subtitleKey: 'onboarding.value.body',
  },
  { kind: 'aha' },
  { kind: 'permission' },
] as const;

/**
 * 온보딩 메인 — 가로 스와이프 페이저(pagingEnabled ScrollView).
 *
 * 스와이프·[다음] 양쪽으로 진행하고, aha·permission 스텝은 특수 렌더.
 * permission 스텝(마지막)은 푸터 버튼이 [자동으로 정리 켜기]/[지금은 넘어가기]로 바뀐다.
 * 권한 거부해도 complete() 후 홈 진입(막다른 길 없음).
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

  const currentStep = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const isPermissionStep = currentStep?.kind === 'permission';

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

  /** 온보딩 완료 후 홈 진입. permission 스텝 "지금은 넘어가기"와 중간 건너뛰기가 공유. */
  const handleFinish = useCallback((): void => {
    void haptic('medium');
    complete();
    router.replace('/');
  }, [complete, router]);

  /**
   * permission 스텝 [자동으로 정리 켜기] 핸들러.
   * 미디어(Android) + 알림 권한을 요청한 뒤 complete() + 홈 진입.
   * 거부해도 진행(막다른 길 없음) — 거부 후 안내는 use-auto-capture가 담당.
   */
  const handlePermissionEnable = useCallback((): void => {
    void (async () => {
      void haptic('medium');
      if (Platform.OS === 'android') {
        await requestAndroidMediaPermission();
      }
      await ensureNotificationPermission();
      complete();
      router.replace('/');
    })();
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
        {STEPS.map((step, i) => (
          <Step key={step.kind + String(i)} step={step} width={width} topInset={insets.top} />
        ))}
      </ScrollView>

      {/* 건너뛰기 — 마지막(permission) 페이지에선 숨겨 권한 버튼에 집중. */}
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

        {isPermissionStep ? (
          // permission 스텝 전용 버튼 — 두 개로 교체.
          <>
            <Button
              variant="primary"
              size="lg"
              onPress={handlePermissionEnable}
              accessibilityLabel={t('onboarding.permission.enable')}
              leftIcon={<Icon name="bell" size={16} color="onPrimary" />}
            >
              {t('onboarding.permission.enable')}
            </Button>
            <Button
              variant="ghost"
              size="md"
              onPress={handleFinish}
              accessibilityLabel={t('onboarding.permission.skip')}
            >
              {t('onboarding.permission.skip')}
            </Button>
          </>
        ) : (
          // welcome / value / aha 스텝 — 다음/시작하기 버튼.
          // aha 스텝에서도 "다음"으로 항상 진행 가능(선택 취소해도 막다른 길 없음).
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
        )}
      </View>
    </View>
  );
}

type StepProps = {
  step: OnboardingStep;
  width: number;
  topInset: number;
};

/**
 * 단일 온보딩 페이지.
 * - welcome: DotsGrid 히어로 + 카피
 * - value: 아이콘 배지 + 카피
 * - aha: AhaStep(인라인 처리 체험)
 * - permission: OnboardingPermissionStep(콘텐츠) + 버튼은 부모 푸터
 */
function Step({ step, width, topInset }: StepProps) {
  const { colors } = useTheme();

  if (step.kind === 'aha') {
    return (
      <View
        style={[
          styles.page,
          styles.pageFlex,
          { width, paddingTop: topInset + spacing['4xl'] },
        ]}
      >
        <AhaStep />
      </View>
    );
  }

  if (step.kind === 'permission') {
    return (
      <View
        style={[
          styles.page,
          styles.pageFlex,
          { width, paddingTop: topInset + spacing['4xl'] },
        ]}
      >
        <OnboardingPermissionStep />
      </View>
    );
  }

  // 'welcome' | 'value' — 정적 슬라이드
  const title = t(step.titleKey ?? '');
  const subtitle = t(step.subtitleKey ?? '');

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
    <View
      style={styles.indicator}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
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
  // aha·permission 스텝은 내부 컴포넌트가 flex로 공간을 채운다.
  pageFlex: {
    justifyContent: 'flex-start',
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
    gap: spacing.md,
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
