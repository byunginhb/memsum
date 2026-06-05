import { useColorScheme } from 'nativewind';

import { darkColors, lightColors } from '@/design/tokens';
import type { SemanticColors } from '@/design/tokens';

export type ResolvedScheme = 'light' | 'dark';

export type Theme = {
  /** 현재 해석된 스킴(시스템 모드를 실제 light/dark로 환산한 값). */
  scheme: ResolvedScheme;
  /** 의미 색 토큰 객체 — 컴포넌트는 여기서만 색을 가져온다. */
  colors: SemanticColors;
  /** 다크 모드 여부(편의 플래그). */
  isDark: boolean;
};

/**
 * 현재 테마 색 객체 + 해석된 스킴 반환 — 디자인시스템.md §5
 * nativewind useColorScheme의 colorScheme(.dark 클래스 반영)을 단일 소스로 사용한다.
 * 미정의 시 light 폴백.
 */
export function useTheme(): Theme {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return {
    scheme: isDark ? 'dark' : 'light',
    colors: isDark ? darkColors : lightColors,
    isDark,
  };
}
