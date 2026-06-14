import { Check } from 'lucide-react';

import { Reveal, RevealGroup } from './Reveal';

/** 02 §5 4항목 원문. */
const AUDIENCE: readonly string[] = [
  '사진첩 스크린샷이 수백, 수천 장 쌓여 있는 분',
  '인스타·유튜브에서 좋은 자료를 반사적으로 캡처하는 분',
  '약속·영수증·정보를 찍어두고 다시 못 찾는 분',
  '메모 앱을 따로 켜기 번거로운 분',
] as const;

/** S5 타깃 — 자기확인·자격부여. card 블록 + 체크 리스트 스태거 + 강조 인용. */
export function AudienceSection() {
  return (
    <section
      aria-labelledby="audience-title"
      className="px-5 sm:px-6"
    >
      <div className="mx-auto w-full max-w-5xl rounded-(--radius-block) border border-(--color-line) bg-(--color-card) px-6 py-16 shadow-(--shadow-card) sm:px-12 sm:py-20">
        <Reveal
          as="h2"
          id="audience-title"
          className="text-center text-2xl font-bold tracking-tight break-keep sm:text-4xl"
        >
          Memsum은 이런 분을 위해 만들었어요
        </Reveal>

        <RevealGroup className="mx-auto mt-10 grid max-w-3xl gap-3">
          {AUDIENCE.map((item) => (
            <Reveal
              key={item}
              className="group flex items-start gap-3 rounded-2xl border-l-2 border-transparent py-2 pl-3 transition-colors hover:border-(--color-accent)"
            >
              <Check
                size={22}
                aria-hidden="true"
                className="mt-0.5 shrink-0 text-(--color-accent)"
              />
              <span className="text-base leading-relaxed break-keep sm:text-lg">
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
          <p className="text-xl font-bold tracking-tight break-keep sm:text-2xl">
            노션·옵시디언이 안 맞으셨던 분께.
          </p>
          <Reveal
            as="p"
            variant="fade"
            delay={200}
            className="mt-3 text-base leading-relaxed break-keep text-(--color-ink-soft) sm:text-lg"
          >
            정리 시스템을 만들고 싶은 게 아니라, 그냥 안 잃어버리고 싶은
            거잖아요.
          </Reveal>
        </Reveal>
      </div>
    </section>
  );
}
