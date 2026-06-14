'use client';

import { useReveal } from '@/hooks/use-reveal';

import { Reveal, RevealGroup } from './Reveal';

type Step = {
  num: string;
  title: string;
  body: string;
};

/** 02 §3 원문 그대로(카피의 숫자 이모지는 원형 숫자 배지로 치환). */
const STEPS: readonly Step[] = [
  {
    num: '1',
    title: '찍어요',
    body: '평소처럼 스크린샷만 찍으세요. 따로 할 일 없어요.',
  },
  {
    num: '2',
    title: 'Memsum이 읽어요',
    body: '캡처 속 글자를 추출해(OCR) 제목과 요약을 붙이고, 6가지로 자동 분류해요.',
  },
  {
    num: '3',
    title: '알아서 정리돼요',
    body: '일정은 캘린더에, 한 주는 일요일 저녁 5줄 리포트로. 당신은 다시 찾기만 하면 돼요.',
  },
] as const;

/**
 * S3 작동 방식 — 신뢰·간단함 증명. primary-soft 블록 + 스텝 스태거.
 * 연결선은 카드가 reveal되면 "그려진다"(데스크톱 좌→우, 모바일 위→아래).
 * reduced-motion 시 CSS가 즉시 완성 상태로 폴백한다.
 */
export function StepFlow() {
  // 그리드가 뷰포트에 들어오면 카드 스태거와 함께 연결선 그리기를 트리거.
  const { ref, revealed } = useReveal<HTMLElement>();
  const drawn = revealed ? 'true' : 'false';

  return (
    <section
      id="how-it-works"
      aria-labelledby="step-title"
      className="scroll-mt-20 px-5 sm:px-6"
    >
      <div className="mx-auto w-full max-w-6xl rounded-(--radius-block) bg-(--color-primary-soft) px-5 py-16 sm:px-10 sm:py-20">
        <Reveal
          as="h2"
          id="step-title"
          className="text-center text-2xl font-bold tracking-tight break-keep sm:text-4xl"
        >
          이렇게 간단해요
        </Reveal>

        <RevealGroup
          ref={ref}
          className="relative mt-12 grid gap-6 md:grid-cols-3"
        >
          {/* 데스크톱 가로 연결선 — reveal 시 좌→우로 그려짐 */}
          <div
            aria-hidden="true"
            data-drawn={drawn}
            className="step-connector absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-(--color-primary)/30 md:block"
          />
          {/* 모바일 세로 연결선 — reveal 시 위→아래로 그려짐 */}
          <div
            aria-hidden="true"
            data-drawn={drawn}
            className="step-connector-v absolute left-1/2 top-7 bottom-7 -translate-x-1/2 border-l-2 border-dashed border-(--color-primary)/30 md:hidden"
          />
          {STEPS.map((step, index) => (
            <Reveal
              key={step.num}
              className="relative flex flex-col items-center rounded-(--radius-block) bg-(--color-card) p-7 text-center shadow-(--shadow-card)"
            >
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white ${
                  index === STEPS.length - 1
                    ? 'coral-pulse bg-(--color-primary)'
                    : 'bg-(--color-primary)'
                }`}
              >
                {step.num}
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight break-keep">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed break-keep text-(--color-ink-soft)">
                {step.body}
              </p>
            </Reveal>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
