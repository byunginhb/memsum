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
 */
export function middleware(request: NextRequest) {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value;

  const acceptLanguage = request.headers.get('accept-language') ?? '';
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
