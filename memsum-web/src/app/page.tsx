import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { CompareTable } from '@/components/landing/CompareTable';
import { Faq, FAQ_ITEMS } from '@/components/landing/Faq';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { FinalCta } from '@/components/landing/FinalCta';
import { Hero } from '@/components/landing/Hero';
import { MobileCtaBar } from '@/components/landing/MobileCtaBar';
import { NotifyProvider } from '@/components/landing/NotifyProvider';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { ScrollProgress } from '@/components/landing/ScrollProgress';
import { StepFlow } from '@/components/landing/StepFlow';
import { SITE_NAME, SITE_URL } from '@/lib/site';

/** JSON-LD — 모바일 앱 구조화 데이터(검색 노출용). */
const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: SITE_NAME,
  operatingSystem: 'iOS, Android',
  applicationCategory: 'ProductivityApplication',
  description:
    '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
  url: SITE_URL,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
};

/** JSON-LD — FAQ 리치결과(02 §7 Q/A). */
const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
};

export default function HomePage() {
  return (
    <NotifyProvider>
      <ScrollProgress />
      <SiteHeader />
      <main>
        <Hero />
        <ProblemSection />
        <StepFlow />
        <FeatureShowcase />
        <AudienceSection />
        <CompareTable />
        <Faq />
        <FinalCta />
      </main>
      <SiteFooter />
      <MobileCtaBar />
      <script
        type="application/ld+json"
        // 구조화 데이터는 우리가 만든 정적 객체라 안전하다.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
    </NotifyProvider>
  );
}
