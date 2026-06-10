import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { listEventCaptures } from '@/lib/captures';
import { useCaptureStore } from '@/stores/capture-store';

import type { CaptureListItem } from '@/features/captures/types';

/**
 * 캘린더 탭용 이벤트 캡처 훅 (C2).
 *
 * listEventCaptures()로 이벤트(parsed_event.event)가 감지된 캡처만 가져와,
 * event.starts_at 기준으로 upcoming(미래·오름차순)·past(과거·내림차순)으로 나눈다.
 * upcoming은 가까운 일정이 위로, past는 최근에 지난 일정이 위로 오게 한다.
 *
 * use-captures.ts 와 동일한 mountedRef/inFlightRef/지연 로드 패턴을 적용하고,
 * capture-store의 savedCount(새 캡처 저장 시 증가)를 구독해 자동 새로고침한다.
 */
export type UseEventCapturesResult = {
  /** 미래(또는 지금 이후) 일정. starts_at 오름차순(가까운 순). */
  upcoming: CaptureListItem[];
  /** 과거 일정. starts_at 내림차순(최근에 지난 순). */
  past: CaptureListItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/** starts_at 파싱 실패 시 정렬에서 맨 뒤로 밀기 위한 안전 기본값(epoch ms). */
const INVALID_TIME_FALLBACK = 0;

/** ISO8601 → epoch ms. 파싱 실패 시 fallback(정렬 안정화). */
function toTime(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? INVALID_TIME_FALLBACK : t;
}

export function useEventCaptures(): UseEventCapturesResult {
  const [items, setItems] = useState<CaptureListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // upcoming/past 경계 기준 시각(epoch ms). fetch 성공 시점에 한 번 캡처한다.
  // why state: Date.now()는 비순수라 render(useMemo) 안에서 부르면 결과가 불안정해진다
  // (react-hooks/purity 위반). 새로고침할 때마다 갱신해, 막 로드한 목록에 일관 적용한다.
  // 초기 0: 첫 fetch 전에는 items도 비어 있어 분리 결과가 빈 배열이므로 경계값이 무의미하다.
  const [boundaryAt, setBoundaryAt] = useState<number>(0);

  // 진행 중 요청 가드. true면 새 요청을 무시해 중복 fetch를 막는다.
  const inFlightRef = useRef<boolean>(false);
  // 언마운트 후 setState 방지.
  const mountedRef = useRef<boolean>(true);

  // 새 캡처 저장 시그널. 변하면 새로고침한다(새 이벤트가 즉시 반영되도록).
  const savedCount = useCaptureStore((state) => state.savedCount);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const list = await listEventCaptures();
      if (!mountedRef.current) return;
      // 불변성: 새 배열로 교체. 경계 시각도 이 로드 시점으로 갱신한다(렌더 밖에서 Date.now 호출).
      setItems(list);
      setBoundaryAt(Date.now());
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : '일정을 불러오지 못했습니다.';
      console.error('[use-event-captures] 이벤트 캡처 로드 실패:', message);
      setError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // 마운트 + savedCount 변화 시 새로고침.
  // setIsLoading(true)가 ScrollView/RefreshControl 마운트 전에 동기로 호출되면
  // "hasn't mounted yet" 경고가 나므로, use-captures와 동일하게 다음 틱으로 미룬다.
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

  // upcoming/past 분리. event가 null인 항목은 정렬 기준이 없으므로 제외한다
  // (listEventCaptures가 event 보유 행만 주지만, 타입 안전을 위해 한 번 더 가드).
  // 기준 시각은 fetch 시점에 캡처한 boundaryAt을 쓴다(렌더는 순수 유지).
  const { upcoming, past } = useMemo(() => {
    const withEvent = items.filter((item) => item.event !== null);

    const up = withEvent
      .filter((item) => toTime(item.event!.starts_at) >= boundaryAt)
      .sort((a, b) => toTime(a.event!.starts_at) - toTime(b.event!.starts_at));

    const pa = withEvent
      .filter((item) => toTime(item.event!.starts_at) < boundaryAt)
      .sort((a, b) => toTime(b.event!.starts_at) - toTime(a.event!.starts_at));

    return { upcoming: up, past: pa };
  }, [items, boundaryAt]);

  return { upcoming, past, isLoading, error, refresh };
}
