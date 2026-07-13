/**
 * PaywallScreen — 페이월 프라이싱 화면 (비활성 스캐폴드)
 *
 * [중요] 검증 후 결제 연동 예정. 현재 라우팅 미연결, 결제 로직 없음.
 *
 * 활성화 방법:
 *   1. src/app/paywall.tsx 라우트 파일 생성 후 이 컴포넌트를 마운트한다.
 *   2. react-native-iap 설치 + npx expo prebuild --clean 후 onPressCta를 실제 구매 로직으로 교체.
 *   3. calendar-store / WeeklyReportScreen 트리거 훅에 router.push('/paywall') 연결.
 *
 * 자세한 체크리스트: docs/monetization/paywall-design.md §6 결제 구현 체크리스트
 * 트리거 정의:     docs/monetization/paywall-design.md §1 페이월 노출 트리거
 *
 * 이슈 #7: 가격·페이월 설계 (검증 후 도입 준비)
 */

import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/design/components/Button/Button';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import type { SemanticColors } from '@/design/tokens';
import {
  letterSpacingFor,
  radius,
  spacing,
  typography,
} from '@/design/tokens';
import { fontFamily } from '@/design/tokens/typography';
import { t } from '@/i18n';

// --- 플랜 메타데이터 (검증 후 실제 가격으로 확정) ---
const ANNUAL_PRICE_KRW = 5900;
const MONTHLY_PRICE_KRW = 990;
const DAILY_PRICE_KRW = Math.round(ANNUAL_PRICE_KRW / 365);

type Plan = 'annual' | 'monthly';

// --- 기능 행 데이터 ---
type FeatureItem = {
  key: string;
  icon: IconName;
};

const FREE_FEATURES: readonly FeatureItem[] = [
  { key: 'paywall.feature.capture', icon: 'check-circle' },
  { key: 'paywall.feature.calendar', icon: 'check-circle' },
  { key: 'paywall.feature.weeklyReport', icon: 'check-circle' },
];

const PREMIUM_FEATURES: readonly FeatureItem[] = [
  { key: 'paywall.feature.familyAlerts', icon: 'star' },
  { key: 'paywall.feature.advancedReport', icon: 'star' },
  { key: 'paywall.feature.multiDevice', icon: 'star' },
];

/**
 * PaywallScreen — 연간 일시납 강조 / 무료-유료 경계 명시.
 *
 * 결제 로직 없는 순수 UI 스캐폴드. CTA 버튼 onPress는 no-op.
 * 활성화 시 react-native-iap 구매 흐름으로 교체한다.
 */
