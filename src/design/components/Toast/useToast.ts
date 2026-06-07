import { useContext } from 'react';

import { ToastContext } from './ToastProvider';
import type { ToastApi } from './ToastProvider';

/**
 * useToast — 토스트 표시/숨김 API 훅. design.md §21.
 *
 * ToastProvider 하위에서만 사용 가능. Provider 밖에서 호출하면 즉시 throw해
 * 마운트 누락을 개발 단계에서 빠르게 드러낸다.
 *
 * @example
 * const toast = useToast();
 * toast.show({ tone: 'success', title: t('report.cleaned'), action: { label: t('common.view'), onPress } });
 */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a <ToastProvider>.');
  }
  return context;
}
