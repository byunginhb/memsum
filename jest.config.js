// Jest 설정 — 출시 전 최소 안전망(순수 유닛 테스트 우선).
// i18n ko/en 패리티·카테고리 정규화처럼 회귀가 잦았던 순수 함수부터 덮는다.
// RN 컴포넌트 렌더 테스트(@testing-library/react-native)는 후속 단계.
module.exports = {
  preset: 'jest-expo',
  // tsconfig paths(@/* → src/*)를 jest에서도 해석.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
