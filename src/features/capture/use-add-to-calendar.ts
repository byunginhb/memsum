import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import * as Linking from 'expo-linking';

import { useToast } from '@/design/components/Toast/useToast';
import { t } from '@/i18n';
import { useCalendarStore } from '@/stores/calendar-store';

import type { CaptureEvent } from './types';

export type AddToCalendarState = {
  /** 이번 화면에서 등록을 마쳤는지(또는 처음부터 등록돼 있었는지). */
  added: boolean;
  /** 이 화면에서 방금 등록했는지(처음부터 등록돼 있던 경우는 false) — 성공 연출 판단용. */
  justAdded: boolean;
  /** 등록된 일정의 구글 캘린더 링크(없을 수 있다). */
  htmlLink: string | null;
  /** 등록·연결 진행 중. */
  busy: boolean;
  /** 미연결이면 연결부터 하고 등록한다. 결과는 토스트로 알린다. */
  add: () => Promise<void>;
  /** 등록된 일정을 구글 캘린더에서 연다. */
  open: () => Promise<void>;
};

type Args = {
  captureId: string;
  event: CaptureEvent | null;
  /** 서버에 이미 등록 기록이 있으면 넘긴다(상세 화면 등). */
  initialHtmlLink?: string | null;
  initiallyAdded?: boolean;
  /**
   * 성공 피드백 방식. 'toast'(기본)는 토스트, 'inline'은 화면 안 연출이 맡으므로
   * 토스트 없이 스크린리더에만 announceText를 읽어 준다.
   */
  successFeedback?: 'toast' | 'inline';
  announceText?: string;
};

/**
 * 캡처 일정 → 구글 캘린더 등록 훅.
 *
 * 캡처 시트와 상세 화면(captures/[id])이 같이 쓴다(미연결이면 connect → 등록 → 열기 전환).
 * 한 훅에 모아 두 곳의 동작이 갈라지지 않게 한다.
 * 등록은 캡처 id로 만든 결정적 이벤트 id라 자동 등록과 겹쳐도 캘린더에 중복이 생기지 않는다.
 */
export function useAddToCalendar({
  captureId,
  event,
  initialHtmlLink = null,
  initiallyAdded = false,
  successFeedback = 'toast',
  announceText,
}: Args): AddToCalendarState {
  const toast = useToast();
  const storeBusy = useCalendarStore((s) => s.isBusy);
  const hydrated = useCalendarStore((s) => s.hydrated);
  const restore = useCalendarStore((s) => s.restore);
  const connect = useCalendarStore((s) => s.connect);
  const registerCapture = useCalendarStore((s) => s.registerCapture);

  const [justAdded, setJustAdded] = useState(false);
  const added = initiallyAdded || justAdded;
  const [htmlLink, setHtmlLink] = useState<string | null>(initialHtmlLink);
  const [localBusy, setLocalBusy] = useState(false);
  const busy = storeBusy || localBusy;

  // 연결 상태는 SecureStore 복원 뒤에 확정된다. restore는 멱등.
  useEffect(() => {
    if (!hydrated) void restore();
  }, [hydrated, restore]);

  const add = useCallback(async (): Promise<void> => {
    if (busy || !event) return;
    setLocalBusy(true);
    try {
      if (useCalendarStore.getState().status !== 'connected') {
        try {
          await connect();
        } catch (connectError) {
          console.error('[capture] 캘린더 연결 실패:', connectError);
          toast.show({ tone: 'danger', title: t('calendar.toast.connectError') });
          return;
        }
      }
      // 연결 창을 닫는 등으로 여전히 미연결이면 등록하지 않는다.
      if (useCalendarStore.getState().status !== 'connected') {
        toast.show({ tone: 'info', title: t('calendar.toast.needConnect') });
        return;
      }
      const registration = await registerCapture({ captureId, event });
      setHtmlLink(registration.htmlLink);
      setJustAdded(true);
      if (successFeedback === 'inline') {
        AccessibilityInfo.announceForAccessibility(
          announceText ?? t('calendar.toast.registerSuccess'),
        );
      } else {
        toast.show({ tone: 'success', title: t('calendar.toast.registerSuccess') });
      }
    } catch (registerError) {
      console.error('[capture] 캘린더 등록 실패:', registerError);
      toast.show({ tone: 'danger', title: t('calendar.toast.registerError') });
    } finally {
      setLocalBusy(false);
    }
  }, [busy, event, captureId, connect, registerCapture, toast, successFeedback, announceText]);

  const open = useCallback(async (): Promise<void> => {
    if (!htmlLink) {
      // 등록 응답에 링크가 빠질 수 있다 — 등록됐다는 사실만 알린다.
      toast.show({ tone: 'info', title: t('calendar.toast.registerSuccess') });
      return;
    }
    try {
      await Linking.openURL(htmlLink);
    } catch (openError) {
      console.error('[capture] 캘린더 링크 열기 실패:', openError);
      toast.show({ tone: 'danger', title: t('calendar.error.openLink') });
    }
  }, [htmlLink, toast]);

  return { added, justAdded, htmlLink: htmlLink ?? initialHtmlLink, busy, add, open };
}
