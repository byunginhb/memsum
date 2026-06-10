import type { BottomTabBarProps } from 'expo-router/js-tabs';

import type { IconName } from '@/design/icons/Icon';

/**
 * BottomBar 컴포넌트 props — expo-router Tabs의 커스텀 tabBar 시그니처.
 * expo-router가 @react-navigation/bottom-tabs의 BottomTabBarProps를 재노출한다.
 */
export type BottomBarProps = BottomTabBarProps;

/**
 * 하단 탭 항목 정의(라우트 탭에 한함).
 * 중앙 캡처+ 버튼은 라우트가 아니므로 이 목록에 포함하지 않는다.
 */
export type BottomBarTab = {
  /** Tabs.Screen name = state.routes[].name 과 일치. */
  readonly routeName: string;
  /** lucide 아이콘 이름. */
  readonly icon: IconName;
  /** i18n 라벨 키. */
  readonly labelKey: string;
};
