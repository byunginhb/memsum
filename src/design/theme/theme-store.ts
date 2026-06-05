import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 테마 모드 — 디자인시스템.md §5: system | light | dark 3택. */
export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

/**
 * 테마 모드 영속 스토어. 기본값 'system'(시스템 설정 따름).
 * AsyncStorage에 사용자 선택을 저장해 앱 재시작 시 복원한다.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      // 불변 업데이트: zustand set은 새 부분 상태를 머지한다.
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'memsum-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
