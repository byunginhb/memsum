import { useCallback, useEffect, useRef, useState } from 'react';

import { listCaptures } from '@/lib/captures';
import { useCaptureStore } from '@/stores/capture-store';

import type { CaptureListItem } from '@/features/captures/types';

/**
 * 캡처 목록 훅 (W4-A).
 *
 * 마운트 시 첫 페이지를 로드하고, refresh(처음부터)·loadMore(다음 커서) 를 제공한다.
 * capture-store의 savedCount(새 캡처 저장 시 증가)를 구독해, 값이 바뀌면 자동 새로고침한다.
 * 동시 호출이 겹치면 진행 중 요청을 ref로 가드해 중복 fetch를 막는다.
 */
export type UseCapturesResult = {
  items: CaptureListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

export function useCaptures(): UseCapturesResult {
  const [items, setItems] = useState<CaptureListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 다음 페이지 커서. null이면 더 없음(끝) 또는 아직 미로드.
  const cursorRef = useRef<string | null>(null);
  // 진행 중 요청 가드. true면 새 요청을 무시해 중복 fetch를 막는다.
  const inFlightRef = useRef<boolean>(false);
  // 언마운트 후 setState 방지.
  const mountedRef = useRef<boolean>(true);

  // 새 캡처 저장 시그널. 변하면 처음부터 새로고침한다.
  const savedCount = useCaptureStore((state) => state.savedCount);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const page = await listCaptures({ cursor: null });
      if (!mountedRef.current) return;
      // 불변성: 새 배열로 교체.
      setItems(page.items);
      cursorRef.current = page.nextCursor;
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : '목록을 불러오지 못했습니다.';
      setError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  const loadMore = useCallback(async (): Promise<void> => {
    // 커서가 없으면 더 가져올 페이지가 없다.
    if (inFlightRef.current || cursorRef.current === null) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const page = await listCaptures({ cursor: cursorRef.current });
      if (!mountedRef.current) return;
      // 불변성: 기존 + 다음 페이지를 새 배열로.
      setItems((prev) => [...prev, ...page.items]);
      cursorRef.current = page.nextCursor;
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : '추가 항목을 불러오지 못했습니다.';
      setError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // 마운트 + savedCount 변화 시 처음부터 새로고침.
  useEffect(() => {
    void refresh();
  }, [refresh, savedCount]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { items, isLoading, error, refresh, loadMore };
}
