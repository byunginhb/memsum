import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 정책·랜딩 페이지는 전부 정적 — 빌드 시 프리렌더된다.
  reactStrictMode: true,
  // eslint-config-next 미설치 상태에서 @next/next 룰 참조 주석이 ESLint 9 에러를 유발하므로
  // 빌드 단계 린트를 비활성화. ESLint 별도 실행(pnpm lint)으로 확인한다.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
