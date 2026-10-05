import type { LandingCopy } from '@/lib/landing-copy';
import { SUPPORT_EMAIL } from '@/lib/site';

import { FounderAvatar } from './FounderAvatar';

/**
 * 만든 사람 — 한 사람의 목소리라 장식 없이 큰 인용 한 문단 + 서명.
 */
export function FounderStory({ copy }: { copy: LandingCopy }) {
  const c = copy.founder;

  return (
    <section aria-label={c.role} className="border-y border-rule bg-surface">
      <figure className="wrap grid gap-10 py-20 sm:py-24 lg:grid-cols-12 lg:gap-10">
        <blockquote className="lg:col-span-8 lg:col-start-3">
          <p className="text-[clamp(1.375rem,3vw,2.125rem)] leading-[1.5] font-bold tracking-[-0.025em]">
            {c.quote}
          </p>
        </blockquote>
        <figcaption className="flex flex-wrap items-center gap-6 lg:col-span-8 lg:col-start-3">
          <FounderAvatar name={c.name} photoAlt={c.photoAlt} />
          <div className="min-w-0">
            <p lang="en" className="text-[17px] font-bold">
              {c.name}
            </p>
            <p className="mt-1 text-[14px] text-ink-2">{c.role}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-2 inline-flex min-h-8 items-center text-[14px] font-bold text-cobalt underline decoration-2 underline-offset-[5px] decoration-cobalt/30 hover:decoration-cobalt"
            >
              {c.contactCta}
            </a>
          </div>
        </figcaption>
      </figure>
    </section>
  );
}
