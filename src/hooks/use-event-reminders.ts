import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { syncEventReminders } from '@/lib/event-reminders';
import { cancelAllEventReminders, ensureNotificationPermission } from '@/lib/notifications';
import { listEventCaptures } from '@/lib/captures';
import { useCaptureStore } from '@/stores/capture-store';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * 이벤트 전날 리마인드 훅 — "전날 밤 1건 묶음" 정책의 알림 담당.
 *
 * - 설정(eventReminder 토글·eventReminderHour)과 이벤트 리마인드 예약을 동기화한다:
 *   ON이면 전날 지정 시각에 날짜별 묶음 알림(identifier=reminder-YYYYMMDD)을 예약(멱등),
 *   OFF면 전체 해제.
 * - savedCount 변화(새 캡처 저장·이벤트 캘린더 등록 시)에 재동기화한다.
 * - 알림을 탭하면 data.url(기본 '/calendar')로 딥링크한다.
 *   use-weekly-report-notification의 중복 처리 가드 패턴을 재사용하되,
 *   이 훅은 reminder-* 식별자만 처리해 weekly-report 훅과 충돌하지 않는다.
 *
 * 루트 레이아웃에서 1회 마운트한다(EventReminderGate).
 */
export function useEventReminders(): void {
  const eventReminder = useSettingsStore((state) => state.eventReminder);
  const eventReminderHour = useSettingsStore((state) => state.eventReminderHour);
  const hydrated = useSettingsStore((state) => state.hydrated);
  const savedCount = useCaptureStore((state) => state.savedCount);

  // 같은 알림이 리스너+콜드스타트 경로로 중복 처리되는 것을 막는다.
  const handledResponses = useRef<Set<string>>(new Set());
  // 진행 중 동기화 가드 — 동시 중복 sync를 막는다.
  const syncInFlight = useRef(false);

  // 설정 복원 후 토글·시각·savedCount 변화에 재동기화한다.
  useEffect(() => {
    if (!hydrated) return;

    if (!eventReminder) {
      void cancelAllEventReminders();
      return;
    }

    // 이미 동기화 진행 중이면 건너뜀(savedCount가 빠르게 오를 때 중복 방지).
    if (syncInFlight.current) return;
    syncInFlight.current = true;

    void (async () => {
      try {
        const granted = await ensureNotificationPermission();
        if (!granted) return;
        const items = await listEventCaptures();
        await syncEventReminders(items, eventReminderHour, 0);
      } catch (error) {
        // 동기화 실패는 조용히 넘긴다 — 다음 savedCount 변화 시 재시도된다.
        console.error('[event-reminders] 리마인드 동기화 실패:', error);
      } finally {
        syncInFlight.current = false;
      }
    })();
  }, [hydrated, eventReminder, eventReminderHour, savedCount]);

  // 알림 탭 → 딥링크 이동. reminder-* 식별자만 처리(weekly-report와 중복 방지).
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const request = response.notification.request;
      // 이 훅은 이벤트 리마인드 알림만 처리한다.
      if (!request.identifier.startsWith('reminder-')) return;
      const url = (request.content.data as { url?: string } | undefined)?.url;
      if (typeof url !== 'string' || url.length === 0) return;
      if (handledResponses.current.has(request.identifier)) return;
      handledResponses.current.add(request.identifier);
      try {
        router.push(url as Parameters<typeof router.push>[0]);
      } catch (error) {
        console.error('[event-reminders] 딥링크 이동 실패:', error);
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
