/**
 * 최소 분석 이벤트 훅 자리.
 * PostHog, GA4 등 실제 SDK를 붙일 때는 이 함수만 교체한다.
 * 현재는 window.posthog / window.gtag가 있으면 위임하고, 없으면 조용히 무시한다.
 */
export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & {
    posthog?: { capture: (e: string, p?: object) => void };
    gtag?: (...args: unknown[]) => void;
  };
  if (w.posthog?.capture) {
    w.posthog.capture(event, props);
  } else if (w.gtag) {
    w.gtag('event', event, props);
  }
}
