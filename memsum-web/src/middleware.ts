import { NextResponse, type NextRequest } from 'next/server';

/**
 * 로케일 자동 노출 미들웨어 — `/` 경로에만 적용(matcher 참조).
 *
 * 한국(한국어 시스템언어 또는 국가 KR) → 한국어 `/` 유지,
 * 그 외 전부 → 영어 `/en`으로 redirect.
 *
 * 판정 우선순위:
 *  1) NEXT_LOCALE 쿠키(수동 토글 선택) — 최우선 존중
 *  2) Accept-Language(시스템 언어)에 ko 포함 여부
 *  3) geo 헤더 x-vercel-ip-country === 'KR'
 *
 * 시스템 언어를 국가보다 우선한다(요구사항).
 *
 * 검색엔진 예외 — 아래 경우는 리다이렉트하지 않고 `/`(한국어, hreflang x-default)를 그대로 준다.
 *  - 검색·AI 크롤러 User-Agent
 *  - Accept-Language 헤더가 아예 없는 요청
 * why: Googlebot은 주로 미국 IP에서 Accept-Language 없이 크롤한다. 예외가 없으면 `/`가 항상
 * 307 → `/en`으로 보여 한국어 페이지가 색인되지 않는다. Google 다국어 가이드도 언어 추정 자동
 * 리다이렉트 대신 hreflang으로 각 언어 URL을 알리라고 권한다. 크롤러가 받는 `/`는 한국 사용자가
 * 보는 것과 똑같은 페이지라 위장(cloaking)이 아니다. 실제 브라우저는 항상 Accept-Language를 보내므로
 * 사용자 동작은 바뀌지 않는다.
 */
const CRAWLER_UA =
  /bot|crawler|spider|crawling|slurp|yeti|daumoa|facebookexternalhit|embedly|preview|google-inspectiontool|lighthouse/i;

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') ?? '';
  const rawAcceptLanguage = request.headers.get('accept-language');
  if (CRAWLER_UA.test(userAgent) || !rawAcceptLanguage) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get('NEXT_LOCALE')?.value;

  const acceptLanguage = rawAcceptLanguage;
  // "ko", "ko-KR", "ko_KR" 등 한국어 태그를 토큰 경계로 감지.
  const acceptLanguageHasKo = /(^|[,\s])ko\b/i.test(acceptLanguage);

  const country = request.headers.get('x-vercel-ip-country');

  const isKorean =
    cookie === 'ko' ||
    (cookie !== 'en' && (acceptLanguageHasKo || country === 'KR'));

  // 한국어면 `/` 그대로 통과, 아니면 `/en`으로 보낸다.
  if (!isKorean) {
    const url = request.nextUrl.clone();
    url.pathname = '/en';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * 루트 경로에만 개입. 정적 자산·api·`/en`·법적 페이지 등은 건드리지 않는다.
 */
export const config = {
  matcher: ['/'],
};
