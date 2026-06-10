import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListItem } from '@/design/components/ListItem/ListItem';
import { Icon } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { spacing, typography } from '@/design/tokens';
import { CATEGORY_I18N_KEY, CATEGORY_ICON } from '@/lib/categories';
import { t } from '@/i18n';

import type { IconSize } from '@/design/icons/Icon';
import type { CategoryKey } from '@/lib/categories';
import type { CategoryGroup } from './types';

/** leading 아이콘 크기(px) — design.md §6 리스트 행 기본. */
const ICON_SIZE: IconSize = 24;

/** trailing chevron 크기(px). */
const CHEVRON_SIZE: IconSize = 20;

type CategoryListProps = {
  /** 주제별 묶음(카테고리 + 개수). 빈 배열이면 null. */
  groups: CategoryGroup[];
  /** 카테고리 탭 시 해당 묶음으로 이동(라우팅은 상위 위임). */
  onPressCategory: (key: CategoryKey) => void;
};

/**
 * CategoryList — 홈 "주제별 묶음" 리스트(design.md §17).
 *
 * 각 그룹을 ListItem 한 행으로 렌더한다: leading 카테고리 아이콘(CATEGORY_ICON),
 * title 카테고리 라벨(CATEGORY_I18N_KEY), trailing "{count}장" + chevron, onPress로
 * 해당 카테고리 라우팅. 마지막 행을 제외하고 디바이더를 표시한다.
 * count는 trailing에 시각적으로 노출해 색상 외 정보를 함께 전달한다(§35).
 * 빈 배열이면 null을 돌려준다(빈 상태 UI는 상위 화면 책임).
 */
export function CategoryList({
  groups,
  onPressCategory,
}: CategoryListProps): ReactNode {
  const { colors } = useTheme();

  if (groups.length === 0) return null;

  return (
    <View>
      {groups.map((group, index) => {
        const categoryLabel = t(CATEGORY_I18N_KEY[group.category]);
        const countLabel = t('home.category.count', { count: group.count });
        // 마지막 행은 디바이더 생략(섹션 하단 경계 중복 방지).
        const showDivider = index < groups.length - 1;

        const trailing = (
          <View style={styles.trailing}>
            <Text
              style={[styles.count, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {countLabel}
            </Text>
            <Icon name="chevron-right" size={CHEVRON_SIZE} color="textSecondary" />
          </View>
        );

        return (
          <ListItem
            key={group.category}
            leading={
              <Icon
                name={CATEGORY_ICON[group.category]}
                size={ICON_SIZE}
                color="textPrimary"
              />
            }
            title={categoryLabel}
            trailing={trailing}
            onPress={() => onPressCategory(group.category)}
            showDivider={showDivider}
            accessibilityLabel={`${categoryLabel} ${countLabel}`}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  count: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodySm.weight,
  },
});
