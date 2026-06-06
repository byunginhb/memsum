import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/design/theme/ThemeProvider';
import { useTheme } from '@/design/theme/useTheme';
import { AuthProvider } from '@/providers/AuthProvider';

import '@/global.css';

/**
 * 루트 레이아웃 — 디자인시스템.md §4, §5
 * GestureHandlerRootView > SafeAreaProvider > ThemeProvider > AuthProvider
 *   > (StatusBar + Stack).
 * - AuthProvider: 마운트 시 익명 세션 보장(비차단). 로딩/에러 중에도 앱은 뜸.
 * - 캡처 Sheet는 RN 내장 Modal 기반이라 별도 root provider가 필요 없다(@gorhom 제거).
 * Pretendard Variable 로드 시도. 실패해도 시스템 폰트 폴백으로 진행(빌드/렌더 막지 않음).
 */
export default function RootLayout() {
  // 폰트 로드 실패 시에도 화면을 차단하지 않는다(graceful fallback).
  // loaded/error는 폴백 동작을 위해 의도적으로 게이팅에 사용하지 않는다.
  useFonts({
    'Pretendard-Variable': require('@/assets/fonts/PretendardVariable.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <ThemedStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** 상태바 스타일을 현재 테마에 맞춰 전환 — 디자인시스템.md §4. */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
