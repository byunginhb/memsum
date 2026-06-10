// 구글 OAuth 토큰 번들(GoogleTokenBundle)을 SecureStore(Keychain/Keystore)에
// 안전하게 저장/복원/삭제하는 얇은 래퍼.
//
// why SecureStore: accessToken·refreshToken은 시크릿이므로 AsyncStorage(평문) 금지.
// iOS Keychain / Android Keystore에 암호화 저장한다(calendar/types.ts C2 계약 참조).
//
// why try/catch 전체: expo-secure-store는 RN 네이티브 전용이라 웹/SSR에서 호출되면
// 모듈이 없거나 예외가 발생할 수 있다. 모든 경로를 graceful 처리해 앱이 죽지 않게 한다.
//
// 보안: 토큰 값 자체는 절대 로그에 남기지 않는다(키 존재 여부·길이 정도만 기록).

import * as SecureStore from 'expo-secure-store';

import type { GoogleTokenBundle } from '@/features/calendar/types';

// SecureStore 단일 저장 키. 모든 토큰 번들을 이 키 하나에 JSON으로 저장한다.
const STORAGE_KEY = 'memsum.google.tokens';

// SecureStore 항목 크기 제한(안드로이드 Keystore 약 2KB).
// GoogleTokenBundle은 토큰 문자열 몇 개라 수백 바이트 수준이므로 제한에 걸리지 않는다.
// (참고 상수: 초과 시 저장 실패하므로 향후 필드 추가 시 주의)
const ANDROID_SECURE_STORE_MAX_BYTES = 2048;

/**
 * 토큰 번들을 SecureStore에 JSON 직렬화해 저장한다.
 * why throw: 저장 실패는 호출 측(연결/갱신 플로우)이 사용자에게 알려야 하므로
 * 삼키지 않고 다시 던진다.
 */
export async function saveGoogleTokens(
  bundle: GoogleTokenBundle,
): Promise<void> {
  try {
    const serialized = JSON.stringify(bundle);

    // why 길이 경고: 토큰 값은 로그에 남기지 않되, 크기 제한 초과는 디버깅에 필요.
    if (serialized.length > ANDROID_SECURE_STORE_MAX_BYTES) {
      console.warn(
        `[secure-tokens] 토큰 번들 크기(${serialized.length}B)가 SecureStore ` +
          `안드로이드 제한(${ANDROID_SECURE_STORE_MAX_BYTES}B)에 근접/초과했습니다.`,
      );
    }

    await SecureStore.setItemAsync(STORAGE_KEY, serialized);
  } catch (error) {
    // 토큰 값은 로그 금지. 실패 사실만 기록.
    console.error('[secure-tokens] 토큰 저장 실패:', error);
    throw new Error(
      '구글 토큰을 안전하게 저장하지 못했습니다. 잠시 후 다시 시도해주세요.',
    );
  }
}

/**
 * SecureStore에서 토큰 번들을 복원한다.
 * - 항목이 없으면 null(미연결 상태).
 * - JSON 파싱 실패(손상 데이터)면 best-effort로 해당 항목을 삭제하고 null 반환.
 *   why clear: 손상된 값이 계속 남아 매 복원마다 실패하는 것을 막기 위함.
 */
export async function loadGoogleTokens(): Promise<GoogleTokenBundle | null> {
  let raw: string | null = null;

  try {
    raw = await SecureStore.getItemAsync(STORAGE_KEY);
  } catch (error) {
    // 웹/네이티브 미지원 환경 등에서 읽기 자체가 실패할 수 있음 → null로 graceful 처리.
    console.error('[secure-tokens] 토큰 읽기 실패:', error);
    return null;
  }

  // 저장된 항목 없음 = 미연결.
  if (raw == null) {
    return null;
  }

  try {
    // why as: 저장 시점에 GoogleTokenBundle만 직렬화하므로 형태를 신뢰한다.
    const parsed = JSON.parse(raw) as GoogleTokenBundle;
    return parsed;
  } catch (error) {
    // 손상 데이터: 값도 길이도 로그하지 않는다(사이드채널 최소화). 사실만 기록.
    console.error(
      '[secure-tokens] 토큰 JSON 파싱 실패(손상 데이터). 항목을 삭제합니다.',
      error,
    );

    // 손상 항목 best-effort 삭제. 이 정리 자체가 실패해도 복원은 null로 진행.
    try {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    } catch (clearError) {
      console.error('[secure-tokens] 손상 토큰 항목 삭제 실패:', clearError);
    }

    return null;
  }
}

/**
 * SecureStore에서 토큰 번들을 삭제한다(로그아웃/연결 해제 시).
 * why throw: 삭제 실패는 보안상 중요(시크릿 잔존)하므로 호출 측이 인지하도록 던진다.
 */
export async function clearGoogleTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (error) {
    console.error('[secure-tokens] 토큰 삭제 실패:', error);
    throw new Error(
      '구글 토큰을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.',
    );
  }
}
