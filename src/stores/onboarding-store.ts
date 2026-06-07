import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OnboardingState = {
  /** 온보딩을 끝까지 본 적이 있는지. 기본 false(첫 실행). */
  completed: boolean;
  /** AsyncStorage 복원이 끝났는지. 복원 전 라우팅 게이트는 대기한다(깜빡임 방지). */
  hydrated: boolean;
  /** 온보딩 완료 표시(영속). */
  complete: () => void;
  /** 복원 완료 플래그 전환(내부용 — onRehydrateStorage에서 호출). */
  setHydrated: () => void;
};

/**
 * 온보딩 진행 상태 영속 스토어 — theme-store.ts persist 패턴 참고.
 *
 * 첫 실행 가치 전달을 위한 온보딩 게이트의 단일 진실. completed가 false인 동안
 * 루트 레이아웃이 /onboarding으로 보낸다. AsyncStorage 복원 전(hydrated=false)에는
 * 게이트가 화면을 그리지 않아 "홈 → 온보딩" 깜빡임을 막는다.
 */
export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      completed: false,
      hydrated: false,
      // 불변 업데이트: zustand set은 새 부분 상태를 머지한다.
      complete: () => set({ completed: true }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'memsum-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      // hydrated는 영속 대상이 아니라 복원 직후 런타임에 켠다.
      partialize: (state) => ({ completed: state.completed }),
      // 복원이 끝난(또는 실패한) 시점에 hydrated를 켜 게이트를 깨운다.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
