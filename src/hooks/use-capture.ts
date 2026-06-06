import { useEffect, useRef, useState } from 'react';

import { getCapture } from '@/lib/captures';

import type { CaptureListItem } from '@/features/captures/types';

/**
 * 단건 캡처 상세 훅 (W4-A).
 *
 * id가 바뀔 때마다 getCapture로 단건을 로드한다. 존재하지 않으면 item=null.
 * id가 바뀌면 직전 결과를 초기화하고, 언마운트/재요청 시 stale 응답을 무시한다.
 */
export type UseCaptureResult = {
  item: CaptureListItem | null;
  isLoading: boolean;
  error: string | null;
};

export function useCapture(id: string | null | undefined): UseCaptureResult {
  const [item, setItem] = useState<CaptureListItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 가장 최근 요청 id. 응답이 돌아왔을 때 이 값과 다르면 stale로 버린다.
  const latestIdRef = useRef<string | null>(null);

  useEffect(() => {
    // id가 없으면 빈 상태로 즉시 정리.
    if (!id) {
      setItem(null);
      setError(null);
      setIsLoading(false);
      latestIdRef.current = null;
      return;
    }

    latestIdRef.current = id;
    setIsLoading(true);
    setError(null);
    // id 전환 시 이전 항목이 잠깐 보이지 않도록 초기화.
    setItem(null);

    let active = true;

    const load = async (): Promise<void> => {
      try {
        const result = await getCapture(id);
        // stale 가드: 언마운트됐거나 그 사이 id가 바뀌었으면 무시.
        if (!active || latestIdRef.current !== id) return;
        setItem(result);
      } catch (err) {
        if (!active || latestIdRef.current !== id) return;
        const message =
          err instanceof Error ? err.message : '캡처를 불러오지 못했습니다.';
        setError(message);
      } finally {
        if (active && latestIdRef.current === id) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [id]);

  return { item, isLoading, error };
}
