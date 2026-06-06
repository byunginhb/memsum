import { useEffect, type ReactNode } from 'react';

import { useAuthStore } from '@/stores/auth-store';

type AuthProviderProps = {
  children: ReactNode;
};

/**
 * 익명 인증 Provider (W3-A).
 *
 * 마운트 시 ensureSession()을 1회 호출해 세션(필요 시 익명 로그인)을 보장한다.
 * 세션 보장은 비차단이다 — 로딩/에러 중에도 children은 그대로 렌더되어 앱이 뜬다.
 * (캡처 저장처럼 세션이 필요한 흐름에서 useAuthStore.status로 게이팅한다.)
 */
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    // ensureSession은 멱등이므로 StrictMode 중복 마운트에도 안전하다.
    void useAuthStore.getState().ensureSession();

    return () => {
      // 언마운트 시 onAuthStateChange 구독 해제(리스너 누수 방지).
      useAuthStore.getState().unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
