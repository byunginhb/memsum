import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/design/components/Toast';
import { ThemeProvider } from '@/design/theme/ThemeProvider';
import { useTheme } from '@/design/theme/useTheme';
import { AuthProvider } from '@/providers/AuthProvider';
import { useOnboardingStore } from '@/stores/onboarding-store';

import '@/global.css';

/**
 * 루트 레이아웃 — 디자인시스템.md §4, §5
 * GestureHandlerRootView > SafeAreaProvider > ThemeProvider > AuthProvider
 *   > (StatusBar + OnboardingGate(Stack)).
 * - AuthProvider: 마운트 시 익명 세션 보장(비차단). 로딩/에러 중에도 앱은 뜸.
 * - OnboardingGate: 첫 실행 시 /onboarding으로 보냄. 복원 전엔 화면을 가려 깜빡임 방지.
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
            <ToastProvider>
              <ThemedStatusBar />
              <OnboardingGate>
                <Stack screenOptions={{ headerShown: false }} />
              </OnboardingGate>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * 온보딩 라우팅 게이트.
 *
 * - 복원 전(hydrated=false): 같은 bgBase 색 오버레이로 화면을 가려
 *   "홈 → 온보딩" 깜빡임/레이아웃 점프를 막는다(스플래시 유지 효과).
 * - 복원 후 completed=false: 온보딩 밖에 있으면 /onboarding으로 replace.
 *   이미 온보딩 안이면 그대로 둔다(무한 replace 방지).
 * Stack 자체는 항상 자식으로 마운트해 라우트 트리를 등록한다.
 */
function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const completed = useOnboardingStore((state) => state.completed);
  const hydrated = useOnboardingStore((state) => state.hydrated);

  const inOnboarding = pathname.startsWith('/onboarding');
  // expo-router는 navigation을 다음 프레임에 반영하므로 pathname이 갱신되기 전
  // effect가 다시 돌아 replace가 중복 발화할 수 있다. ref로 1회만 보낸다.
  const redirected = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    if (completed) {
      // 온보딩 완료 후엔 가드를 풀어 (드물지만) 재초기화 케이스를 허용한다.
      redirected.current = false;
      return;
    }
    if (!inOnboarding && !redirected.current) {
      redirected.current = true;
      router.replace('/onboarding');
    }
  }, [hydrated, completed, inOnboarding, router]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {/* 복원 전엔 전체를 가려 첫 프레임 깜빡임을 방지한다(자식은 계속 마운트). */}
      {!hydrated ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.bgBase }]}
          pointerEvents="auto"
        />
      ) : null}
    </View>
  );
}

/** 상태바 스타일을 현재 테마에 맞춰 전환 — 디자인시스템.md §4. */
function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}
