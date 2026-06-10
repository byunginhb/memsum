// 구글 캘린더 연동 상태 스토어 (C2).
//
// 책임: OAuth 연결/해제, 토큰 지연 갱신, 캡처 이벤트의 캘린더 등록.
// UI(설정 행·캘린더 탭·캡처 상세)는 calendar/types.ts 의 CalendarStoreState 계약만 본다.
//
// why persist 미사용: accessToken·refreshToken은 시크릿이다. zustand persist는
// 기본적으로 AsyncStorage(평문)에 상태를 직렬화하므로, 토큰을 거기 두면 보안 계약(C2)을
// 위반한다. 따라서 이 스토어는 persist 미들웨어를 쓰지 않는다. SecureStore(Keychain/
// Keystore)가 토큰의 단일 진실(SSOT)이고, 런타임에는 메모리(bundle 필드)에 캐시만 한다.
//
// 보안: accessToken/refreshToken 등 토큰 문자열 값은 절대 console에 남기지 않는다.

import { create } from 'zustand';

import type {
  CalendarRegistration,
  CalendarStoreState,
  GoogleCalendarEventResult,
  GoogleTokenBundle,
} from '@/features/calendar/types';
import type { CaptureEvent } from '@/features/capture/types';
import { markCaptureCalendarRegistered } from '@/lib/captures';
// google-auth는 store의 connect/disconnect와 이름이 겹치므로 네임스페이스로 import한다.
import * as googleAuth from '@/lib/google-auth';
import {
  CalendarConflictError,
  CalendarUnauthorizedError,
  insertEvent,
  makeCalendarEventId,
  mapEventToCalendarInput,
} from '@/lib/google-calendar';
import {
  clearGoogleTokens,
  loadGoogleTokens,
  saveGoogleTokens,
} from '@/lib/secure-tokens';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/**
 * 토큰 만료 여유분(ms). 만료 1분 전이면 갱신 대상으로 본다.
 * why: 네트워크 왕복·시계 오차로 "거의 만료" 토큰을 그대로 쓰면 401이 나므로,
 * 약간 일찍 갱신해 실패 확률을 낮춘다.
 */
const TOKEN_SKEW_MS = 60 * 1000;

// ── 내부 상태 타입 ───────────────────────────────────────────────────────────

/**
 * 공개 계약(CalendarStoreState)에 더해, 구현에만 필요한 내부 필드를 가진 상태.
 * why bundle in-memory: 토큰 SSOT는 SecureStore지만, 매 호출마다 디스크를 읽으면
 * 느리므로 복원·갱신 시 메모리에 캐시해 둔다(persist는 하지 않는다).
 */
type InternalCalendarState = CalendarStoreState & {
  /** 메모리 캐시된 OAuth 토큰 번들. SecureStore와 동기화된다. 미연결이면 null. */
  bundle: GoogleTokenBundle | null;
};

// ── 스토어 ───────────────────────────────────────────────────────────────────

