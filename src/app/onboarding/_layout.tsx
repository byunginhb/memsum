import { Stack } from 'expo-router';

/**
 * 온보딩 스택 레이아웃.
 *
 * 단일 가로 스와이프 페이저(index)만 가지므로 헤더를 숨기고,
 * 루트 게이트에서 진입할 때 자연스럽도록 fade 전환을 쓴다(슬라이드 점프 방지).
 */
export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
  );
}
