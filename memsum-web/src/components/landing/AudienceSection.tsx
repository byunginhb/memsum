import { Check } from 'lucide-react';

import type { LandingCopy } from '@/lib/landing-copy';

import { Reveal, RevealGroup } from './Reveal';

/** S5 타깃 — 자기확인·자격부여. card 블록 + 체크 리스트 스태거 + 강조 인용. */
export function AudienceSection({ copy }: { copy: LandingCopy }) {
  const c = copy.audience;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section
      aria-labelledby="audience-title"
      className="px-5 sm:px-6"
    >
      <div className="mx-auto w-full max-w-5xl rounded-(--radius-block) border border-(--color-line) bg-(--color-card) px-6 py-16 shadow-(--shadow-card) sm:px-12 sm:py-20">
        <Reveal
          as="h2"
          id="audience-title"
          className={`text-center text-2xl font-bold tracking-tight ${bk} sm:text-4xl`}
        >
          {c.title}
        </Reveal>

        <RevealGroup className="mx-auto mt-10 grid max-w-3xl gap-3">
          {c.items.map((item) => (
            <Reveal
              key={item}
              className="group flex items-start gap-3 rounded-2xl border-l-2 border-transparent py-2 pl-3 transition-colors hover:border-(--color-accent)"
            >
              <Check
                size={22}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-(--color-accent)"
              />
              <span className={`text-base leading-relaxed ${bk} sm:text-lg`}>
                {item}
              </span>
            </Reveal>
          ))}
        </RevealGroup>

        <Reveal
          variant="scale-in"
          delay={120}
          className="mx-auto mt-12 max-w-2xl rounded-(--radius-block) bg-(--color-primary-soft) p-8 text-center"
        >
          <p className={`text-xl font-bold tracking-tight ${bk} sm:text-2xl`}>
            {c.quoteHeadline}
          </p>
          <Reveal
            as="p"
            variant="fade"
            delay={200}
            className={`mt-3 text-base leading-relaxed ${bk} text-(--color-ink-soft) sm:text-lg`}
          >
            {c.quoteSub}
          </Reveal>
        </Reveal>
      </div>
    </section>
  );
}
