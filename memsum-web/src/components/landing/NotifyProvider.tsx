'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

import type { LandingCopy } from '@/lib/landing-copy';

import { NotifyDialog } from './NotifyDialog';

type NotifyContextValue = {
  openNotify: () => void;
};

const NotifyContext = createContext<NotifyContextValue | null>(null);

/**
 * 출시 알림 모달을 전역 단일 인스턴스로 제공한다.
 * 모든 StoreBadge / CTA가 이 컨텍스트를 통해 같은 모달을 연다(가짜 스토어 링크 0건).
 * 모달 문구는 로케일 사전(`copy`)을 그대로 흘려보낸다.
 */
export function NotifyProvider({
  children,
  copy,
}: {
  children: ReactNode;
  copy: LandingCopy;
}) {
  const [open, setOpen] = useState(false);
  const openNotify = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <NotifyContext.Provider value={{ openNotify }}>
      {children}
      <NotifyDialog open={open} onClose={close} copy={copy} />
    </NotifyContext.Provider>
  );
}

export function useNotify(): NotifyContextValue {
  const ctx = useContext(NotifyContext);
  if (!ctx) {
    throw new Error('useNotify는 NotifyProvider 안에서만 사용할 수 있어요.');
  }
  return ctx;
}

/**
 * 프로바이더 밖(법적 문서 페이지 등)에서도 안전하게 쓰는 변형.
 * 프로바이더가 없으면 null을 반환해 호출부가 폴백(mailto)할 수 있게 한다.
 */
export function useOptionalNotify(): NotifyContextValue | null {
  return useContext(NotifyContext);
}
