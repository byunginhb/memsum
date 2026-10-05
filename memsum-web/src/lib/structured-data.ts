import { getLandingCopy, type Lang } from '@/lib/landing-copy';
import { screenSrc, type ScreenKey } from '@/lib/screens';
import { absoluteUrl } from '@/lib/seo';
import {
  OPERATOR_NAME,
  PLAY_DEVELOPER_URL,
  PLAY_STORE_URL,
  SITE_NAME,
  SITE_URL,
} from '@/lib/site';

/**
 * 랜딩 구조화 데이터(JSON-LD) — schema.org `@graph` 하나로 사이트·개발자·앱·FAQ를 묶는다.
 *
 * 원칙
 * - 문구는 전부 landing-copy.ts에서 읽는다. 여기서 새 문장을 만들지 않는다.
 * - 실제로 있는 사실만 넣는다. 평점(aggregateRating)·리뷰는 없으므로 넣지 않는다
 *   (그래서 Google 앱 리치 결과 자격은 아직 없다 — Google은 평점 또는 리뷰를 필수로 요구).
 * - iOS는 미출시라 operatingSystem은 ANDROID만.
 */

const LANDING_PATH: Record<Lang, string> = { ko: '/', en: '/en' };

/** Play 무료 앱 — 표시 통화만 로케일에 맞춘다(가격은 0). */
const PRICE_CURRENCY: Record<Lang, string> = { ko: 'KRW', en: 'USD' };

/**
 * Google 지원 목록(software-app 문서)에 'ProductivityApplication'이 없어
 * 가장 가까운 지원 값을 쓴다. Play 카테고리는 '생산성'.
 */
const APP_CATEGORY = 'UtilitiesApplication';

const SCREENSHOT_KEYS: readonly ScreenKey[] = ['home', 'result', 'search', 'report'];

const ID = {
  website: `${SITE_URL}/#website`,
  founder: `${SITE_URL}/#founder`,
  app: `${SITE_URL}/#app`,
} as const;

type JsonLd = Record<string, unknown>;

export function buildLandingJsonLd(lang: Lang): JsonLd {
  const copy = getLandingCopy(lang);
  const pageUrl = absoluteUrl(LANDING_PATH[lang]);

  const website: JsonLd = {
    '@type': 'WebSite',
    '@id': ID.website,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['ko', 'en'],
    publisher: { '@id': ID.founder },
  };

  // 1인 개발 — 법인이 없으므로 Organization 대신 Person(실제 운영자)으로 둔다.
  const founder: JsonLd = {
    '@type': 'Person',
    '@id': ID.founder,
    name: OPERATOR_NAME,
    url: SITE_URL,
    sameAs: [PLAY_DEVELOPER_URL],
  };

  const app: JsonLd = {
    '@type': 'MobileApplication',
    '@id': ID.app,
    name: SITE_NAME,
    url: pageUrl,
    description: copy.meta.appJsonLdDescription,
    inLanguage: lang,
    operatingSystem: 'ANDROID',
    applicationCategory: APP_CATEGORY,
    image: absoluteUrl('/icon.png'),
    screenshot: SCREENSHOT_KEYS.map((key) => absoluteUrl(screenSrc(lang, key))),
    downloadUrl: PLAY_STORE_URL,
    installUrl: PLAY_STORE_URL,
    sameAs: [PLAY_STORE_URL],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: PRICE_CURRENCY[lang],
      availability: 'https://schema.org/InStock',
      url: PLAY_STORE_URL,
    },
    author: { '@id': ID.founder },
    publisher: { '@id': ID.founder },
  };

  const webPage: JsonLd = {
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: copy.meta.titleDefault,
    description: copy.meta.description,
    inLanguage: lang,
    isPartOf: { '@id': ID.website },
    about: { '@id': ID.app },
  };

  // 화면의 FAQ 질문·답 그대로(ctaLabel 같은 버튼 문구는 답이 아니므로 제외).
  const faq: JsonLd = {
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    inLanguage: lang,
    isPartOf: { '@id': `${pageUrl}#webpage` },
    mainEntity: copy.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [website, founder, app, webPage, faq],
  };
}

/**
 * `<script>` 안에 넣을 문자열. `<`를 이스케이프해 문구에 `</script>`가 섞여도 태그가 끊기지 않게 한다.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
