'use client';

import { Bell } from 'lucide-react';

import { useNotify } from './NotifyProvider';

/**
 * FAQ iOS 항목 내부에 삽입되는 인라인 CTA 버튼.
 * useNotify로 NotifyDialog를 연다(전역 단일 인스턴스).
 * 클라이언트 경계: NotifyProvider 안에서만 동작한다.
 */
export function FaqNotifyCta({ label }: { label: string }) {
  const { openNotify } = useNotify();

  return (
    <button
      type="button"
      onClick={openNotify}
      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-(--color-primary) px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-(--color-primary-strong) active:scale-[0.98]"
    >
      <Bell size={15} aria-hidden="true" />
      {label}
    </button>
  );
}
