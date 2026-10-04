import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import { syncEventReminders } from '@/lib/event-reminders';
import { cancelAllEventReminders, ensureNotificationPermission } from '@/lib/notifications';
import { listEventCaptures } from '@/lib/captures';
import { useCaptureStore } from '@/stores/capture-store';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { useSettingsStore } from '@/stores/settings-store';

/** 처리한 알림 응답 키(모듈 스코프 — 훅 재마운트·Fast Refresh에도 유지). */
const handledResponses = new Set<string>();

/**
 * 이벤트 전날 리마인드 훅 — "전날 밤 1건 묶음" 정책의 알림 담당.
 *
 * - 설정(eventReminder 토글·eventReminderHour)과 이벤트 리마인드 예약을 동기화한다:
 *   ON이면 전날 지정 시각에 날짜별 묶음 알림(identifier=reminder-YYYYMMDD)을 예약(멱등),
 *   OFF면 전체 해제.
 * - savedCount 변화(새 캡처 저장·이벤트 캘린더 등록 시)에 재동기화한다.
 * - 온보딩 완료 전에는 아무것도 하지 않는다 — 알림 권한 팝업은 온보딩 2페이지가 처음 묻는다.
 * - 웹(개발용 미리보기)에는 예약 알림이 없다.
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
  const onboardingCompleted = useOnboardingStore((state) => state.completed);

  // 동기화는 한 번에 하나. 진행 중에 조건이 바뀌면 끝난 뒤 한 번 더 돈다(바뀐 시각·토글을 놓치지 않게).
  const syncInFlight = useRef(false);
  const syncAgain = useRef(false);

  // 설정 복원 후 토글·시각·savedCount 변화에 재동기화한다.
  useEffect(() => {
    if (Platform.OS === 'web' || !hydrated || !onboardingCompleted) return;

    if (!eventReminder) {
      void cancelAllEventReminders();
      return;
    }

    if (syncInFlight.current) {
      syncAgain.current = true;
      return;
    }
    syncInFlight.current = true;

    void (async () => {
      try {
        do {
          syncAgain.current = false;
          const granted = await ensureNotificationPermission();
          if (!granted) return;
          const items = await listEventCaptures();
          // 도는 동안 바뀐 설정을 반영하려고 매번 최신 값을 읽는다.
          const { eventReminder: on, eventReminderHour: hour } = useSettingsStore.getState();
          if (!on) {
            await cancelAllEventReminders();
            return;
          }
          await syncEventReminders(items, hour, 0);
        } while (syncAgain.current);
      } catch (error) {
        // 동기화 실패는 조용히 넘긴다 — 다음 savedCount 변화 시 재시도된다.
        console.error('[event-reminders] 리마인드 동기화 실패:', error);
      } finally {
        syncInFlight.current = false;
      }
    })();
  }, [hydrated, onboardingCompleted, eventReminder, eventReminderHour, savedCount]);

  // 알림 탭 → 딥링크 이동. reminder-* 식별자만 처리(weekly-report와 중복 방지).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const request = response.notification.request;
      // 이 훅은 이벤트 리마인드 알림만 처리한다.
      if (!request.identifier.startsWith('reminder-')) return;
      const url = (request.content.data as { url?: string } | undefined)?.url;
      if (typeof url !== 'string' || url.length === 0) return;
      // 리스너 + 콜드스타트 회수 경로의 중복을 막는다(게시 시각까지 키로 — 주간 알림 훅과 같은 규칙).
      const key = `${request.identifier}:${response.notification.date}`;
      if (handledResponses.has(key)) return;
      handledResponses.add(key);
      // 처리한 "마지막 응답"을 비워, 앱 재시작 때 같은 화면이 다시 열리지 않게 한다.
      try {
        Notifications.clearLastNotificationResponse();
      } catch {
        /* 미지원 환경 — 무시(위 Set이 세션 내 중복은 막는다) */
      }
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
