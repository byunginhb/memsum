import type { BottomTabBarProps } from 'expo-router/js-tabs';

import type { IconName } from '@/design/icons/Icon';

/**
 * BottomBar props — expo-router Tabs 커스텀 tabBar 시그니처 + 선택적 감지 표시.
 */
export type BottomBarProps = BottomTabBarProps & {
  /** 자동 감지가 켜져 있으면 true → 탭바 위에 `● {detectingLabel}` mono 표시. 꺼짐이면 표시 없음. */
  detecting?: boolean;
  /** 감지 표시 문구(i18n, 예: "감지 중"). 없으면 detecting이어도 그리지 않는다. */
  detectingLabel?: string;
};

/**
 * 하단 탭 항목 정의(라우트 탭에 한함).
 * 중앙 가져오기 버튼은 라우트가 아니므로 이 목록에 포함하지 않는다.
 */
export type BottomBarTab = {
  /** Tabs.Screen name = state.routes[].name 과 일치. */
  readonly routeName: string;
  /** lucide 아이콘 이름. */
  readonly icon: IconName;
  /** i18n 라벨 키(아이콘만 보이지만 스크린리더 라벨로 쓴다). */
  readonly labelKey: string;
};
