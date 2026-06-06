import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import type { AuthState } from '@/features/capture/types';

/**
 * 익명 인증 스토어 (W3-A).
 *
 * 캡처 저장 흐름은 Supabase RLS 때문에 로그인 세션의 user_id가 필요하다.
 * 정식 Apple/Google 온보딩 전 단계이므로 익명 로그인으로 세션을 보장한다.
 * (나중에 익명 → 정식 계정 업그레이드.)
 *
 * AuthState 계약(src/features/capture/types.ts)을 단일 진실로 구현한다.
 */

/** 익명 로그인 비활성 시 사용자에게 보여줄 안내 문구. */
const ANON_DISABLED_MESSAGE =
  'Supabase 대시보드에서 익명 로그인을 켜주세요.';

/** Supabase 미설정(키 없음) 시 안내 문구. */
const SUPABASE_UNCONFIGURED_MESSAGE =
  'Supabase가 설정되지 않았습니다. .env에 EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY를 넣어주세요.';

/** ensureSession 동시 호출을 합치기 위한 in-flight 프라미스(멱등 보장). */
let inFlight: Promise<void> | null = null;

/** onAuthStateChange 구독 핸들. 중복 구독을 막기 위해 모듈 스코프에 1개만 유지. */
let authSubscription: { unsubscribe: () => void } | null = null;

type AuthStore = AuthState & {
  /** onAuthStateChange 구독 해제. Provider 언마운트 시 호출. */
  unsubscribe: () => void;
};

/**
 * 세션을 스토어에 반영한다(불변 업데이트).
 * 세션이 있으면 authenticated, 없으면 loading 상태로 둔다.
 */
function applySession(
  set: (partial: Partial<AuthStore>) => void,
  session: Session | null,
): void {
  if (session) {
    set({
      status: 'authenticated',
      userId: session.user.id,
      accessToken: session.access_token,
      error: undefined,
    });
    return;
  }
  set({ status: 'loading', userId: null, accessToken: null });
}

/**
 * onAuthStateChange 구독을 1회만 설정한다.
 * 토큰 갱신(TOKEN_REFRESHED)·로그인·로그아웃 시 accessToken을 최신으로 유지한다.
 */
function subscribeOnce(
  set: (partial: Partial<AuthStore>) => void,
): void {
  if (authSubscription || !supabase) return;
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    applySession(set, session);
  });
  authSubscription = data.subscription;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  status: 'loading',
  userId: null,
  accessToken: null,
  error: undefined,

  ensureSession: async (): Promise<void> => {
    // 멱등: 진행 중인 호출이 있으면 그 결과를 공유한다.
    if (inFlight) return inFlight;

    inFlight = (async () => {
      // Supabase 미설정이면 graceful하게 error 상태로 둔다(앱은 계속 뜸).
      if (!isSupabaseConfigured() || !supabase) {
        set({ status: 'error', error: SUPABASE_UNCONFIGURED_MESSAGE });
        return;
      }

      // 토큰 갱신 반영을 위해 구독을 먼저 보장한다.
      subscribeOnce(set);

      try {
        // ① 현재 세션 확인.
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) {
          throw sessionError;
        }

        // ② 세션이 있으면 그대로 반영하고 종료.
        if (sessionData.session) {
          applySession(set, sessionData.session);
          return;
        }

        // ③ 세션이 없으면 익명 로그인으로 보장.
        const { data: anonData, error: anonError } =
          await supabase.auth.signInAnonymously();
        if (anonError) {
          // 익명 로그인 비활성(대시보드 설정) 시 친절한 안내.
          set({ status: 'error', error: ANON_DISABLED_MESSAGE });
          return;
        }

        applySession(set, anonData.session);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '익명 세션 보장 중 알 수 없는 오류가 발생했습니다.';
        console.error('[auth] ensureSession 실패:', error);
        set({ status: 'error', error: message });
      }
    })();

    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
  },

  unsubscribe: (): void => {
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
    // get은 향후 확장(로그아웃 등)을 위해 시그니처에 유지.
    void get;
  },
}));
