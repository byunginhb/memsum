import { ChevronDown } from 'lucide-react';

import { Reveal, RevealGroup } from './Reveal';

type QA = {
  q: string;
  a: string;
};

/** 02 §7 Q/A 기반. "가입 없음/광고 없음" 클레임은 제거하고 무료 이용 프레이밍으로 조정(향후 유료화 여지 보존). */
export const FAQ_ITEMS: readonly QA[] = [
  {
    q: '제 스크린샷을 학습에 쓰나요?',
    a: '아니요. 캡처는 당신 것을 정리하는 데만 써요.',
  },
  {
    q: '무료인가요?',
    a: '네, 지금은 무료로 모든 기능을 써볼 수 있어요. 부담 없이 시작해보세요.',
  },
  {
    q: '캘린더 전체를 읽나요?',
    a: "아니요. 캘린더 권한은 '이벤트 추가'에만 써요. 연결 토큰은 기기 안에만 보관합니다.",
  },
  {
    q: 'OCR이 한국어도 되나요?',
    a: '네. 한국어·영어 텍스트를 추출하고, 오타·줄바꿈을 다듬어 정리해요.',
  },
  {
    q: '어떤 기기에서 되나요?',
    a: 'iOS·Android 모두. (출시 단계는 개발기획서 참조)',
  },
] as const;

/**
 * S7 FAQ — 마지막 불안 제거.
 * <details>/<summary> 네이티브 아코디언(JS 없이 동작·SSR·키보드 무료) + CSS 높이 트랜지션.
 * 첫 항목(학습에 쓰나요)만 기본 열림.
 */
export function Faq() {
  return (
    <section
      aria-labelledby="faq-title"
      className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-6 sm:py-24"
    >
      <Reveal
        as="h2"
        id="faq-title"
        className="text-center text-2xl font-bold tracking-tight break-keep sm:text-4xl"
      >
        자주 묻는 질문
      </Reveal>

      <RevealGroup stagger={60} className="mt-10 grid gap-3">
        {FAQ_ITEMS.map((item, index) => (
          <Reveal key={item.q}>
            <details
              className="faq-item rounded-(--radius-block) border border-(--color-line) bg-(--color-card) shadow-(--shadow-card)"
              open={index === 0}
            >
              <summary className="flex items-center justify-between gap-4 px-6 py-5 text-left text-base font-bold tracking-tight break-keep sm:text-lg">
                <span>{item.q}</span>
                <ChevronDown
                  size={20}
                  aria-hidden="true"
                  className="faq-chevron shrink-0 text-(--color-primary)"
                />
              </summary>
              <div className="faq-answer">
                <div>
                  <p className="px-6 pb-5 text-base leading-relaxed break-keep text-(--color-ink-soft)">
                    {item.a}
                  </p>
                </div>
              </div>
            </details>
          </Reveal>
        ))}
      </RevealGroup>
    </section>
  );
}
