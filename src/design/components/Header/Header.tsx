import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';

export type HeaderProps = {
  title: string;
  /** 왼쪽 슬롯(직접 그린 버튼). onBack이 있으면 무시된다. */
  left?: ReactNode;
  /** 오른쪽 슬롯(액션 버튼 등). */
  right?: ReactNode;
  /** true면 바 아래에 display 큰 제목(탭 화면). false면 바 안에 headline 제목(상세 화면). */
  large?: boolean;
  /** large 제목 위 mono 머리표. 예: `10월 1주 · 38장`. */
  eyebrow?: string;
  /** 주면 왼쪽에 뒤로가기(chevron) 버튼을 그린다. */
  onBack?: () => void;
  /** 뒤로가기 버튼 스크린리더 라벨(i18n 문구). */
  backLabel?: string;
  /** SafeArea top inset(px). 호출측이 useSafeAreaInsets()로 넘긴다. */
  topInset?: number;
};

/** 바 높이 — 양 플랫폼 통일. */
const BAR_HEIGHT = 52;
/** 최소 터치 영역. */
const MIN_TOUCH = 44;

/**
 * Header — 통일 헤더(시스템 헤더 대신). 양 플랫폼 같은 모양, 왼쪽 정렬, 바탕은 화면색(bgBase),
 * 그림자·하단 테두리 없음. 제목은 Text가 서체를 처리한다.
 */
export function Header({
  title,
  left,
  right,
  large = false,
  eyebrow,
  onBack,
  backLabel,
  topInset = 0,
}: HeaderProps): ReactNode {
  const { colors } = useTheme();

  const leftNode = onBack ? (
    <PressableScale
      onPress={onBack}
      accessibilityRole="button"
      accessibilityLabel={backLabel}
      hitSlop={spacing.sm}
      style={styles.touch}
    >
      <Icon name="chevron-left" size={24} color="textPrimary" />
    </PressableScale>
  ) : (
    left
  );

  const hasBarContent = leftNode != null || right != null || !large;

  return (
    <View style={{ paddingTop: topInset, backgroundColor: colors.bgBase }}>
      {hasBarContent ? (
        <View style={styles.bar}>
          {leftNode != null ? <View style={styles.touch}>{leftNode}</View> : null}
          <View style={styles.barTitle}>
            {!large ? (
              <Text variant="headline" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            ) : null}
          </View>
          {right != null ? <View style={styles.right}>{right}</View> : null}
        </View>
      ) : null}

      {large ? (
        <View style={styles.large}>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <Text variant="display" numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  touch: {
    minWidth: MIN_TOUCH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTitle: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  right: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  large: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
});
