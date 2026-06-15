import { LandingPage } from '@/components/landing/LandingPage';

/** 한국어 랜딩(`/`). 메타데이터는 layout.tsx의 한국어 기본값을 사용. */
export default function HomePage() {
  return <LandingPage lang="ko" />;
}
