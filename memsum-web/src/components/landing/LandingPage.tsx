import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getLandingCopy, type Lang } from '@/lib/landing-copy';

import { AudienceSection } from './AudienceSection';
import { CompareTable } from './CompareTable';
import { Faq } from './Faq';
import { FinalCta } from './FinalCta';
import { FounderStory } from './FounderStory';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { MobileCtaBar } from './MobileCtaBar';
import { NotifyProvider } from './NotifyProvider';
import { ProblemSection } from './ProblemSection';
import { ScrollFx } from './ScrollFx';
import { Testimonials } from './Testimonials';

/**
 * 랜딩 페이지 조립 — 로케일(`lang`) 하나로 ko/en 전체 화면을 렌더한다.
 * 디자인은 "형광펜 & 코발트"(docs/design/redesign-2026-10.md), 카피는 사전에서 원문 그대로 주입한다.
 * 히어로 스캔으로 시작해, '작동 순서' 장면(스크롤 고정 화면)을 지나 잉크색 마지막 권유로 저물 때까지
 * 스크롤 하나로 이어지게 연출한다(ScrollFx). JS가 없거나 모션 줄이기면 모든 연출은 최종 상태로 보인다.
 * `/`(ko)·`/en`(en) 라우트가 이 컴포넌트를 각각의 lang으로 호출한다.
 */
export function LandingPage({ lang }: { lang: Lang }) {
  const copy = getLandingCopy(lang);

  // 구조화 데이터(JSON-LD)는 라우트(page.tsx)에서 src/lib/structured-data.ts로 렌더한다.

  return (
    <NotifyProvider copy={copy}>
      <SiteHeader lang={lang} copy={copy} />
      {/* 영어 페이지는 lang="en"으로 한국어 줄바꿈 규칙(keep-all)과 발음 정보를 끊는다. */}
      <main lang={lang}>
        <Hero copy={copy} />
        <ProblemSection copy={copy} />
        <HowItWorks copy={copy} />
        <AudienceSection copy={copy} />
        <FounderStory copy={copy} />
        <CompareTable copy={copy} />
        <Testimonials copy={copy} />
        <Faq copy={copy} />
        <FinalCta copy={copy} />
      </main>
      <SiteFooter lang={lang} copy={copy} tone="ink" />
      <ScrollFx />
      <MobileCtaBar copy={copy} />
    </NotifyProvider>
  );
}
