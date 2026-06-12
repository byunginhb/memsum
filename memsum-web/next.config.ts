import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 정책·랜딩 페이지는 전부 정적 — 빌드 시 프리렌더된다.
  reactStrictMode: true,
};

export default nextConfig;
