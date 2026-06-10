// 캘린더(구글) 연동 공유 계약 (C2).
// OAuth 라이브러리(google-auth)·Calendar API(google-calendar)·스토어(calendar-store)·
// UI(캘린더 탭·설정 행·캡처 상세)가 이 타입을 단일 진실로 사용한다.
//
// 토큰은 시크릿이므로 SecureStore(Keychain/Keystore)에만 저장한다. AsyncStorage 금지.
// 네이티브 Authorization Code + PKCE 플로우라 client secret은 사용하지 않는다(public client).

import type { CaptureEvent } from '@/features/capture/types';

/**
 * SecureStore에 저장하는 OAuth 토큰 번들.
 * accessToken은 만료되므로 expiresAt 전에 refreshToken으로 갱신한다.
 */
export type GoogleTokenBundle = {
  accessToken: string;
  /** 오프라인 접근 토큰. 재동의 없이 갱신용. 일부 재인증 응답에선 없을 수 있음. */
  refreshToken: string | null;
  /** access token 만료 시각(epoch ms). 이 시각 전(여유분 포함)에 갱신한다. */
  expiresAt: number;
  /** 연결된 구글 계정 이메일(표시용). userinfo로 채운다. */
  email: string | null;
  /** 발급된 스코프(공백 구분). 권한 축소 감지용. */
  scope: string;
};

/** 캘린더 연결 상태(스토어가 노출, UI가 분기). */
export type CalendarConnectionStatus =
  | 'idle' // 초기(SecureStore 복원 전)
  | 'disconnected' // 미연결
  | 'connecting' // OAuth 브라우저 플로우 진행 중
  | 'connected' // 연결됨(유효 토큰 보유)
  | 'error'; // 마지막 연결/갱신 시도 실패

/**
 * 단건 캡처의 캘린더 등록 결과.
 * registerCapture 성공 시 반환하고, captures 테이블에도 동일 값을 기록한다.
 */
export type CalendarRegistration = {
  /** Google Calendar 이벤트 id. */
  eventId: string;
  /** "구글 캘린더에서 열기" 딥링크(events.insert 응답 htmlLink). 없을 수 있음. */
  htmlLink: string | null;
  /** 등록(동기화) 시각 ISO8601. */
  syncedAt: string;
};

/** Google Calendar events.insert 요청 바디(우리가 채우는 필드만). */
export type GoogleCalendarEventInput = {
  /**
   * 결정적(deterministic) 이벤트 id. captureId에서 파생한다.
   * why: 같은 id로 events.insert를 재호출하면 409로 거부돼(멱등), DB 반영 실패 후
   * 재시도해도 캘린더에 같은 일정이 중복 생성되지 않는다. 미지정 시 구글이 자동 부여.
   */
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
};

/** events.insert 응답(우리가 쓰는 필드만). */
export type GoogleCalendarEventResult = {
  id: string;
  htmlLink: string | null;
};

/**
 * calendar-store 공개 인터페이스 — UI(설정 행·캘린더 탭·캡처 상세)가 의존하는 계약.
 * 구현은 src/stores/calendar-store.ts. 토큰 저장/갱신/등록 로직을 캡슐화한다.
 */
export type CalendarStoreState = {
  /** 현재 연결 상태. */
  status: CalendarConnectionStatus;
  /** 연결된 계정 이메일(표시용). 미연결이면 null. */
  email: string | null;
  /** 마지막 오류 메시지(있으면). 사용자 토스트/안내용. */
  error: string | null;
  /** SecureStore 복원 완료 여부(런타임 전용). */
  hydrated: boolean;
  /** 진행 중 작업 여부(연결/등록 버튼 비활성·스피너용). */
  isBusy: boolean;
  /** 앱 시작 시 1회: SecureStore에서 토큰을 복원하고 status를 확정한다. 멱등. */
  restore: () => Promise<void>;
  /** OAuth 브라우저 플로우로 연결. 성공 시 status='connected', email 채움. */
  connect: () => Promise<void>;
  /** 토큰 폐기(revoke best-effort) + SecureStore 삭제. status='disconnected'. */
  disconnect: () => Promise<void>;
  /**
   * 캡처의 이벤트를 구글 캘린더에 등록하고 captures(calendar_* 컬럼·status)와
   * 스토어 상태를 갱신한다. 미연결이면 오류를 던진다.
   */
  registerCapture: (args: {
    captureId: string;
    event: CaptureEvent;
  }) => Promise<CalendarRegistration>;
};
