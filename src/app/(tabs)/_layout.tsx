import { StyleSheet, View } from 'react-native';
import { Tabs } from 'expo-router/js-tabs';

import { BottomBar } from '@/design/components/BottomBar/BottomBar';
import { useTheme } from '@/design/theme/useTheme';
import { CaptureSheet } from '@/features/capture/CaptureSheet';
import { useAutoDetectActive } from '@/features/home/use-auto-detect-active';
import { t } from '@/i18n';

/**
 * 하단 탭 레이아웃 — 홈/검색/캘린더/설정 + 가운데 가져오기(BottomBar).
 *
 * 탭바는 콘텐츠 위에 떠 있는 알약이라 각 탭 화면이 useBottomBarClearance()로 아래 여백을 둔다.
 * 자동 감지가 실제로 켜져 있을 때만 탭바 위에 `● 감지 중`을 띄운다(꺼짐이면 표시 없음).
 * CaptureSheet는 Tabs 형제로 1회만 마운트해 모든 탭이 공유한다(capture-store가 단일 진실).
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const detecting = useAutoDetectActive();

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bgBase } }}
        tabBar={(props) => (
          <BottomBar {...props} detecting={detecting} detectingLabel={t('home.tab.detecting')} />
        )}
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
