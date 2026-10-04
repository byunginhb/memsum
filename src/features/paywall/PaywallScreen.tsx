/**
 * PaywallScreen — 페이월 프라이싱 화면 (비활성 스캐폴드, 원격 #7)
 *
 * [중요] 검증 후 결제 연동 예정. 현재 라우팅 미연결, 결제 로직 없음.
 *
 * 활성화 방법:
 *   1. src/app/paywall.tsx 라우트 파일 생성 후 이 컴포넌트를 마운트한다.
 *   2. react-native-iap 설치 + npx expo prebuild --clean 후 handlePressCta를 실제 구매 로직으로 교체.
 *   3. calendar-store / WeeklyReportScreen 트리거 훅에 router.push('/paywall') 연결.
 *
 * 자세한 체크리스트: docs/monetization/paywall-design.md §6 결제 구현 체크리스트
 * 트리거 정의:     docs/monetization/paywall-design.md §1 페이월 노출 트리거
 *
 * 시각 언어는 "형광펜 & 코발트"(docs/design/redesign-2026-10.md): 카드 대신 구분선 행,
 * 선택된 플랜만 primaryMuted 바탕, 형광펜은 헤드라인 핵심 구절 한 곳.
 */

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/design/components/Button/Button';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Marked } from '@/design/components/Marked/Marked';
import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import { t } from '@/i18n';

// --- 플랜 메타데이터 (검증 후 실제 가격으로 확정) ---
const ANNUAL_PRICE_KRW = 5900;
const MONTHLY_PRICE_KRW = 990;
const DAYS_PER_YEAR = 365;
const DAILY_PRICE_KRW = Math.round(ANNUAL_PRICE_KRW / DAYS_PER_YEAR);
/** 최소 터치 영역. */
const MIN_TOUCH = 44;

type Plan = 'annual' | 'monthly';

type FeatureItem = {
  key: string;
  icon: IconName;
};

const FREE_FEATURES: readonly FeatureItem[] = [
  { key: 'paywall.feature.capture', icon: 'check' },
  { key: 'paywall.feature.calendar', icon: 'check' },
  { key: 'paywall.feature.weeklyReport', icon: 'check' },
];

const PREMIUM_FEATURES: readonly FeatureItem[] = [
  { key: 'paywall.feature.familyAlerts', icon: 'plus' },
  { key: 'paywall.feature.advancedReport', icon: 'plus' },
  { key: 'paywall.feature.multiDevice', icon: 'plus' },
];

/**
 * PaywallScreen — 연간 일시납 강조 / 무료-유료 경계 명시.
 *
 * 결제 로직 없는 순수 UI 스캐폴드. CTA·닫기·복원 onPress는 no-op.
 */
export function PaywallScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<Plan>('annual');

  // TODO(paywall-activate): react-native-iap 연동 후 실제 구매 로직으로 교체
  const handlePressCta = (_plan: Plan): void => {
    // 결제 준비 중 — 도입 시점까지 no-op. 활성화 시: await purchaseSubscription(plan);
  };

  // TODO(paywall-activate): expo-router의 router.back() 연결
  const handleClose = (): void => {
    // 활성화 시: router.back();
  };

  // TODO(paywall-activate): 구매 복원 연결
  const handleRestore = (): void => {
    // 활성화 시: await restorePurchases();
  };

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <View style={[styles.closeRow, { paddingTop: insets.top + spacing.sm }]}>
        <PressableScale
          onPress={handleClose}
          accessibilityRole="button"
          accessibilityLabel={t('paywall.a11y.close')}
          style={styles.iconButton}
        >
          <Icon name="x" size={24} color="textSecondary" />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing['4xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Marked
            text={t('paywall.headline')}
            mark={t('paywall.headlineMark')}
            accessibilityRole="header"
          />
          <Text variant="body" color="textSecondary">
            {t('paywall.subheadline')}
          </Text>
        </View>

        <View>
          <PlanRow
            selected={plan === 'annual'}
            onPress={() => setPlan('annual')}
            label={t('paywall.plan.annual.label')}
            price={t('paywall.plan.annual.price', { price: ANNUAL_PRICE_KRW.toLocaleString() })}
            note={t('paywall.plan.annual.daily', { daily: DAILY_PRICE_KRW })}
            badge={t('paywall.plan.annual.badge')}
          />
          <View style={[styles.rule, { backgroundColor: colors.border }]} />
          <PlanRow
            selected={plan === 'monthly'}
            onPress={() => setPlan('monthly')}
            label={t('paywall.plan.monthly.label')}
            price={t('paywall.plan.monthly.price', { price: MONTHLY_PRICE_KRW.toLocaleString() })}
          />
        </View>

        <FeatureList label={t('paywall.section.free')} items={FREE_FEATURES} />
        <FeatureList label={t('paywall.section.premium')} items={PREMIUM_FEATURES} />

        <View style={styles.ctaGroup}>
          <Button size="lg" fullWidth onPress={() => handlePressCta(plan)}>
            {plan === 'annual' ? t('paywall.cta.annual') : t('paywall.cta.monthly')}
          </Button>
          <Text variant="caption" color="textSecondary" style={styles.center}>
            {t('paywall.footer.free')}
          </Text>
          <Button variant="ghost" size="sm" onPress={handleRestore} style={styles.selfCenter}>
            {t('paywall.footer.restore')}
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

type PlanRowProps = {
  selected: boolean;
  onPress: () => void;
  label: string;
  price: string;
  note?: string;
  badge?: string;
};

function PlanRow({ selected, onPress, label, price, note, badge }: PlanRowProps): ReactNode {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={t('paywall.a11y.planSelect', { plan: label })}
      style={[styles.planRow, selected ? { backgroundColor: colors.primaryMuted } : null]}
    >
      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.borderStrong }]}>
        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
      </View>
      <View style={styles.flex}>
        <View style={styles.planHead}>
          <Text variant="headline">{label}</Text>
          {badge ? <Eyebrow color="primary">{badge}</Eyebrow> : null}
        </View>
        <Text variant="monoLg">{price}</Text>
        {note ? (
          <Text variant="caption" color="textSecondary">
            {note}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

function FeatureList({ label, items }: { label: string; items: readonly FeatureItem[] }): ReactNode {
  return (
    <View style={styles.features}>
      <Eyebrow accessibilityRole="header">{label}</Eyebrow>
      {items.map((item) => (
        <View key={item.key} style={styles.featureRow}>
          <Icon name={item.icon} size={16} color="primary" />
          <Text variant="body" style={styles.flex}>
            {t(item.key)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const RADIO_SIZE = 20;
const RADIO_DOT_SIZE = 10;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  closeRow: {
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
  },
  iconButton: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing['2xl'],
  },
  hero: {
    gap: spacing.sm,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    marginTop: 2,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: RADIO_DOT_SIZE,
    height: RADIO_DOT_SIZE,
    borderRadius: radius.pill,
  },
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaGroup: {
    gap: spacing.md,
  },
  center: {
    textAlign: 'center',
  },
  selfCenter: {
    alignSelf: 'center',
  },
});
