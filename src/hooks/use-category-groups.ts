import { useCallback, useEffect, useRef, useState } from 'react';

import { listCategoryGroups } from '@/lib/category-stats';
import { useCaptureStore } from '@/stores/capture-store';

import type { CategoryGroup } from '@/features/home/types';

/**
 * 홈 "주제별 묶음"(카테고리 집계) 훅.
 *
 * 마운트 시 listCategoryGroups를 1회 조회하고 refresh()로 다시 불러온다.
 * capture-store의 savedCount(새 캡처 저장 시 증가)를 구독해, 값이 바뀌면 자동
 * 새로고침한다(use-captures·use-weekly-stats와 동일한 신선도 전략).
 * 진행 중 요청을 ref로 가드해 중복 fetch를 막고, 언마운트 후 setState를 방지한다.
 */
export type UseCategoryGroupsResult = {
  groups: CategoryGroup[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useCategoryGroups(): UseCategoryGroupsResult {
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 진행 중 요청 가드. true면 새 요청을 무시해 중복 fetch를 막는다.
  const inFlightRef = useRef<boolean>(false);
  // 언마운트 후 setState 방지.
  const mountedRef = useRef<boolean>(true);

  // 새 캡처 저장 시그널. 변하면 묶음을 다시 집계한다.
  const savedCount = useCaptureStore((state) => state.savedCount);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const next = await listCategoryGroups();
      if (!mountedRef.current) return;
      // 불변성: 새 배열로 교체.
      setGroups(next);
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : '주제별 묶음을 불러오지 못했습니다.';
      setError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // 마운트 + savedCount 변화 시 새로고침. setIsLoading(true)가 화면 마운트 직전에
  // 동기로 호출되면 경고가 날 수 있어 다음 틱으로 미룬다(use-captures 선례).
  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh, savedCount]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { groups, isLoading, error, refresh };
}
