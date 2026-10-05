/**
 * 사이트 전역 상수.
 * 도메인 확정 전에는 NEXT_PUBLIC_SITE_URL 환경변수로 덮어쓸 수 있다(기본 memsum.app).
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://memsum.app';

/** Google Play 스토어 상세 페이지(2026-07-03 정식 출시됨). 패키지 app.memsum. */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=app.memsum';

export const SITE_NAME = 'Memsum';
export const SUPPORT_EMAIL = 'byunginhb@gmail.com';
export const OPERATOR_NAME = 'Byungin Song';

/** Google Play 개발자 페이지 — Play 등록 개발자명은 "Song Byungin"(성·이름 순). 구조화 데이터 sameAs용. */
export const PLAY_DEVELOPER_URL =
  'https://play.google.com/store/apps/developer?id=Song+Byungin';

/** Search Console 소유 확인 토큰 — 공개 노출되는 값이라 하드코딩해도 안전. */
export const GOOGLE_SITE_VERIFICATION =
  'ZExuZuVV_F2gY39RAdQoDeu3AYF26yYg81-mjzeWJwM';

/**
 * 네이버 서치어드바이저 소유 확인 토큰.
 * why 빈 값: 아직 사이트 등록 전이라 실제 토큰이 없다. 서치어드바이저에서 "HTML 태그" 방식으로
 * 받은 content 값을 넣으면 layout.tsx가 `naver-site-verification` 메타를 자동으로 출력한다.
 */
export const NAVER_SITE_VERIFICATION = '';
