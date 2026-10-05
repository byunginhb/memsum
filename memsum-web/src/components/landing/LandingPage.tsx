import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getLandingCopy, type Lang } from '@/lib/landing-copy';
import { OPERATOR_NAME, SITE_NAME, SITE_URL } from '@/lib/site';

import { AppScreens } from './AppScreens';
import { AudienceSection } from './AudienceSection';
import { CompareTable } from './CompareTable';
import { Faq } from './Faq';
import { FeatureShowcase } from './FeatureShowcase';
import { FinalCta } from './FinalCta';
import { FounderStory } from './FounderStory';
import { Hero } from './Hero';
import { MobileCtaBar } from './MobileCtaBar';
import { NotifyProvider } from './NotifyProvider';
import { ParcelSection } from './ParcelSection';
import { ProblemSection } from './ProblemSection';
import { StepFlow } from './StepFlow';
import { Testimonials } from './Testimonials';

/**
 * 랜딩 페이지 조립 — 로케일(`lang`) 하나로 ko/en 전체 화면을 렌더한다.
 * 디자인은 "형광펜 & 코발트"(docs/design/redesign-2026-10.md), 카피는 사전에서 원문 그대로 주입한다.
 * 연출은 히어로 스캔 한 번뿐이고 나머지 섹션은 타이포·구분선·여백으로 조용히 둔다.
 * `/`(ko)·`/en`(en) 라우트가 이 컴포넌트를 각각의 lang으로 호출한다.
 */
export function LandingPage({ lang }: { lang: Lang }) {
  const copy = getLandingCopy(lang);

  // JSON-LD — 로케일별 description으로 검색 노출 최적화.
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: SITE_NAME,
    operatingSystem: 'iOS, Android',
    applicationCategory: 'ProductivityApplication',
    description: copy.meta.appJsonLdDescription,
    url: copy.isKorean ? SITE_URL : `${SITE_URL}/en`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    author: { '@type': 'Person', name: OPERATOR_NAME },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: copy.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <NotifyProvider copy={copy}>
      <SiteHeader lang={lang} copy={copy} />
      {/* 영어 페이지는 lang="en"으로 한국어 줄바꿈 규칙(keep-all)과 발음 정보를 끊는다. */}
      <main lang={lang}>
        <Hero copy={copy} />
        <ProblemSection copy={copy} />
        <StepFlow copy={copy} />
        <FeatureShowcase copy={copy} />
        <AppScreens copy={copy} />
        {copy.isKorean && <ParcelSection copy={copy} />}
        <AudienceSection copy={copy} />
        <FounderStory copy={copy} />
        <CompareTable copy={copy} />
        <Testimonials copy={copy} />
        <Faq copy={copy} />
        <FinalCta copy={copy} />
      </main>
      <SiteFooter lang={lang} copy={copy} />
      <MobileCtaBar copy={copy} />
      <script
        type="application/ld+json"
        // 구조화 데이터는 우리가 만든 정적 객체라 안전하다.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </NotifyProvider>
  );
}
