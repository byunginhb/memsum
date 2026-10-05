'use client';

import { Bell } from 'lucide-react';

import { useNotify } from './NotifyProvider';

/**
 * FAQ iOS 항목 내부에 삽입되는 인라인 CTA 버튼.
 * useNotify로 NotifyDialog를 연다(전역 단일 인스턴스).
 */
export function FaqNotifyCta({ label }: { label: string }) {
  const { openNotify } = useNotify();

  return (
    <button
      type="button"
      onClick={openNotify}
      className="press mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-cobalt px-5 text-[14px] font-bold text-white hover:bg-cobalt-strong"
    >
      <Bell size={16} strokeWidth={2.25} aria-hidden="true" />
      {label}
    </button>
  );
}
