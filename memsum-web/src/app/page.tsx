import Image from 'next/image';

import { DotsLogo } from '@/components/DotsLogo';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from '@/lib/site';

const FEATURES = [
  {
    title: '찍으면 알아서 정리',
    body: '스크린샷을 감지해 글자를 읽고(OCR), AI가 제목·요약을 만들어 차곡차곡 보관해요. 평소엔 완전히 조용해요 — 알림으로 귀찮게 하지 않아요.',
  },
  {
    title: '날짜가 보이면 캘린더로',
    body: '공연 예매, 병원 예약, 밋업 안내… 캡처 속 일정을 찾아내 제목과 시간으로 구글 캘린더에 등록해 둬요.',
  },
  {
    title: '일요일 저녁, 5줄 리포트',
    body: '일주일에 딱 한 번. 이번 주 캡처 중 다시 봐야 할 5개를 골라 짜잔 하고 알려드려요.',
  },
] as const;

const STEPS = [
  { step: '1', title: '캡처', body: '평소처럼 스크린샷을 찍기만 하세요.' },
  { step: '2', title: 'AI 정리', body: '글자를 읽고 제목·요약·일정을 추출해요.' },
  { step: '3', title: '짜잔', body: '일요일 저녁, 5줄 리포트로 돌아와요.' },
] as const;

/** JSON-LD — 모바일 앱 구조화 데이터(검색 노출용). */
const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: SITE_NAME,
  operatingSystem: 'iOS, Android',
  applicationCategory: 'ProductivityApplication',
  description:
    '스크린샷을 자동으로 정리하고 일정을 캘린더에 등록하고 주간 리포트로 알려주는 앱.',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-5">
        {/* 히어로 */}
        <section className="flex flex-col items-center pt-14 pb-16 text-center">
          <DotsLogo size={72} />
          <h1 className="mt-8 text-4xl leading-snug font-bold tracking-tight break-keep sm:text-5xl sm:leading-snug">
            스크린샷, 찍기만 하세요.
            <br />
            정리는 {SITE_NAME}이 할게요.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed break-keep text-(--color-ink-soft)">
            사진첩에 잠든 스크린샷 1,000장. 글자를 읽고, 요약하고, 일정은
            캘린더에 넣어두었다가 일요일 저녁 5줄로 알려드려요.
          </p>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--color-primary-soft) px-4 py-2 text-sm font-semibold text-(--color-primary)">
            iOS · Android 출시 준비 중
          </p>
        </section>

        {/* 스크린샷 쇼케이스 */}
        <section className="flex justify-center gap-5">
          <div className="w-[44%] max-w-55 overflow-hidden rounded-3xl border border-(--color-line) shadow-xl shadow-black/5">
            <Image
              src="/shots/home.png"
              alt="Memsum 홈 화면 — 이번 주 캡처가 카드로 정리된 모습"
              width={1080}
              height={2400}
              priority
            />
          </div>
          <div className="mt-10 w-[44%] max-w-55 overflow-hidden rounded-3xl border border-(--color-line) shadow-xl shadow-black/5">
            <Image
              src="/shots/report.png"
              alt="Memsum 주간 리포트 화면 — 이번 주 핵심 5개 랭킹"
              width={1080}
              height={2400}
            />
          </div>
        </section>

        {/* 가치 제안 3가지 */}
        <section className="mt-20 grid gap-5 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-(--color-line) bg-(--color-card) p-6"
            >
              <h2 className="text-base font-bold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-(--color-ink-soft)">
                {feature.body}
              </p>
            </div>
          ))}
        </section>

        {/* 동작 방식 */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold tracking-tight">
            조용히 일하고, 일주일에 한 번만 말 걸어요
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((item) => (
              <li
                key={item.step}
                className="rounded-2xl bg-(--color-primary-soft) p-6 text-center"
              >
                <span className="text-sm font-bold text-(--color-primary)">
                  STEP {item.step}
                </span>
                <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                <p className="mt-1 text-sm text-(--color-ink-soft)">{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 문의 */}
        <section className="mt-20 rounded-2xl border border-(--color-line) bg-(--color-card) p-8 text-center">
          <h2 className="text-xl font-bold">출시 소식이 궁금하신가요?</h2>
          <p className="mt-2 text-sm text-(--color-ink-soft)">
            문의나 제안은 언제든 환영해요.
          </p>
          <a
            className="mt-4 inline-block rounded-full bg-(--color-primary) px-6 py-3 text-sm font-semibold text-white"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            이메일 보내기
          </a>
        </section>
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        // 구조화 데이터는 우리가 만든 정적 객체라 안전하다.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
    </>
  );
}
