import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';

const ICON_BADGE_SIZE = 112;

/**
 * 온보딩 권한 스텝 — 콘텐츠 전용(버튼은 부모 OnboardingScreen 푸터가 담당).
 *
 * first-aha 체험(AhaStep) 직후에 위치해 "가치를 본 다음 권한 요청"을 실현한다.
 * 권한 요청 로직은 OnboardingScreen.handlePermissionEnable에 있으며, 이 컴포넌트는
 * 순수하게 기대 심기 카피와 아이콘만 렌더한다.
 *
 * a11y: 전체 View에 accessibilityLabel로 제목+부제를 합산해 스크린리더가 한 번에 읽는다.
 */
export function OnboardingPermissionStep() {
  const { colors } = useTheme();

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`${t('onboarding.permission.title')}. ${t('onboarding.permission.subtitle')}`}
    >
      <View style={styles.hero}>
        <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
          <Icon name="bell" size={32} color="primary" />
        </View>
      </View>

      <View style={styles.copy}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {t('onboarding.permission.title')}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('onboarding.permission.subtitle')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: ICON_BADGE_SIZE,
    height: ICON_BADGE_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing['2xl'],
    paddingHorizontal: spacing.lg,
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
  },
});
