import { useEffect, useRef, useState } from 'react';

import { searchCaptures } from '@/lib/captures';

import type { CaptureListItem } from '@/features/captures/types';

/** 입력 디바운스(ms). 타이핑 중 매 글자마다 검색하지 않도록 지연한다. */
const DEBOUNCE_MS = 300;

/**
 * 캡처 검색 훅 (W4-A).
 *
 * query를 DEBOUNCE_MS만큼 디바운스해 searchCaptures를 호출한다.
 * 빈/공백 query면 results=[](네트워크 호출 없음). id 전환·언마운트 시 stale 응답을 버린다.
 */
export type UseSearchCapturesResult = {
  query: string;
  setQuery: (next: string) => void;
  results: CaptureListItem[];
  isSearching: boolean;
  error: string | null;
};

export function useSearchCaptures(): UseSearchCapturesResult {
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<CaptureListItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 가장 최근 실행한 검색어. 응답이 이 값과 다르면 stale로 버린다.
  const latestQueryRef = useRef<string>('');

  useEffect(() => {
    const trimmed = query.trim();

    // 빈 검색어: 디바운스 없이 즉시 비우고 호출하지 않는다.
    if (trimmed.length === 0) {
      latestQueryRef.current = '';
      setResults([]);
      setError(null);
      setIsSearching(false);
      return;
    }

    let active = true;
    latestQueryRef.current = trimmed;
    setIsSearching(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const found = await searchCaptures({ query: trimmed });
        // stale 가드: 언마운트됐거나 그 사이 검색어가 바뀌었으면 무시.
        if (!active || latestQueryRef.current !== trimmed) return;
        setResults(found);
      } catch (err) {
        if (!active || latestQueryRef.current !== trimmed) return;
        const message =
          err instanceof Error ? err.message : '검색 중 오류가 발생했습니다.';
        setError(message);
      } finally {
        if (active && latestQueryRef.current === trimmed) setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    // 검색어가 바뀌면 직전 디바운스 타이머를 취소한다(불필요 호출 방지).
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return { query, setQuery, results, isSearching, error };
}
