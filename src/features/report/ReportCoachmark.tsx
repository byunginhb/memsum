import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { DotsGrid } from '@/design/illustrations/DotsGrid';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, radius, spacing, typography } from '@/design/tokens';
import { t } from '@/i18n';

// 코치마크 일러스트(9점 도트 로고) 크기. 빈 상태(96)보다 약간 작게.
const ILLUSTRATION_SIZE = 88;

// 카드 최대 폭 — 큰 화면에서 과하게 넓어지지 않게 제한.
const CARD_MAX_WIDTH = 360;

type ReportCoachmarkProps = {
  /** 노출 여부. 보통 hydrated && !seen && items≥1 일 때 true. */
  visible: boolean;
  /** 닫기(영속 플래그 켜기). 백드롭 탭·버튼 모두 이 핸들러를 호출한다. */
  onDismiss: () => void;
};

/**
 * 주간 리포트 첫 진입 1회 코치마크 — 첫 사용자에게 "되살림" 가치를 각인하는 브랜드 모먼트.
 *
 * items가 있는 리포트를 처음 볼 때 1회만 뜨고, 닫으면 영속 플래그(onboarding-store)로
 * 다시 노출되지 않는다. 접근성: Modal이 포커스를 잡고, 백드롭·버튼 모두 닫기 가능하며,
 * fade 전환으로 과한 모션을 피한다(reduce-motion 사용자 배려). 색은 토큰만 사용.
 */
export function ReportCoachmark({ visible, onDismiss }: ReportCoachmarkProps): ReactNode {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        {/* 백드롭 탭 → 닫기. 카드는 백드롭 위에 별도로 얹어 카드 탭은 닫기로 전파되지 않는다. */}
        <Pressable
          style={[styles.backdrop, { backgroundColor: colors.scrim }]}
          accessibilityRole="button"
          accessibilityLabel={t('report.coachmark.dismiss')}
          onPress={onDismiss}
        />

        <View style={[styles.card, { backgroundColor: colors.bgElevated }]}>
          <View style={styles.illustration}>
            <DotsGrid size={ILLUSTRATION_SIZE} animated />
          </View>

          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            accessibilityRole="header"
          >
            {t('report.coachmark.title')}
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            {t('report.coachmark.body')}
          </Text>

          <View style={styles.action}>
            <Button
              variant="primary"
              size="md"
              onPress={onDismiss}
              accessibilityLabel={t('report.coachmark.dismiss')}
            >
              {t('report.coachmark.dismiss')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  backdrop: {
    // 카드 뒤 전체를 덮는 딤 레이어. 탭하면 닫힌다.
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: '100%',
    maxWidth: CARD_MAX_WIDTH,
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  illustration: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.heading.size,
    lineHeight: typography.heading.line,
    fontWeight: typography.heading.weight,
    letterSpacing: letterSpacingFor('heading'),
    textAlign: 'center',
  },
  body: {
    fontSize: typography.body.size,
    lineHeight: typography.body.line,
    fontWeight: typography.body.weight,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
  },
});
