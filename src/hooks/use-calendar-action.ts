// 캘린더 등록·열기 공용 훅 — calendar.tsx ConnectedBody의 handleRegister/handleOpen 추출.
// UpcomingSection(홈)과 캘린더 탭이 공유한다(중복 로직 제거).

import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { useToast } from '@/design/components/Toast';
import type { CaptureListItem } from '@/features/captures/types';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

export type UseCalendarActionResult = {
  /** 캡처를 구글 캘린더에 등록한다. event가 없거나 등록 중이면 무시. */
  handleRegister: (item: CaptureListItem) => void;
  /** htmlLink를 외부 앱(구글 캘린더)으로 연다. */
  handleOpen: (htmlLink: string | null) => void;
  /** 현재 등록 진행 중인 캡처 id. 없으면 null(해당 행 로딩·비활성 처리용). */
  registeringId: string | null;
};

/**
 * 캘린더 등록·열기 공용 훅.
 *
 * 캘린더 탭(ConnectedBody)과 홈(UpcomingSection)이 동일 로직을 공유하도록
 * handleRegister / handleOpen 패턴을 추출한 훅이다.
 *
 * @param refresh 등록 성공 후 목록을 다시 읽기 위한 콜백(useEventCaptures.refresh).
 */
export function useCalendarAction(
  refresh: () => Promise<void>,
): UseCalendarActionResult {
  const status = useCalendarStore((s) => s.status);
  const registerCapture = useCalendarStore((s) => s.registerCapture);
  const toast = useToast();

  // 현재 등록 진행 중인 캡처 id. 해당 행만 로딩/비활성 처리(중복 탭 방지).
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const handleRegister = useCallback(
    (item: CaptureListItem): void => {
      // event가 없으면 캘린더에 넣을 내용이 없다(타입 가드 + 사용자 보호).
      if (!item.event) {
        console.error('[calendar-action] 등록 시도했으나 event가 없습니다:', item.id);
        return;
      }
      // 이미 다른 항목을 등록 중이면 무시(직렬 처리로 상태 꼬임 방지).
      if (registeringId !== null) return;

      // 캘린더 미연결 시 안내 토스트 — 캘린더 탭에서 연결하도록 유도한다.
      if (status !== 'connected') {
        toast.show({ tone: 'danger', title: t('calendar.toast.needConnect') });
        return;
      }

      setRegisteringId(item.id);
      const event = item.event;
      void (async () => {
        try {
          await registerCapture({ captureId: item.id, event });
          toast.show({ tone: 'success', title: t('calendar.toast.registerSuccess') });
          // 등록 결과(calendarEventId·htmlLink)를 반영하려면 목록을 다시 읽는다.
          await refresh();
        } catch (err) {
          const message =
            err instanceof Error ? err.message : t('calendar.toast.registerError');
          console.error('[calendar-action] 일정 등록 실패:', message);
          toast.show({ tone: 'danger', title: t('calendar.toast.registerError') });
        } finally {
          setRegisteringId(null);
        }
      })();
    },
    [registeringId, status, registerCapture, refresh, toast],
  );

  const handleOpen = useCallback((htmlLink: string | null): void => {
    if (!htmlLink) return;
    void (async () => {
      try {
        await Linking.openURL(htmlLink);
      } catch (err) {
        const message = err instanceof Error ? err.message : '알 수 없는 오류';
        console.error('[calendar-action] 캘린더 링크 열기 실패:', message);
      }
    })();
  }, []);

  return { handleRegister, handleOpen, registeringId };
}
