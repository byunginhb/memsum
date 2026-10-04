import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { t } from '@/i18n';

/** 왼쪽 코발트 막대 두께 — 본문과 구분되는 "편집자 메모" 표시. */
const NOTE_RULE_WIDTH = 2;

type ReportCoachmarkProps = {
  /** 노출 여부. 보통 hydrated && !seen 일 때 true. */
  visible: boolean;
  /** 닫기(영속 플래그 켜기). */
  onDismiss: () => void;
};

/**
 * 5줄 리포트 첫 열람 1회 안내 — 화면을 덮는 모달 대신 제목 아래 짧은 메모로 둔다.
 *
 * why 인라인: 리포트의 연출(순위 숫자가 떨어지는 의식)은 첫 진입에 한 번뿐인데,
 * 모달이 그 위를 덮으면 핵심 순간을 가린다. 메모는 읽고 넘기거나 "알겠어요"로 접는다.
 * 닫으면 영속 플래그(onboarding-store)로 다시 뜨지 않는다.
 */
export function ReportCoachmark({ visible, onDismiss }: ReportCoachmarkProps): ReactNode {
  const { colors } = useTheme();
  if (!visible) return null;

  return (
    <View style={[styles.note, { borderLeftColor: colors.primary }]}>
      <Text variant="bodyStrong">{t('report.coachmark.title')}</Text>
      <Text variant="caption" color="textSecondary">
        {t('report.coachmark.body')}
      </Text>
      <Button
        variant="ghost"
        size="sm"
        onPress={onDismiss}
        accessibilityLabel={t('report.coachmark.dismiss')}
        style={styles.dismiss}
      >
        {t('report.coachmark.dismiss')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    borderLeftWidth: NOTE_RULE_WIDTH,
    paddingLeft: spacing.md,
    gap: spacing.xs,
  },
  dismiss: {
    alignSelf: 'flex-start',
    // ghost 버튼 안쪽 여백만큼 당겨 글자를 메모 본문 시작선에 맞춘다.
    marginLeft: -spacing.md,
  },
});
