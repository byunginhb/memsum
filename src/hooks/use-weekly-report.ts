import { useCallback, useEffect, useRef, useState } from 'react';

import { getWeeklyReport, submitFeedback } from '@/lib/weekly-report';

import type { ReportFeedback, WeeklyReport } from '@/features/report/types';

/**
 * 주간 리포트 훅 (Hero Moment).
 *
 * 마운트 시(또는 weekStart 변경 시) 리포트를 로드하고, refresh·setFeedback을 제공한다.
 * setFeedback은 낙관적 업데이트(불변) 후 서버 저장하며, 실패 시 이전 값으로 롤백한다.
 * mountedRef로 언마운트 후 setState를 막고, 동시 호출은 inFlightRef로 가드한다.
 */
export type UseWeeklyReportResult = {
  report: WeeklyReport | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setFeedback: (captureId: string, rating: ReportFeedback) => Promise<void>;
};

export function useWeeklyReport(weekStart?: string): UseWeeklyReportResult {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 진행 중 로드 가드. true면 새 요청을 무시해 중복 fetch를 막는다.
  const inFlightRef = useRef<boolean>(false);
  // 피드백 저장 진행 중인 captureId 집합. 같은 카드 연타 시 race·중복 upsert를 막는다.
  const feedbackInFlightRef = useRef<Set<string>>(new Set());
  // 언마운트 후 setState 방지.
  const mountedRef = useRef<boolean>(true);

  const refresh = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const next = await getWeeklyReport(weekStart);
      if (!mountedRef.current) return;
      // 불변성: 새 객체로 교체.
      setReport(next);
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : '리포트를 불러오지 못했습니다.';
      setError(message);
    } finally {
      if (mountedRef.current) setIsLoading(false);
      inFlightRef.current = false;
    }
  }, [weekStart]);

  /**
   * 항목 피드백 토글. 낙관적 업데이트(불변) → 서버 저장 → 실패 시 롤백.
   * null rating(선택 해제)은 현재 백엔드 미지원이라 서버 호출 없이 로컬만 갱신한다.
   */
  const setFeedback = useCallback(
    async (captureId: string, rating: ReportFeedback): Promise<void> => {
      // 같은 카드의 피드백 저장이 진행 중이면 연타를 무시한다(race·중복 upsert 방지).
      if (feedbackInFlightRef.current.has(captureId)) return;

      // 롤백용 이전 값 스냅샷.
      const prev = report;
      if (!prev) return;

      const targetWeekStart = prev.weekStart;
      const previousRating =
        prev.items.find((it) => it.captureId === captureId)?.feedback ?? null;

      // 낙관적 업데이트(불변): 새 배열·새 객체로 feedback만 교체.
      const optimistic: WeeklyReport = {
        ...prev,
        items: prev.items.map((it) =>
          it.captureId === captureId ? { ...it, feedback: rating } : it,
        ),
      };
      setReport(optimistic);

      // 선택 해제(null)는 서버 미지원 — 로컬 상태만 반영하고 종료.
      if (rating === null) return;

      feedbackInFlightRef.current.add(captureId);
      try {
        await submitFeedback(targetWeekStart, captureId, rating);
      } catch (err) {
        if (!mountedRef.current) return;
        // 롤백(불변): 이전 rating으로 복원.
        setReport((current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((it) =>
              it.captureId === captureId
                ? { ...it, feedback: previousRating }
                : it,
            ),
          };
        });
        const message =
          err instanceof Error ? err.message : '피드백 저장에 실패했습니다.';
        setError(message);
      } finally {
        feedbackInFlightRef.current.delete(captureId);
      }
    },
    [report],
  );

  // 언마운트 후 setState 방지 플래그. refresh effect보다 먼저 선언해
  // 재마운트(Fast Refresh/StrictMode) 시 stale false로 막히지 않게 한다.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // weekStart 변경(또는 마운트) 시 로드. setIsLoading이 마운트 전에 동기 호출되지
  // 않도록 다음 틱으로 미룬다(use-captures와 동일 패턴).
  useEffect(() => {
    const id = setTimeout(() => {
      void refresh();
    }, 0);
    return () => clearTimeout(id);
  }, [refresh]);

  return { report, isLoading, error, refresh, setFeedback };
}
