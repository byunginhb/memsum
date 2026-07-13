import { Mail } from 'lucide-react';

import { SUPPORT_EMAIL } from '@/lib/site';
import type { LandingCopy } from '@/lib/landing-copy';

import { FounderAvatar } from './FounderAvatar';
import { Reveal } from './Reveal';

/**
 * 창작자 스토리 섹션 — 콜드스타트 신뢰 자산.
 * "누가 왜 만들었나"를 사진(이니셜 폴백)·인용·직접 문의 경로로 노출한다.
 * copy.founder는 landing-copy.ts에서 로케일별로 주입된다.
 */
export function FounderStory({ copy }: { copy: LandingCopy }) {
  const c = copy.founder;
  const bk = copy.isKorean ? 'break-keep' : '';

  return (
    <section aria-labelledby="founder-title" className="px-5 sm:px-6">
      <div className="mx-auto w-full max-w-3xl rounded-(--radius-block) border border-(--color-line) bg-(--color-card) px-6 py-14 shadow-(--shadow-card) sm:px-12 sm:py-16">
        <Reveal className="flex flex-col items-center gap-5 text-center">
          <FounderAvatar name={c.name} photoAlt={c.photoAlt} />

          <div>
            <p className="text-base font-semibold text-(--color-ink)">{c.name}</p>
            <p className="mt-0.5 text-sm text-(--color-ink-soft)">{c.role}</p>
          </div>

          <Reveal
            as="blockquote"
            variant="fade"
            delay={80}
            id="founder-title"
            className={`max-w-xl text-lg font-medium leading-relaxed ${bk} text-(--color-ink) sm:text-xl`}
          >
            &ldquo;{c.quote}&rdquo;
          </Reveal>

          <Reveal variant="fade" delay={160}>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-1.5 text-sm text-(--color-primary) underline underline-offset-2 hover:text-(--color-primary-strong)"
            >
              <Mail size={15} aria-hidden="true" />
              {c.contactCta}
            </a>
          </Reveal>
        </Reveal>
      </div>
    </section>
  );
}
