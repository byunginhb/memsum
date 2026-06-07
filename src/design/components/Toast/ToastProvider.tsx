import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { Toast } from './Toast';
import type { ToastAction, ToastTone } from './Toast';

/** 표시 시간 프리셋 — design.md §21: short 2000ms / long 4000ms. */
export type ToastDuration = 'short' | 'long';

/** show() 옵션 — 호출측이 i18n 문구(title/description/action.label)를 주입. */
export type ToastOptions = {
  tone: ToastTone;
  title: string;
  description?: string;
  duration?: ToastDuration;
  action?: ToastAction;
};

/** useToast()가 노출하는 API. */
export type ToastApi = {
  /** 토스트 표시. 이미 떠 있으면 새 것으로 교체(동시 1개). */
  show: (options: ToastOptions) => void;
  /** 현재 토스트 숨김. */
  hide: () => void;
};

/** duration 프리셋 → 자동 해제까지의 ms. */
const DURATION_MS: Record<ToastDuration, number> = {
  short: 2000,
  long: 4000,
};

/** duration 미지정 시 기본값. */
const DEFAULT_DURATION: ToastDuration = 'short';

/**
 * Toast 컨텍스트 — Provider가 주입, useToast()가 소비.
 * undefined 기본값으로 Provider 외부 사용을 런타임에 감지(useToast에서 throw).
 */
export const ToastContext = createContext<ToastApi | undefined>(undefined);

/** 내부 표시 상태 — 보이는 토스트 1개를 식별/리렌더하기 위한 키 포함. */
type ToastState = {
  /** 매 show마다 증가 — 동일 옵션 재호출 시에도 Toast 리마운트(애니메이션 재생). */
  key: number;
  options: ToastOptions;
};

type ToastProviderProps = {
  children: ReactNode;
};

/**
 * ToastProvider — 앱 루트에 마운트(통합 시 _layout에 추가 예정).
 *
 * 동시 1개 정책: 새 show()가 기존 토스트를 즉시 교체한다.
 * 타이머는 ref로 관리하며, 교체/숨김/언마운트 시 반드시 clearTimeout(누수 방지).
 * iOS는 show 시 announceForAccessibility(title)로 보이스오버에 즉시 알림
 * (Toast 컴포넌트는 accessibilityRole="alert" + Android live region 담당).
 */
export function ToastProvider({ children }: ToastProviderProps): ReactNode {
  const [state, setState] = useState<ToastState | null>(null);

  // 자동 해제 타이머 핸들. 교체/숨김/언마운트에서 clearTimeout으로 정리.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 매 show마다 증가시켜 Toast 컴포넌트 key로 사용(리마운트 → 진입 애니메이션 재생).
  const keyRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    setState(null);
  }, [clearTimer]);

  const show = useCallback(
    (options: ToastOptions) => {
      // 동시 1개: 기존 타이머를 먼저 정리하고 새 토스트로 교체한다.
      clearTimer();

      keyRef.current += 1;
      setState({ key: keyRef.current, options });

      // iOS 보이스오버 즉시 알림(설명이 있으면 함께 읽음).
      if (Platform.OS === 'ios') {
        const message = options.description
          ? `${options.title}. ${options.description}`
          : options.title;
        AccessibilityInfo.announceForAccessibility(message);
      }

      const duration = options.duration ?? DEFAULT_DURATION;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setState(null);
      }, DURATION_MS[duration]);
    },
    [clearTimer],
  );

  // 언마운트 시 타이머 정리(메모리 누수 방지).
  useEffect(() => clearTimer, [clearTimer]);

  // API 객체는 show/hide가 안정 참조이므로 메모이즈(불필요한 컨슈머 리렌더 방지).
  const api = useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {state ? (
        <Toast
          // key로 리마운트 → 교체 시에도 진입 애니메이션이 다시 재생된다.
          key={state.key}
          tone={state.options.tone}
          title={state.options.title}
          description={state.options.description}
          action={
            state.options.action
              ? {
                  label: state.options.action.label,
                  // 액션 누르면 콜백 실행 후 토스트 닫기.
                  onPress: () => {
                    state.options.action?.onPress();
                    hide();
                  },
                }
              : undefined
          }
        />
      ) : null}
    </ToastContext.Provider>
  );
}
