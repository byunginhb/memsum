import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  cancelWeeklyReportNotification,
  scheduleWeeklyReportNotification,
} from '@/lib/notifications';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useSettingsStore } from '@/stores/settings-store';

/** 이 훅이 처리하는 알림 경로(택배 알림 /parcel/... 은 use-parcel-auto-refresh 담당). */
const REPORT_URL_PREFIX = '/report/';

/**
 * 처리한 알림 응답 키(모듈 스코프 — 훅 재마운트·Fast Refresh에도 유지).
 * why identifier만 쓰지 않음: 주간 알림은 고정 식별자('weekly-report')로 매주 반복되므로
 * identifier만 키로 쓰면 둘째 주부터 탭이 무시된다. 게시 시각(date)을 함께 쓴다.
 */
const handledResponses = new Set<string>();

/**
 * 주간 리포트 알림 훅 — "평소엔 무음, 주 1회만 짜잔" 정책의 알림 담당.
 *
 * - 설정의 weeklyReport 토글과 예약을 동기화한다: ON이면 매주 일요일 저녁 반복 예약
 *   (같은 식별자라 재예약은 교체 — 멱등), OFF면 해제.
 * - 알림을 탭하면 data.url(/report/weekly)로 리포트 화면을 연다(리포트 내용은
 *   기존 온디맨드 생성+주간 캐시 흐름을 그대로 사용 — 열 때 만들어진다).
 *
 * - 권한 팝업(예약 시 알림 권한 요청)은 온보딩 완료 후에만 — 첫 화면부터 팝업이 뜨지 않게.
 *
 * 루트 레이아웃에서 1회 마운트한다(WeeklyReportGate).
 */
export function useWeeklyReportNotification(): void {
  const weeklyReport = useSettingsStore((state) => state.weeklyReport);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const onboardingCompleted = useOnboardingStore((state) => state.completed);

  // 설정 복원 + 온보딩 완료 후 토글 상태와 예약을 동기화한다.
  useEffect(() => {
    if (!hydrated || !onboardingCompleted) return;
    if (weeklyReport) {
      void scheduleWeeklyReportNotification();
    } else {
      void cancelWeeklyReportNotification();
    }
  }, [hydrated, onboardingCompleted, weeklyReport]);

  // 알림 탭 → 리포트 화면 이동.
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const request = response.notification.request;
      const url = (request.content.data as { url?: string } | undefined)?.url;
      // 우리가 예약한 리포트 알림(/report/...)만 처리한다(다른 알림의 url로 이동 금지).
      if (typeof url !== 'string' || !url.startsWith(REPORT_URL_PREFIX)) return;
      const key = `${request.identifier}:${response.notification.date}`;
      if (handledResponses.has(key)) return;
      handledResponses.add(key);
      // 처리한 "마지막 응답"을 비워, 앱 재시작·재마운트 때 같은 화면이 다시 열리지 않게 한다.
      // (SDK 56의 clearLastNotificationResponse는 동기 void — 미지원 시 동기 throw라 try/catch로 충분.)
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        /* 미지원 환경 — 무시(위 Set이 세션 내 중복은 막는다) */
      }
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
