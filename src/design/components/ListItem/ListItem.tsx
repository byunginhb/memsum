import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';

export type ListItemProps = {
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  /** 아래 1px rule 구분선. 마지막 행은 false. */
  showDivider?: boolean;
  /** 스크린리더 라벨. 미지정 시 title. trailing의 시각 정보를 합칠 때 사용(예: "마케팅 자료 2장"). */
  accessibilityLabel?: string;
};

const SINGLE_LINE_HEIGHT = 56;
const TWO_LINE_HEIGHT = 68;
/** 행 전체가 줄어드는 건 과하므로 눌림 배율을 버튼보다 약하게. */
const ROW_PRESS_SCALE = 0.985;

/**
 * ListItem — 구분선형 목록 행. 카드로 감싸지 않고 머리카락 rule로만 나눈다.
 * onPress 있으면 눌림(scale), 없으면 정적 행(예: trailing Switch가 단독 토글).
 */
export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  onPress,
  showDivider = false,
  accessibilityLabel,
}: ListItemProps): ReactNode {
  const { colors } = useTheme();
  const hasSubtitle = typeof subtitle === 'string' && subtitle.length > 0;
  const rowStyle = [styles.row, { minHeight: hasSubtitle ? TWO_LINE_HEIGHT : SINGLE_LINE_HEIGHT }];

  const content = (
    <>
      {leading ? <View style={styles.side}>{leading}</View> : null}
      <View style={styles.body}>
        <Text variant="body" numberOfLines={1}>
          {title}
        </Text>
        {hasSubtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.side}>{trailing}</View> : null}
    </>
  );

  const divider = showDivider ? (
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  ) : null;

  if (!onPress) {
    return (
      <View>
        <View style={rowStyle}>{content}</View>
        {divider}
      </View>
    );
  }

  return (
    <View>
      <PressableScale
        onPress={onPress}
        scaleTo={ROW_PRESS_SCALE}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        style={rowStyle}
      >
        {content}
      </PressableScale>
      {divider}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  side: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
});
