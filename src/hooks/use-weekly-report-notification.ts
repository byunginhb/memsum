import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  cancelWeeklyReportNotification,
  scheduleWeeklyReportNotification,
} from '@/lib/notifications';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * 주간 리포트 알림 훅 — "평소엔 무음, 주 1회만 짜잔" 정책의 알림 담당.
 *
 * - 설정의 weeklyReport 토글과 예약을 동기화한다: ON이면 매주 일요일 저녁 반복 예약
 *   (같은 식별자라 재예약은 교체 — 멱등), OFF면 해제.
 * - 알림을 탭하면 data.url(/report/weekly)로 리포트 화면을 연다(리포트 내용은
 *   기존 온디맨드 생성+주간 캐시 흐름을 그대로 사용 — 열 때 만들어진다).
 *
 * 루트 레이아웃에서 1회 마운트한다(WeeklyReportGate).
 */
export function useWeeklyReportNotification(): void {
  const weeklyReport = useSettingsStore((state) => state.weeklyReport);
  const hydrated = useSettingsStore((state) => state.hydrated);

  // 같은 응답이 리스너+콜드스타트 경로로 중복 처리되는 것을 막는다.
  const handledResponses = useRef<Set<string>>(new Set());

  // 설정 복원 후 토글 상태와 예약을 동기화한다.
  useEffect(() => {
    if (!hydrated) return;
    if (weeklyReport) {
      void scheduleWeeklyReportNotification();
    } else {
      void cancelWeeklyReportNotification();
    }
  }, [hydrated, weeklyReport]);

  // 알림 탭 → 리포트 화면 이동.
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const request = response.notification.request;
      const url = (request.content.data as { url?: string } | undefined)?.url;
      if (typeof url !== 'string' || url.length === 0) return;
      if (handledResponses.current.has(request.identifier)) return;
      handledResponses.current.add(request.identifier);
      try {
        // 주간 리포트 알림의 url은 우리가 예약 시 넣은 고정 경로다(/report/weekly).
        router.push(url as Parameters<typeof router.push>[0]);
      } catch (error) {
        console.error('[weekly-notif] 리포트 화면 이동 실패:', error);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    // 앱이 종료 상태에서 알림 탭으로 시작된 경우의 응답을 회수한다.
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
