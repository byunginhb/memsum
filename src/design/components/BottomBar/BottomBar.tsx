import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, radius, spacing, typography } from '@/design/tokens';
import { usePhotoImport } from '@/hooks/use-photo-import';
import { t } from '@/i18n';

import type { BottomBarProps, BottomBarTab } from './BottomBar.types';

// 최소 탭 터치 영역 — 디자인시스템.md §10 (44pt).
const MIN_TOUCH = 44;
// 중앙 캡처+ 버튼 지름. 탭바 위로 살짝 솟도록 탭바 높이보다 크게.
const CAPTURE_BUTTON_SIZE = 56;
// 캡처+ 버튼이 위로 솟는 정도.
const CAPTURE_BUTTON_LIFT = 8;
// 탭바 본문 높이(safe-area inset 제외).
const BAR_HEIGHT = 56;
// 5칸(탭4 + 캡처1) 균등 분할 폭. flex:1 분배가 콘텐츠 차로 어긋나는 것을 막기 위해
// 명시 퍼센트로 고정한다. as const로 DimensionValue('${number}%') 타입을 만족시킨다.
const SLOT_WIDTH = '20%' as const;

// 캡처+ 버튼 좌측에 들어갈 두 탭, 우측에 들어갈 두 탭.
const LEADING_TABS: readonly BottomBarTab[] = [
  { routeName: 'index', icon: 'home', labelKey: 'home.tab.home' },
  { routeName: 'search', icon: 'search', labelKey: 'home.tab.search' },
];
const TRAILING_TABS: readonly BottomBarTab[] = [
  { routeName: 'calendar', icon: 'calendar', labelKey: 'home.tab.calendar' },
  { routeName: 'settings', icon: 'settings', labelKey: 'home.tab.settings' },
];

/**
 * 하단 탭바 — 홈/검색/[캡처+]/캘린더/설정 5칸.
 *
 * expo-router Tabs의 커스텀 tabBar로 주입된다(레이아웃: (tabs)/_layout.tsx).
 * 4개 탭은 state.routes에서 name으로 찾아 매핑하고, 활성 판별은 state.index를 쓴다.
 * 중앙 캡처+는 라우트가 아니라 "사진첩에서 골라 정리"(수동 반입)를 여는 액션 버튼이다
 * (usePhotoImport — 시스템 사진 선택기 → 캡처 파이프라인).
 * 색·간격·반경은 토큰만 사용하고, safe-area 하단 inset을 반영한다.
 */
export function BottomBar({ state, navigation }: BottomBarProps): React.ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { onImport, isImporting } = usePhotoImport();

  // 현재 활성 라우트 이름(state.index 기준)으로 탭 활성 여부를 판별한다.
  const activeRouteName = state.routes[state.index]?.name;

  const handleNavigate = useCallback(
    (routeName: string): void => {
      navigation.navigate(routeName);
    },
    [navigation],
  );

  const renderTab = useCallback(
    (tab: BottomBarTab) => {
      // 라우트가 (tabs)에 등록돼 있을 때만 렌더(방어적 — 미등록 시 빈 칸 방지).
      const route = state.routes.find((r) => r.name === tab.routeName);
      if (!route) return null;
      const isActive = activeRouteName === tab.routeName;
      return (
        <TabItem
          key={tab.routeName}
          icon={tab.icon}
          label={t(tab.labelKey)}
          isActive={isActive}
          onPress={() => handleNavigate(tab.routeName)}
        />
      );
    },
    [state.routes, activeRouteName, handleNavigate],
  );

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom,
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.border,
        },
      ]}
    >
      <View style={[styles.row, { height: BAR_HEIGHT }]}>
        {LEADING_TABS.map(renderTab)}

        <CaptureButton onPress={onImport} disabled={isImporting} />

        {TRAILING_TABS.map(renderTab)}
      </View>
    </View>
  );
}

type TabItemProps = {
  icon: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

/** 단일 탭 셀 — 아이콘 + 라벨. 활성 시 primary, 비활성 시 textSecondary. */
function TabItem({ icon, label, isActive, onPress }: TabItemProps) {
  const { colors } = useTheme();
  const tint = isActive ? 'primary' : 'textSecondary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      android_ripple={{ borderless: true }}
      // 정적 style 배열 사용: NativeWind 래핑 Pressable의 함수형 style은
      // flex 등 레이아웃 속성을 누락시켜 탭이 가장자리로 몰린다(W1 동일 버그).
      style={styles.tab}
    >
      <Icon name={icon} size={24} color={tint} />
      <Text
        style={[
          styles.label,
          { color: isActive ? colors.primary : colors.textSecondary },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type CaptureButtonProps = {
  onPress: () => void;
  disabled: boolean;
};

/** 중앙 캡처+ 액션 버튼 — primary 원형, 위로 살짝 솟은 형태. 라우트 아님. */
function CaptureButton({ onPress, disabled }: CaptureButtonProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.captureSlot}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        accessibilityLabel={t('home.tab.capture')}
        android_ripple={{ borderless: true }}
        style={styles.captureButton}
      >
        {/* 색 원은 내부 View에 둔다: NativeWind 래핑 Pressable은 inline
            backgroundColor를 누락시켜(투명 원) 흰 아이콘만 보이게 되므로,
            배경색이 정상 적용되는 일반 View로 원을 그린다. */}
        <View style={[styles.captureCircle, { backgroundColor: colors.primary }]}>
          <Icon name="camera" size={24} color="onPrimary" />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    // 5칸(탭4 + 캡처1)을 정확히 균등 분할한다. flex:1은 캡처 슬롯과 탭의
    // 콘텐츠 차이로 셀 폭이 어긋나(탭 239 / 캡처 124) 간격이 불규칙해졌으므로,
    // 명시적 20% 고정 폭으로 5칸을 동일하게 맞춘다(중심 간격 균등 보장).
    width: SLOT_WIDTH,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  captureSlot: {
    // 탭과 동일한 20% 고정 폭. 캡처 버튼(원형)을 이 슬롯 중앙에 둔다.
    width: SLOT_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureCircle: {
    width: CAPTURE_BUTTON_SIZE,
    height: CAPTURE_BUTTON_SIZE,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    // 탭바 위로 살짝 솟은 형태.
    marginTop: -CAPTURE_BUTTON_LIFT,
  },
});
