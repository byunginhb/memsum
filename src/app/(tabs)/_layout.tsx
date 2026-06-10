import { View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { BottomBar } from '@/design/components/BottomBar/BottomBar';
import { CaptureSheet } from '@/features/capture/CaptureSheet';
import { t } from '@/i18n';

/**
 * 하단 탭 레이아웃 — 홈/검색/캘린더/설정 4개 탭 + 중앙 캡처+ 액션(BottomBar).
 *
 * 커스텀 BottomBar를 tabBar로 주입하고 헤더는 각 화면이 직접 그린다(headerShown:false).
 * CaptureSheet는 Tabs 형제로 1회만 마운트해 모든 탭이 공유한다
 * (각 탭 화면이 중복 렌더하지 않도록 (tabs)/index.tsx에서는 제거됨).
 * Sheet 표시는 capture-store(current/isSheetOpen)가 단일 진실이므로 위치만 상주시키면 된다.
 */
export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <BottomBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: t('home.tab.home') }} />
        <Tabs.Screen name="search" options={{ title: t('home.tab.search') }} />
        <Tabs.Screen name="calendar" options={{ title: t('home.tab.calendar') }} />
        <Tabs.Screen name="settings" options={{ title: t('home.tab.settings') }} />
      </Tabs>
      <CaptureSheet />
    </View>
  );
}
