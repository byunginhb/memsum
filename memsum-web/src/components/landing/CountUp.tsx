'use client';

import { useReveal } from '@/hooks/use-reveal';
import { useCountUp } from '@/hooks/use-count-up';

type CountUpProps = {
  to: number;
  duration?: number;
  className?: string;
};

/** 뷰포트 40% 진입 시 0→to 카운트업(천 단위 콤마). */
export function CountUp({ to, duration = 1200, className }: CountUpProps) {
  const { ref, revealed } = useReveal<HTMLSpanElement>({ threshold: 0.4 });
  const display = useCountUp(to, { duration, start: revealed });

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