export const useCalendarStore = create<InternalCalendarState>()((set, get) => {
  /**
   * restore 동시성 가드. 여러 화면이 같은 틱에 마운트되며 restore를 동시에 부를 때
   * SecureStore 읽기가 중복 실행되지 않도록 진행 중 Promise를 캐시한다.
   * why 클로저 스코프: 공개 상태가 아니라 구현 디테일이라 store state에 두지 않는다.
   */
  let restoreInFlight: Promise<void> | null = null;

  /**
   * 유효한 access token을 반환한다(필요 시 지연 갱신).
   * - bundle 없으면 연결 필요 에러.
   * - 만료 여유분 이내면 그대로 사용.
   * - 만료 임박/초과 + refreshToken 있으면 갱신 후 새 토큰 저장·반환.
   * - refreshToken 없으면 재연결 필요(상태를 disconnected로 내린다).
   *
   * why 비공개 클로저: 공개 계약(CalendarStoreState)에 없는 내부 헬퍼라 외부 노출하지 않는다.
   */
  async function getValidAccessToken(): Promise<string> {
    const { bundle } = get();
    if (!bundle) {
      throw new Error('구글 캘린더에 먼저 연결해 주세요.');
    }

    // 런타임 표준 시각(epoch ms). 여유분을 빼 "거의 만료"도 갱신 대상으로 본다.
    const now = Date.now();
    if (now < bundle.expiresAt - TOKEN_SKEW_MS) {
      return bundle.accessToken;
    }

    // 만료 임박/초과. refresh token이 없으면 재동의(재연결)가 필요하다.
    if (!bundle.refreshToken) {
      set({ status: 'disconnected' });
      throw new Error('구글 인증이 만료되었어요. 다시 연결해 주세요.');
    }

    // refresh 응답에는 email이 없고 refreshToken도 없을 수 있으므로 기존 값을 머지한다.
    const refreshed = await googleAuth.refresh(bundle.refreshToken);
    const merged: GoogleTokenBundle = {
      ...refreshed,
      email: refreshed.email ?? bundle.email,
      refreshToken: refreshed.refreshToken ?? bundle.refreshToken,
    };

    await saveGoogleTokens(merged);
    set({ bundle: merged });
    return merged.accessToken;
  }

  return {
    // ── 초기 상태(SecureStore 복원 전) ──────────────────────────────────────
    status: 'idle',
    email: null,
    error: null,
    hydrated: false,
    isBusy: false,
    bundle: null,

    // ── restore: 앱 시작 1회. SecureStore에서 토큰 복원 후 status 확정. 멱등. ──
    async restore() {
      // 이미 복원 완료면 재실행 불필요.
      if (get().hydrated) return;
      // 진행 중이면 같은 Promise를 기다려 중복 SecureStore 읽기를 막는다.
      if (restoreInFlight) {
        await restoreInFlight;
        return;
      }

      restoreInFlight = (async () => {
        try {
          const bundle = await loadGoogleTokens();
          if (!bundle) {
            // 미연결.
            set({
              bundle: null,
              email: null,
              status: 'disconnected',
              hydrated: true,
            });
            return;
          }

          // 토큰이 있으면 연결 상태로 둔다. 만료됐어도 실제 호출 시점에 지연 갱신하므로
          // 여기서는 connected로 본다(불필요한 갱신 네트워크 호출 방지).
          set({
            bundle,
            email: bundle.email,
            status: 'connected',
            error: null,
            hydrated: true,
          });
        } catch (error) {
          // 복원 실패도 앱 기동은 막지 않는다. 미연결로 두되 hydrated는 켠다.
          console.error('[calendar-store] 토큰 복원 실패:', error);
          set({
            bundle: null,
            email: null,
            status: 'disconnected',
            hydrated: true,
          });
        }
      })();

      try {
        await restoreInFlight;
      } finally {
        restoreInFlight = null;
      }
    },

    // ── connect: OAuth 브라우저 플로우로 연결. ──────────────────────────────
    async connect() {
      // 재진입 가드: 이미 작업 중이면 OAuth 브라우저 세션이 두 번 뜨지 않도록 무시한다.
      // (서로 다른 화면이 동시에 connect를 트리거하는 경우 promptAsync 충돌 방지.)
      if (get().isBusy) return;

      set({ isBusy: true, status: 'connecting', error: null });
      try {
        const result = await googleAuth.connect();

        if (result.type === 'cancel') {
          // 취소는 에러가 아니다. 기존 연결 유무로 상태를 되돌리고 error는 null 유지.
          const hadBundle = get().bundle !== null;
          set({ status: hadBundle ? 'connected' : 'disconnected' });
          return;
        }

        // 성공: SecureStore에 저장하고 메모리·표시 상태를 갱신한다.
        await saveGoogleTokens(result.bundle);
        set({
          bundle: result.bundle,
          email: result.bundle.email,
          status: 'connected',
          error: null,
        });
      } catch (error) {
        // 실제 오류만 error 상태로 둔다. UI가 await 후 status/error로 토스트를 분기한다.
        const message =
          error instanceof Error
            ? error.message
            : '구글 캘린더 연결에 실패했어요. 잠시 후 다시 시도해 주세요.';
        console.error('[calendar-store] connect 실패:', message);
        set({ status: 'error', error: message });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        set({ isBusy: false });
      }
    },

    // ── disconnect: 토큰 폐기(best-effort) + SecureStore 삭제. ───────────────
    async disconnect() {
      set({ isBusy: true });
      try {
        const { bundle } = get();
        // 구글 서버에서 토큰 폐기(best-effort). 실패해도 로컬 삭제는 진행한다.
        if (bundle?.accessToken) {
          await googleAuth.revoke(bundle.accessToken);
        }

        await clearGoogleTokens();
        set({
          bundle: null,
          email: null,
          status: 'disconnected',
          error: null,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '구글 캘린더 연결 해제에 실패했어요. 잠시 후 다시 시도해 주세요.';
        console.error('[calendar-store] disconnect 실패:', message);
        set({ status: 'error', error: message });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        set({ isBusy: false });
      }
    },

    // ── registerCapture: 캡처 이벤트를 캘린더에 등록 + captures/스토어 갱신. ──
    async registerCapture(args: {
      captureId: string;
      event: CaptureEvent;
    }): Promise<CalendarRegistration> {
      // 미연결이면 등록할 수 없다(토큰 갱신 시도 전에 즉시 차단).
      if (get().status !== 'connected') {
        throw new Error('구글 캘린더에 먼저 연결해 주세요.');
      }

      set({ isBusy: true });
      try {
        const { captureId, event } = args;
        // 결정적 id로 멱등 등록한다(같은 캡처 재등록 시 캘린더 중복 생성 방지).
        const eventId = makeCalendarEventId(captureId);
        const input = mapEventToCalendarInput(event, eventId);

        // 토큰 만료(401)면 강제 갱신 후 1회만 재시도하는 등록 호출.
        const insertWithRefresh = async (): Promise<GoogleCalendarEventResult> => {
          let token = await getValidAccessToken();
          try {
            return await insertEvent(token, input);
          } catch (error) {
            if (error instanceof CalendarUnauthorizedError) {
              // 캐시 토큰이 서버에서 무효화됨. 만료시각을 0으로 만들어 강제 갱신을 유도한다.
              const { bundle } = get();
              if (bundle) {
                set({ bundle: { ...bundle, expiresAt: 0 } });
              }
              token = await getValidAccessToken();
              return await insertEvent(token, input);
            }
            throw error;
          }
        };

        let result: GoogleCalendarEventResult;
        try {
          result = await insertWithRefresh();
        } catch (error) {
          if (error instanceof CalendarConflictError) {
            // 같은 결정적 id가 이미 캘린더에 있음 → 중복 없이 "등록됨"으로 처리(멱등).
            // why: 직전 등록은 성공했으나 DB 반영(markCaptureCalendarRegistered)이 실패한 뒤
            // 사용자가 재시도한 경우. 캘린더엔 그대로 두고 DB만 다시 맞춘다.
            result = { id: eventId, htmlLink: null };
          } else {
            throw error;
          }
        }

        // 등록 시점의 표준 ISO8601 시각. captures 기록·반환 모두 동일 값 사용.
        const syncedAt = new Date().toISOString();
        await markCaptureCalendarRegistered({
          captureId,
          eventId: result.id,
          htmlLink: result.htmlLink,
          syncedAt,
        });

        return {
          eventId: result.id,
          htmlLink: result.htmlLink,
          syncedAt,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '일정을 캘린더에 등록하지 못했어요. 잠시 후 다시 시도해 주세요.';
        console.error('[calendar-store] registerCapture 실패:', message);
        throw error instanceof Error ? error : new Error(message);
      } finally {
        set({ isBusy: false });
      }
    },
  };
});
