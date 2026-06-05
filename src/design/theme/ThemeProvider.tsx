import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useThemeStore } from './theme-store';

type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * 테마 모드 적용기 — 디자인시스템.md §5
 *
 * 영속 스토어의 mode('system'|'light'|'dark')를 nativewind colorScheme에 반영한다.
 * 'system'이면 OS 설정을 따르도록 nativewind에 위임한다.
 * 별도 Context를 만들지 않고 nativewind의 전역 colorScheme을 단일 소스로 쓴다.
 */
export function ThemeProvider({ children }: ThemeProviderProps): ReactNode {
  const mode = useThemeStore((state) => state.mode);
  const { setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  return children;
}
