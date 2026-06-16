import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { shouldRefresh } from '@/features/parcel/polling';
import { refreshParcelTracking } from '@/features/parcel/start-tracking';
import { getLocale } from '@/i18n';
import { useParcelStore } from '@/stores/parcel-store';
import { useSettingsStore } from '@/stores/settings-store';

// 동시 폴링 가드 — 모듈 스코프라 훅이 여러 곳에서 마운트돼도 단일 폴링을 보장한다
// (인스턴스 지역 ref였다면 다중 마운트 시 동시 폴링 → 1일 20회 제한 조기 소진 위험).
let pollingInFlight = false;
// 포그라운드 체류 중 주기 재평가 간격(ms). shouldRefresh가 level별 간격을 거르므로
// 이 간격이 짧아도 동일 운송장 20회/일을 초과하지 않는다.
const FOREGROUND_POLL_INTERVAL_MS = 20 * 60 * 1000;

/**
 * 택배 자동 새로고침 훅 — 서버 cron·원격 푸시 없이 클라이언트가 폴링한다(MVP).
 *
 * - 한국(ko) + parcelTracking ON일 때만 동작. 그 외엔 코드 경로가 열리지 않는다.
 * - 마운트/포그라운드 복귀(AppState active) 시: 목록을 먼저 새로고침하고,
 *   각 활성 추적에 대해 level별 간격(shouldRefresh)이 지난 것만 trackParcel→applyTrackResult.
 * - 상태 전이(level5/완료) 시 refreshParcelTracking 내부가 로컬 알림 + 플래그를 처리한다.
 *
 * 루트(또는 홈)에서 1회 마운트한다. 동시 실행 가드(runningRef)로 중복 폴링을 막는다.
 */
export function useParcelAutoRefresh(): void {
  const parcelTracking = useSettingsStore((state) => state.parcelTracking);
  const hydrated = useSettingsStore((state) => state.hydrated);

  const runPoll = useCallback(async (): Promise<void> => {
    // ko + 토글 ON 게이트. 한국어 외에는 폴링하지 않는다.
    if (getLocale() !== 'ko' || !parcelTracking) return;
    if (pollingInFlight) return;
    pollingInFlight = true;
    try {
      const store = useParcelStore.getState();
      await store.refresh();
      const now = Date.now();
      const due = useParcelStore.getState().tracks.filter((track) => shouldRefresh(track, now));
      // 순차 처리: 동일 운송장 1일 20회 제한을 의식해 동시 폭주를 피한다.
      for (const track of due) {
        try {
          const updated = await refreshParcelTracking(track);
          useParcelStore.getState().upsert(updated);
        } catch (error) {
          // 개별 실패는 다른 추적 폴링을 막지 않는다.
          console.error('[parcel] 자동 새로고침 실패:', track.id, error);
        }
      }
    } finally {
      pollingInFlight = false;
    }
  }, [parcelTracking]);

  // 마운트 + 설정 복원 후 1회, 그리고 토글 변화 시 즉시 폴링.
  useEffect(() => {
    if (!hydrated) return;
    void runPoll();
  }, [hydrated, runPoll]);

  // 포그라운드 복귀 시 + 체류 중 주기적으로 폴링.
  // setInterval은 shouldRefresh가 level별 간격을 거르므로 과다호출(20회/일 초과)을 만들지 않는다.
  // 포그라운드 장기 체류 사용자도 "출발/완료 알림"을 제때 받게 한다(MEDIUM 보완).
  useEffect(() => {
    const handleChange = (state: AppStateStatus): void => {
      if (state === 'active') void runPoll();
    };
    const sub = AppState.addEventListener('change', handleChange);
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') void runPoll();
    }, FOREGROUND_POLL_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [runPoll]);

  // 택배 알림 탭 → 상세 화면 이동(use-weekly-report-notification 선례 패턴).
  // 같은 응답이 리스너+콜드스타트로 중복 처리되지 않도록 ref Set으로 1회만 처리한다.
  const handledResponses = useRef<Set<string>>(new Set());
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const request = response.notification.request;
      const url = (request.content.data as { url?: string } | undefined)?.url;
      // 우리가 발송한 택배 알림(/parcel/...)만 처리한다.
      if (typeof url !== 'string' || !url.startsWith('/parcel/')) return;
      if (handledResponses.current.has(request.identifier)) return;
      handledResponses.current.add(request.identifier);
      try {
        router.push(url as Parameters<typeof router.push>[0]);
      } catch (error) {
        console.error('[parcel] 알림 탭 이동 실패:', error);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch(() => {
        /* 미지원 환경 — 무시 */
      });

    return () => {
      sub.remove();
    };
  }, []);
}
