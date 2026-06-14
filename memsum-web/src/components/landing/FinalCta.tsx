import { AnimatedDotsLogo } from './AnimatedDotsLogo';
import { Reveal } from './Reveal';
import { StoreBadge } from './StoreBadge';

/**
 * S8 최종 CTA — 행동 전환·클라이맥스.
 * primary 풀블리드 패널 + 9닷 재정렬(재발견 서사) + 배지 idle float.
 * 카피는 02 §8 원문.
 */
export function FinalCta() {
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
          className="mx-auto mt-8 max-w-2xl text-3xl font-extrabold tracking-tight break-keep text-white sm:text-4xl"
        >
          잊어도 괜찮아요. Memsum이 다시 떠올려드릴게요.
        </Reveal>

        <Reveal
          as="p"
          threshold={0.4}
          delay={160}
          className="mx-auto mt-4 max-w-xl text-lg leading-relaxed break-keep text-white/90"
        >
          찍기만 하세요. 나머지는 Memsum이.
        </Reveal>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Reveal variant="scale-in" threshold={0.4} delay={240}>
            <span className="idle-float inline-block">
              <StoreBadge store="appstore" />
            </span>
          </Reveal>
          <Reveal variant="scale-in" threshold={0.4} delay={300}>
            <span className="idle-float inline-block">
              <StoreBadge store="googleplay" />
            </span>
          </Reveal>
        </div>

        <Reveal
          as="p"
          variant="fade"
          threshold={0.4}
          delay={380}
          className="mt-6 text-sm break-keep text-white/80"
        >
          가입 없이 바로 시작 · 광고 없음 · 생산성 카테고리
        </Reveal>
      </div>
    </section>
  );
}
