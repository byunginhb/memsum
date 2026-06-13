// src/lib/analytics.ts
//
// Memsum — 경량 제품 분석(PostHog HTTP capture). 네이티브 SDK 없이 fetch로 직접 전송한다.
//
// why 경량 fetch:
// - posthog-react-native는 expo 네이티브 의존성 추가 + prebuild가 필요해 커스텀 네이티브
//   모듈(photo-library-watcher 등)을 건드릴 위험이 있다. fetch 방식은 네이티브 의존성 0,
//   prebuild 불필요(일반 JS 빌드만)이고, 출시 전 "의도적 퍼널 이벤트" 수집엔 충분하다.
// - autocapture/세션 리플레이는 쓰지 않는다(필요해지면 그때 SDK로 승격).
//
// "무료 출시 → 사용 데이터 → BM 결정"의 토대다(메모리: bm-validate-first).
// EXPO_PUBLIC_POSTHOG_KEY 미설정 시 전부 no-op이라 키 없는 개발/빌드에서 안전하다.

import { useAuthStore } from '@/stores/auth-store';

// 클라이언트 노출 가능한 PostHog project API 키(write-only, anon key 성격).
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

// PostHog Cloud 기본 호스트(US). EU 프로젝트면 EXPO_PUBLIC_POSTHOG_HOST로 덮어쓴다.
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

const CAPTURE_URL = `${POSTHOG_HOST.replace(/\/+$/, '')}/capture/`;

/**
 * 분석 이벤트 이름(중앙 관리 — 타이포 방지). BM 검증 퍼널 기준 핵심 이벤트만 둔다.
 * - photo_imported: 사진첩 수동 반입 시작(자동 감지가 놓친 옛 스크린샷 정리)
 * - capture_completed: 캡처 정리 완료(습관 형성 지표). props: category/hasEvent/source
 * - report_viewed: 주간 리포트(항목 있음) 열람(가치 모먼트 도달). props: itemCount/totalCaptures
 * - report_item_opened: 리포트 항목 원본 열기(되살림 가치 실사용)
 * - report_feedback: 항목 👍/👎(톤·선별 품질 학습). props: rating
 * - report_coachmark_dismissed: 첫 진입 코치마크 닫음(교육 도달)
 */
export const AnalyticsEvent = {
  PhotoImported: 'photo_imported',
  CaptureCompleted: 'capture_completed',
  ReportViewed: 'report_viewed',
  ReportItemOpened: 'report_item_opened',
  ReportFeedback: 'report_feedback',
  ReportCoachmarkDismissed: 'report_coachmark_dismissed',
} as const;

export type AnalyticsEventName = (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/** 분석 활성 여부(키 설정 시에만). 호출 측에서 비싼 prop 계산을 건너뛰는 데도 쓸 수 있다. */
export const isAnalyticsEnabled = Boolean(POSTHOG_KEY);

// distinct_id: 익명 Supabase 사용자 id(설치당 안정). 인증 전이면 'anonymous'.
function getDistinctId(): string {
  return useAuthStore.getState().userId ?? 'anonymous';
}

/**
 * 이벤트 1건을 PostHog로 전송한다. fire-and-forget(UI 비차단), 실패는 조용히 로깅만.
 * 키가 없으면 즉시 no-op. 분석 실패가 제품 동작을 막지 않도록 절대 throw하지 않는다.
 */
export function track(event: AnalyticsEventName, properties: AnalyticsProps = {}): void {
  if (!POSTHOG_KEY) return;

  void (async () => {
    try {
      await fetch(CAPTURE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event,
          distinct_id: getDistinctId(),
          properties: { ...properties, $lib: 'memsum-rn-lite' },
        }),
      });
    } catch (error) {
      // 분석 전송 실패는 비치명 — 제품 흐름에 영향 없이 경고만 남긴다.
      console.warn('[analytics] track 실패:', event, error);
    }
  })();
}
