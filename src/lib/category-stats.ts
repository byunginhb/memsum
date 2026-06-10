// src/lib/category-stats.ts
//
// Memsum 홈 "주제별 묶음"(카테고리 집계) 데이터 레이어.
// 카테고리별 정확한 캡처 수를 COUNT 쿼리로 집계한다.
//
// 왜 카테고리별 COUNT인가: supabase-js(PostgREST)는 GROUP BY 집계를 직접 지원하지
// 않는다. 표본(최근 N개) 집계는 캡처가 많은 사용자(페르소나: 1,847장)에서 실제
// 수와 어긋나 "N장" 표기가 거짓이 된다. 카테고리는 6종뿐이라 head:true·count:exact
// 쿼리 6개를 병렬로 던지면 행을 전송하지 않고 정확한 수를 얻는다(가벼움).
//
// 조회는 익명 세션 + RLS("own captures": auth.uid() = user_id)에 의존한다.
// 세션이 없으면 RLS가 0을 돌려주므로 빈 배열이 정상 동작(에러 아님)이다.

import type { CategoryGroup } from '@/features/home/types';
import { CATEGORY_KEYS } from '@/lib/categories';
import { getSupabase } from '@/lib/supabase';

/**
 * 카테고리별 정확한 캡처 수를 집계한다.
 *
 * - 6개 카테고리 각각에 head:true·count:'exact' 쿼리(행 미전송, 카운트만).
 * - count 0인 카테고리는 결과에서 제외, count desc 정렬(많은 묶음이 위로).
 * - 불변성: map/filter/sort로 새 배열만 생성.
 * - 실패 시 throw(호출 측 훅에서 graceful 처리).
 */
export async function listCategoryGroups(): Promise<CategoryGroup[]> {
  const supabase = getSupabase();

  try {
    const counts = await Promise.all(
      CATEGORY_KEYS.map(async (category) => {
        const { count, error } = await supabase
          .from('captures')
          .select('*', { count: 'exact', head: true })
          .eq('category', category);
        if (error) {
          throw new Error(`주제별 묶음 조회 실패(${category}): ${error.message}`);
        }
        return { category, count: count ?? 0 };
      }),
    );

    return counts
      .filter((group) => group.count > 0)
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '주제별 묶음을 불러오는 중 알 수 없는 오류가 발생했습니다.';
    console.error('[category-stats] listCategoryGroups 실패:', message);
    throw new Error(message);
  }
}
