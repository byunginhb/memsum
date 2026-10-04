import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import { t } from '@/i18n';
import { CATEGORY_I18N_KEY, CATEGORY_ICON } from '@/lib/categories';
import type { CategoryKey } from '@/lib/categories';

import type { CategoryGroup } from './types';

/** 칩 높이 — 최소 터치 44. */
const CHIP_HEIGHT = 44;

type TopicChipsProps = {
  groups: readonly CategoryGroup[];
  onPress: (key: CategoryKey) => void;
};

/**
 * 홈 "주제별 묶음" — 가로 스크롤 칩. 아이콘 + 이름 + mono 개수.
 * 화면 가장자리까지 스크롤되도록 바깥 여백 없이 받고, 안쪽 여백은 콘텐츠에 둔다.
 */
export function TopicChips({ groups, onPress }: TopicChipsProps): ReactNode {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {groups.map((group) => {
        const label = t(CATEGORY_I18N_KEY[group.category]);
        return (
          <PressableScale
            key={group.category}
            onPress={() => onPress(group.category)}
            accessibilityRole="button"
            accessibilityLabel={t('home.topics.a11y', { label, count: group.count })}
            style={[styles.chip, { borderColor: colors.borderStrong }]}
          >
            <Icon name={CATEGORY_ICON[group.category]} size={16} color="textPrimary" />
            <Text variant="bodyStrong" numberOfLines={1}>
              {label}
            </Text>
            <Text variant="mono" color="textSecondary">
              {group.count}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
