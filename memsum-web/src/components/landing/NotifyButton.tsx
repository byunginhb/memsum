'use client';

import { Bell } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { useNotify } from './NotifyProvider';

type NotifyButtonProps = {
  copy: LandingCopy;
  /** 잉크 섹션 위에서는 코발트 대신 밝은 코발트 글자 링크형으로. */
  onInk?: boolean;
  className?: string;
};

/**
 * 출시 알림 신청 모달을 여는 명시적 CTA.
 * 스토어 배지를 누르지 않아도 신청할 수 있도록 별도로 제공한다(StoreBadge와 같은 모달).
 * 다운로드(Google Play)가 주 행동이라 이 버튼은 밑줄 링크형 보조 행동으로 둔다.
 */
export function NotifyButton({ copy, onInk = false, className }: NotifyButtonProps) {
  const { openNotify } = useNotify();

  return (
    <button
      type="button"
      onClick={openNotify}
      className={`press group inline-flex min-h-11 items-center gap-2 text-[15px] font-bold ${
        onInk ? 'text-cobalt-on-ink' : 'text-cobalt'
      } ${className ?? ''}`}
    >
      <Bell size={17} strokeWidth={2.25} aria-hidden="true" />
      <span className="underline decoration-2 underline-offset-[6px] decoration-current/30 group-hover:decoration-current">
        {copy.notifyDialog.openCta}
      </span>
    </button>
  );
}
