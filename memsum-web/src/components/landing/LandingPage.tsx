import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { getLandingCopy, type Lang } from '@/lib/landing-copy';
import { SITE_NAME, SITE_URL } from '@/lib/site';

import { AudienceSection } from './AudienceSection';
import { CompareTable } from './CompareTable';
import { Faq } from './Faq';
import { FeatureShowcase } from './FeatureShowcase';
import { FinalCta } from './FinalCta';
import { Hero } from './Hero';
import { MobileCtaBar } from './MobileCtaBar';
import { NotifyProvider } from './NotifyProvider';
import { ParcelSection } from './ParcelSection';
import { ProblemSection } from './ProblemSection';
import { ScrollProgress } from './ScrollProgress';
import { StepFlow } from './StepFlow';

/**
 * 랜딩 페이지 조립 — 로케일(`lang`) 하나로 ko/en 전체 화면을 렌더한다.
 * 스크롤 애니메이션·reduced-motion·디자인은 그대로, 카피만 사전에서 주입한다.
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
      <ScrollProgress />
      <SiteHeader lang={lang} copy={copy} />
      <main>
        <Hero copy={copy} />
        <ProblemSection copy={copy} />
        <StepFlow copy={copy} />
        <FeatureShowcase copy={copy} />
        {copy.isKorean && <ParcelSection copy={copy} />}
        <AudienceSection copy={copy} />
        <CompareTable copy={copy} />
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
