// src/features/home/types.ts
//
// Memsum 홈 화면 공유 계약.
// "주제별 묶음"(카테고리 집계)·"이번 주 캡처"(주간 통계)가 단일 진실로 사용한다.
//
// WeeklyStats는 stats.ts(데이터 레이어)에서 정의·소유하므로 여기서 재정의하지 않고
// re-export만 한다(중복 타입 정의 방지). CategoryKey는 categories.ts(SSOT)에서 가져온다.

import type { CategoryKey } from '@/lib/categories';
import type { WeeklyStats } from '@/lib/stats';

/**
 * 홈 "주제별 묶음" 한 항목: 카테고리와 그 카테고리에 속한 캡처 수.
 */
export type CategoryGroup = {
  category: CategoryKey;
  count: number;
};

// stats.ts의 WeeklyStats를 홈 계약으로도 노출(홈 위젯이 lib/stats를 직접 모르게).
export type { WeeklyStats };
