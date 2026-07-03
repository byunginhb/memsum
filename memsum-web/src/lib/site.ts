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

/** Search Console 소유 확인 토큰 — 공개 노출되는 값이라 하드코딩해도 안전. */
export const GOOGLE_SITE_VERIFICATION =
  'ZExuZuVV_F2gY39RAdQoDeu3AYF26yYg81-mjzeWJwM';
