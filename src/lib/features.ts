// src/lib/features.ts
//
// 기능 스위치 — 코드는 남겨 두고 진입점에서만 끄는 기능을 모은다.

/**
 * 택배 조회(운송장 인식·추적·알림) 사용 여부.
 *
 * 2026-10-05 제외: 조회 API(SweetTracker)가 유료라 서비스에서 일단 뺐다.
 * 운영 Supabase의 track-parcel 함수와 SWEETTRACKER_API_KEY 시크릿도 지운 상태라,
 * 다시 켜려면 함수 재배포(`supabase functions deploy track-parcel`) + 키 재설정 후 true로 바꾼다.
 * 타입을 boolean으로 둬서 false 리터럴로 좁혀지지 않게 한다(분기 코드가 타입 오류 없이 남도록).
 */
export const PARCEL_ENABLED: boolean = false;
