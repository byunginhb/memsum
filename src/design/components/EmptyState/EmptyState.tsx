import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design/components/Button/Button';
import { CropFrame } from '@/design/components/CropFrame/CropFrame';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { spacing } from '@/design/tokens';

type EmptyStateAction = {
  label: string;
  onPress: () => void;
};

export type EmptyStateProps = {
  /** 빈 프레임 안에 흐리게 둘 아이콘(선택). */
  icon?: IconName;
  /** 빈 프레임 대신 쓸 그림(예: <BrandMark />). */
  illustration?: ReactNode;
  /** 헤드라인. 짧고 구체적으로. */
  title: string;
  body?: string;
  /** 할 일 버튼 하나. */
  action?: EmptyStateAction;
};

/** 빈 프레임 크기 — 세로형 스크린샷 비율 느낌. */
const FRAME_WIDTH = 72;
const FRAME_HEIGHT = 96;

/**
 * EmptyState — 왼쪽 정렬 헤드라인 + 할 일 버튼 하나 + 크롭 모서리로 그린 빈 프레임(명세 §6).
 * 중앙 정렬 원형 아이콘 패턴은 폐기.
 */
export function EmptyState({ icon, illustration, title, body, action }: EmptyStateProps): ReactNode {
  return (
    <View style={styles.container}>
      {illustration ?? (
        <CropFrame width={FRAME_WIDTH} height={FRAME_HEIGHT} color="textSecondary" style={styles.frame}>
          {icon ? <Icon name={icon} size={24} color="textSecondary" /> : null}
        </CropFrame>
      )}

      <View style={styles.text}>
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        {body ? (
          <Text variant="body" color="textSecondary">
            {body}
          </Text>
        ) : null}
      </View>

      {action ? (
        <Button
          variant="primary"
          onPress={action.onPress}
          accessibilityLabel={action.label}
          style={styles.action}
        >
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
    gap: spacing.xl,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  action: {
    alignSelf: 'flex-start',
  },
});
