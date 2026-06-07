import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** GPT 후처리 말투 — friendly(친근) | formal(정중). 기본 friendly. */
export type ToneStyle = 'friendly' | 'formal';

type SettingsState = {
  /** 사용자 닉네임. 빈 문자열이면 미설정(익명) 상태로 본다. */
  nickname: string;
  /** 스크린샷 자동 감지·캡처 사용 여부. 기본 true(핵심 가치). */
  autoCapture: boolean;
  /** 이벤트 감지 시 구글 캘린더 자동 등록 여부. 기본 true. */
  autoCalendar: boolean;
  /** 주간 5줄 리포트 푸시 여부. 기본 true. */
  weeklyReport: boolean;
  /** GPT 후처리 말투. 기본 friendly. */
  tone: ToneStyle;
  /** AsyncStorage 복원이 끝났는지(런타임 전용, 영속 제외). */
  hydrated: boolean;
  setNickname: (nickname: string) => void;
  setAutoCapture: (autoCapture: boolean) => void;
  setAutoCalendar: (autoCalendar: boolean) => void;
  setWeeklyReport: (weeklyReport: boolean) => void;
  setTone: (tone: ToneStyle) => void;
  /** 복원 완료 플래그 전환(내부용 — onRehydrateStorage에서 호출). */
  setHydrated: () => void;
};

/**
 * 사용자 설정 영속 스토어 — theme-store.ts / onboarding-store.ts persist 패턴 참고.
 *
 * 닉네임·자동화 토글·말투의 단일 진실. AsyncStorage에 저장해 재시작 시 복원한다.
 * 다크모드는 여기 저장하지 않는다(theme-store가 단일 진실 — 중복 방지).
 * hydrated는 영속 대상이 아니라 복원 직후 런타임에 켠다(onboarding-store 선례).
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      nickname: '',
      autoCapture: true,
      autoCalendar: true,
      weeklyReport: true,
      tone: 'friendly',
      hydrated: false,
      // 불변 업데이트: zustand set은 새 부분 상태를 머지한다.
      setNickname: (nickname) => set({ nickname }),
      setAutoCapture: (autoCapture) => set({ autoCapture }),
      setAutoCalendar: (autoCalendar) => set({ autoCalendar }),
      setWeeklyReport: (weeklyReport) => set({ weeklyReport }),
      setTone: (tone) => set({ tone }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'memsum-settings',
      storage: createJSONStorage(() => AsyncStorage),
      // hydrated는 영속 대상이 아니라 복원 직후 런타임에 켠다.
      partialize: (state) => ({
        nickname: state.nickname,
        autoCapture: state.autoCapture,
        autoCalendar: state.autoCalendar,
        weeklyReport: state.weeklyReport,
        tone: state.tone,
      }),
      // 복원이 끝난(또는 실패한) 시점에 hydrated를 켠다.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
