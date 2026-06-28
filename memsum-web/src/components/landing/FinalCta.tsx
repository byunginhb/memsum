import type { LandingCopy } from '@/lib/landing-copy';

import { AnimatedDotsLogo } from './AnimatedDotsLogo';
import { NotifyButton } from './NotifyButton';
import { Reveal } from './Reveal';
import { StoreBadge } from './StoreBadge';

/**
 * S8 최종 CTA — 행동 전환·클라이맥스.
 * primary 풀블리드 패널 + 9닷 재정렬(재발견 서사) + 배지 idle float.
 * 카피는 로케일 사전(`copy.finalCta`)에서 주입.
 */
export function FinalCta({ copy }: { copy: LandingCopy }) {
  const c = copy.finalCta;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="final-title"
      className="px-5 py-20 sm:px-6 sm:py-24"
    >
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-(--radius-block) bg-(--color-primary) px-6 py-16 text-center sm:px-12 sm:py-24">
        {/* 보라 패널 위 미세 글로우 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-[70px]"
        />

        <Reveal
          threshold={0.4}
          className="mx-auto flex w-fit justify-center"
        >
          <AnimatedDotsLogo size={64} trigger="inView" onPurple />
        </Reveal>

        <Reveal
          as="h2"
          id="final-title"
          threshold={0.4}
          delay={80}
          className={`mx-auto mt-8 max-w-2xl text-3xl font-extrabold tracking-tight ${bk} text-white sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        <Reveal
          as="p"
          threshold={0.4}
          delay={160}
          className={`mx-auto mt-4 max-w-xl text-lg leading-relaxed ${bk} text-white/90`}
        >
          {c.body}
        </Reveal>

        <div className="mt-10 flex flex-col items-center gap-5">
          <Reveal variant="scale-in" threshold={0.4} delay={220}>
            <NotifyButton copy={copy} onPurple />
          </Reveal>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Reveal variant="scale-in" threshold={0.4} delay={280}>
              <span className="idle-float inline-block">
                <StoreBadge store="appstore" copy={copy} />
              </span>
            </Reveal>
            <Reveal variant="scale-in" threshold={0.4} delay={340}>
              <span className="idle-float inline-block">
                <StoreBadge store="googleplay" copy={copy} />
              </span>
            </Reveal>
          </div>
        </div>

        <Reveal
          as="p"
          variant="fade"
          threshold={0.4}
          delay={380}
          className={`mt-6 text-sm ${bk} text-white/80`}
        >
          {c.helper}
        </Reveal>
      </div>
    </section>
  );
}
