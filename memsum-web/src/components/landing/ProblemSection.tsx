import { CountUp } from './CountUp';
import { Reveal } from './Reveal';

/**
 * S2 문제 공감 — "이거 내 얘기다" 몰입.
 * 카운터(1,847장)·인용구·코랄 밑줄 강조. 카피는 02 §2 원문.
 */
export function ProblemSection() {
  return (
    <section
      aria-labelledby="problem-title"
      className="mx-auto w-full max-w-5xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <Reveal
        as="h2"
        id="problem-title"
        className="text-center text-2xl font-bold tracking-tight break-keep sm:text-4xl"
      >
        사진첩 &lsquo;스크린샷&rsquo; 폴더, 몇 장이세요?
      </Reveal>

      <Reveal
        as="p"
        delay={80}
        className="mx-auto mt-5 max-w-2xl text-center text-base leading-relaxed break-keep text-(--color-ink-soft) sm:text-lg"
      >
        영수증, 약속 메시지, 할인 쿠폰, 나중에 읽으려던 글…
        <br />
        계속 찍는데, 다시 보는 일은 거의 없죠.
      </Reveal>

      {/* 카운터 강조 블록 — 1,847은 "이런 경우도 있다"는 예시 수치(문제 제기 장치).
          [추정] 라벨: 외부 방문자에게 맥락 없는 페르소나 실명·"평균" 단정을 피하고
          공감형·비단정 표현으로 둔다(02 원문엔 라벨 없음, 톤은 02/카피뱅크와 일치). */}
      <Reveal
        variant="scale-in"
        delay={120}
        className="mx-auto mt-12 max-w-md rounded-(--radius-block) border border-(--color-line) bg-(--color-card) p-8 text-center shadow-(--shadow-card)"
      >
        {/* [추정] 비단정 도입부 — 특정인/평균 주장 없이 예시로 제시. */}
        <p className="text-sm font-medium break-keep text-(--color-ink-soft)">
          어떤 분의 폴더엔, 이만큼.
        </p>
        <p className="mt-2 flex items-baseline justify-center gap-1">
          <CountUp
            to={1847}
            className="text-6xl font-extrabold tracking-tight text-(--color-primary) sm:text-7xl"
          />
          <span className="text-3xl font-bold text-(--color-ink) sm:text-4xl">
            장
          </span>
        </p>
        {/* [추정] 공감형 마무리 — 02 톤("다시 보는 일은 거의 없죠")과 일치. */}
        <p className="mt-2 text-sm break-keep text-(--color-ink-faint)">
          그런데 다시 본 건 거의 없어요.
        </p>
      </Reveal>

      <Reveal
        variant="blur-in"
        delay={200}
        className="mx-auto mt-14 max-w-2xl"
      >
        <blockquote className="border-l-4 border-(--color-accent) pl-5">
          <p className="text-xl font-bold tracking-tight break-keep sm:text-2xl">
            &ldquo;내가 이걸 왜 다 찍었지?&rdquo;
          </p>
          <p className="mt-3 text-base leading-relaxed break-keep text-(--color-ink-soft)">
            정리하려고 앨범 열었다가, 한 시간 뒤 그냥 닫은 적 있으시죠.
          </p>
        </blockquote>
      </Reveal>

      <Reveal
        as="p"
        delay={80}
        className="mx-auto mt-10 max-w-2xl text-center text-base leading-relaxed break-keep text-(--color-ink-soft) sm:text-lg"
      >
        노션도 메모 앱도 써봤지만 한 달 만에 방치.
      </Reveal>

      <Reveal
        delay={120}
        className="mx-auto mt-6 max-w-2xl text-center"
      >
        <p className="text-lg font-bold tracking-tight break-keep sm:text-xl">
          <span className="coral-underline">
            문제는 당신이 아니에요. 정리를 시키는 도구가 문제였어요.
          </span>
        </p>
      </Reveal>
    </section>
  );
}
