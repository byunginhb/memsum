'use client';

import { Bell } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { useNotify } from './NotifyProvider';

type NotifyButtonProps = {
  copy: LandingCopy;
  /** primary 보라 패널(FinalCta) 위에서는 흰색 버튼으로 대비를 준다. */
  onPurple?: boolean;
  className?: string;
};

/**
 * 출시 알림 신청 모달을 여는 명시적 CTA 버튼.
 * 스토어 배지를 누르지 않아도 신청할 수 있도록 별도로 제공한다
 * (StoreBadge와 동일한 모달을 useNotify로 연다).
 */
export function NotifyButton({
  copy,
  onPurple = false,
  className,
}: NotifyButtonProps) {
  const { openNotify } = useNotify();

  return (
    <button
      type="button"
      onClick={openNotify}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-(--shadow-card) transition-all duration-200 ease-(--ease-standard) hover:-translate-y-1 hover:shadow-(--shadow-float) active:scale-[0.98] ${
        onPurple
          ? 'bg-white text-(--color-primary) hover:bg-white'
          : 'bg-(--color-primary) text-white hover:bg-(--color-primary-strong)'
      } ${className ?? ''}`}
    >
      <Bell size={18} aria-hidden="true" />
      {copy.notifyDialog.openCta}
    </button>
  );
}