export function PaywallScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // TODO(paywall-activate): react-native-iap 연동 후 실제 구매 로직으로 교체
  const handlePressCta = (_plan: Plan): void => {
    // 결제 준비 중 — 도입 시점까지 no-op
    // 활성화 시: await purchaseSubscription(plan); 호출
  };

  // TODO(paywall-activate): expo-router의 router.back() 연결
  const handleClose = (): void => {
    // 활성화 시: router.back();
  };

  // TODO(paywall-activate): SKPaymentQueue.restoreCompletedTransactions() 연결
  const handleRestore = (): void => {
    // 활성화 시: await restorePurchases();
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bgBase }]}>
      {/* 닫기 버튼 (라우팅 미연결) */}
      <View style={[styles.closeRow, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable
          onPress={handleClose}
          accessibilityLabel={t('paywall.a11y.close')}
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <Icon name="x" size={20} color="textSecondary" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing['4xl'] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 헤드라인 */}
        <View style={styles.heroSection}>
          <Text
            style={[
              styles.headline,
              {
                color: colors.textPrimary,
                fontFamily: fontFamily.sans,
                letterSpacing: letterSpacingFor('heading'),
              },
            ]}
          >
            {t('paywall.headline')}
          </Text>
          <Text
            style={[
              styles.subheadline,
              { color: colors.textSecondary, fontFamily: fontFamily.sans },
            ]}
          >
            {t('paywall.subheadline')}
          </Text>
        </View>

        {/* 플랜 카드: 연간(강조) + 월간(앵커) */}
        <View style={styles.plansSection}>
          {/* 연간 플랜 — 기본 강조 */}
          <View
            style={[
              styles.planCard,
              styles.planCardAnnual,
              {
                backgroundColor: colors.bgElevated,
                borderColor: colors.primary,
              },
            ]}
            accessible
            accessibilityLabel={t('paywall.a11y.planSelect', {
              plan: t('paywall.plan.annual.label'),
            })}
          >
            <View style={styles.planCardHeader}>
              <Text
                style={[
                  styles.planLabel,
                  { color: colors.textPrimary, fontFamily: fontFamily.sans },
                ]}
              >
                {t('paywall.plan.annual.label')}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text
                  style={[
                    styles.badgeText,
                    { color: colors.onPrimary, fontFamily: fontFamily.sans },
                  ]}
                >
                  {t('paywall.plan.annual.badge')}
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.planPrice,
                { color: colors.textPrimary, fontFamily: fontFamily.sans },
              ]}
            >
              {t('paywall.plan.annual.price', {
                price: ANNUAL_PRICE_KRW.toLocaleString(),
              })}
            </Text>
            <Text
              style={[
                styles.planAnchor,
                { color: colors.primary, fontFamily: fontFamily.sans },
              ]}
            >
              {t('paywall.plan.annual.daily', { daily: DAILY_PRICE_KRW })}
            </Text>
          </View>

          {/* 월간 플랜 — 앵커/보조 */}
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.border,
              },
            ]}
            accessible
            accessibilityLabel={t('paywall.a11y.planSelect', {
              plan: t('paywall.plan.monthly.label'),
            })}
          >
            <View style={styles.planCardHeader}>
              <Text
                style={[
                  styles.planLabel,
                  { color: colors.textSecondary, fontFamily: fontFamily.sans },
                ]}
              >
                {t('paywall.plan.monthly.label')}
              </Text>
              <Text
                style={[
                  styles.planPrice,
                  { color: colors.textSecondary, fontFamily: fontFamily.sans },
                ]}
              >
                {t('paywall.plan.monthly.price', {
                  price: MONTHLY_PRICE_KRW.toLocaleString(),
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* 무료 기능 목록 */}
        <View style={styles.featureSection}>
          <Text
            style={[
              styles.featureSectionTitle,
              { color: colors.textSecondary, fontFamily: fontFamily.sans },
            ]}
          >
            {t('paywall.section.free')}
          </Text>
          {FREE_FEATURES.map((item) => (
            <FeatureRow
              key={item.key}
              label={t(item.key)}
              icon={item.icon}
              isPremium={false}
              colors={colors}
            />
          ))}
        </View>

        {/* 프리미엄 기능 목록 */}
        <View style={styles.featureSection}>
          <Text
            style={[
              styles.featureSectionTitle,
              { color: colors.primary, fontFamily: fontFamily.sans },
            ]}
          >
            {t('paywall.section.premium')}
          </Text>
          {PREMIUM_FEATURES.map((item) => (
            <FeatureRow
              key={item.key}
              label={t(item.key)}
              icon={item.icon}
              isPremium
              colors={colors}
            />
          ))}
        </View>

        {/* CTA 버튼 (no-op) */}
        <View style={styles.ctaSection}>
          <Button
            variant="primary"
            size="lg"
            onPress={() => handlePressCta('annual')}
            accessibilityLabel={t('paywall.cta.annual')}
          >
            {t('paywall.cta.annual')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => handlePressCta('monthly')}
            accessibilityLabel={t('paywall.cta.monthly')}
          >
            {t('paywall.cta.monthly')}
          </Button>
        </View>

        {/* 푸터: 지금은 무료 + 구매 복원 */}
        <View style={styles.footer}>
          <Text
            style={[
              styles.footerText,
              { color: colors.textDisabled, fontFamily: fontFamily.sans },
            ]}
          >
            {t('paywall.footer.free')}
          </Text>
          <Pressable
            onPress={handleRestore}
            accessibilityRole="button"
            accessibilityLabel={t('paywall.footer.restore')}
          >
            <Text
              style={[
                styles.footerLink,
                { color: colors.textSecondary, fontFamily: fontFamily.sans },
              ]}
            >
              {t('paywall.footer.restore')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// --- 기능 행 서브컴포넌트 ---
type FeatureRowProps = {
  label: string;
  icon: IconName;
  isPremium: boolean;
  colors: SemanticColors;
};

function FeatureRow({ label, icon, isPremium, colors }: FeatureRowProps): ReactNode {
  return (
    <View style={styles.featureRow}>
      <Icon
        name={icon}
        size={16}
        color={isPremium ? 'accent' : 'success'}
      />
      <Text
        style={[
          styles.featureLabel,
          {
            color: isPremium ? colors.textPrimary : colors.textSecondary,
            fontFamily: fontFamily.sans,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  closeRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    gap: spacing['3xl'],
    paddingTop: spacing.xl,
  },
  heroSection: {
    gap: spacing.md,
    alignItems: 'center',
  },
  headline: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    textAlign: 'center',
  },
  subheadline: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
  },
  plansSection: {
    gap: spacing.md,
  },
  planCard: {
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  planCardAnnual: {
    borderWidth: 2,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLabel: {
    fontSize: typography.bodyMd.size,
    lineHeight: typography.bodyMd.line,
    fontWeight: typography.bodyMd.weight,
  },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: '600',
  },
  planPrice: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: '700',
  },
  planAnchor: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: '500',
  },
  featureSection: {
    gap: spacing.sm,
  },
  featureSectionTitle: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureLabel: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
  },
  ctaSection: {
    gap: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  footerText: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    textAlign: 'center',
  },
  footerLink: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    textDecorationLine: 'underline',
  },
});
