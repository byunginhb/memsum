// 구글 OAuth 명령형(imperative) 래퍼 — zustand 스토어에서 호출하기 위한 모듈.
//
// 왜 이렇게 설계했는가(why):
// - 네이티브 Authorization Code + PKCE 플로우를 쓴다. 모바일 앱은 client secret을
//   안전하게 보관할 수 없는 "public client"이므로, 시크릿 없이 PKCE(code_verifier/
//   code_challenge)로 코드 가로채기 공격을 막는다. 그래서 어떤 시크릿도 코드에 두지 않는다.
// - useAuthRequest 같은 React 훅이 아니라 AuthSession.AuthRequest 클래스를 직접 쓴다.
//   이 모듈은 zustand 스토어(비-React 컨텍스트)에서 호출되므로 훅을 쓸 수 없다.
// - 스코프는 calendar 전체가 아니라 "calendar.events" 최소 스코프만 요청한다.
//   우리는 이벤트 생성만 하면 되므로 과도한 권한을 받지 않아 사용자 신뢰·심사에 유리하다.
// - access_type=offline + prompt=consent 로 refresh token을 확보해, 만료 시 재동의 없이
//   갱신한다(오프라인 접근).
//
// 보안: accessToken/refreshToken 등 토큰 문자열 값은 절대 console에 남기지 않는다.

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { GoogleTokenBundle } from '@/features/calendar/types';

// 인증 세션이 브라우저에서 앱으로 돌아왔을 때 보류 중인 세션을 정리한다.
// 모듈 로드 시 1회만 호출하면 된다(앱 시작 시 redirect 처리 보장).
WebBrowser.maybeCompleteAuthSession();

// 구글 OAuth 2.0 엔드포인트(디스커버리). expo-auth-session에 직접 전달한다.
const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
} as const;

// 연결된 계정 이메일을 조회하기 위한 OpenID userinfo 엔드포인트.
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

// 최소 권한 원칙: openid/email + 캘린더 "이벤트" 권한만. calendar 전체 권한은 받지 않는다.
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
];

// iOS 클라이언트 ID 환경변수 접미사. reversed scheme 생성 시 제거 대상.
const GOOGLE_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

// access token 만료시간(expiresIn) 미제공 시 사용할 보수적 기본값(초). 구글 기본 1시간.
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

// 표시용 이메일 최대 길이(방어적 상한). 비정상 응답이 UI에 그대로 노출되는 것을 막는다.
const MAX_EMAIL_LENGTH = 320;

// 초→밀리초 변환 상수(epoch ms 계산용).
const MS_PER_SECOND = 1000;

/**
 * 현재 플랫폼에 맞는 구글 OAuth 클라이언트 ID를 반환한다.
 * iOS/Android 클라이언트 ID가 다르므로 분기한다. 미설정 시 명확히 throw.
 */
function clientId(): string {
  const id =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      : process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  if (!id) {
    const which = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';
    throw new Error(
      `구글 로그인 설정 누락: .env에 EXPO_PUBLIC_GOOGLE_${which}_CLIENT_ID를 추가하세요.`,
    );
  }
  return id;
}

/**
 * 클라이언트 ID로부터 iOS/Android용 reversed URL scheme을 만든다.
 * 구글이 발급하는 redirect용 커스텀 스킴 규칙: 접미사를 떼고 앞에 reverse prefix를 붙인다.
 * 예) "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc"
 */
function reversedScheme(id: string): string {
  const prefix = id.endsWith(GOOGLE_CLIENT_ID_SUFFIX)
    ? id.slice(0, id.length - GOOGLE_CLIENT_ID_SUFFIX.length)
    : id;
  return 'com.googleusercontent.apps.' + prefix;
}

/**
 * OAuth redirect URI를 생성한다.
 * 이 reversed-scheme 기반 native redirect는 app.json의 scheme 배열에 등록돼 있어야
 * 브라우저가 앱으로 정상 복귀한다.
 */
function redirectUri(): string {
  return AuthSession.makeRedirectUri({
    native: reversedScheme(clientId()) + ':/oauthredirect',
  });
}

/**
 * 토큰 응답으로부터 만료 시각(epoch ms)을 계산한다.
 * issuedAt(초)+expiresIn(초)이 둘 다 있으면 그 합을 ms로, 없으면 현재시각 기준으로 계산한다.
 */
function computeExpiresAt(
  issuedAt: number | undefined,
  expiresIn: number | undefined,
): number {
  if (typeof issuedAt === 'number' && typeof expiresIn === 'number') {
    return (issuedAt + expiresIn) * MS_PER_SECOND;
  }
  const lifetimeSeconds = expiresIn ?? DEFAULT_EXPIRES_IN_SECONDS;
  return Date.now() + lifetimeSeconds * MS_PER_SECOND;
}

/**
 * userinfo 엔드포인트로 연결 계정 이메일을 조회한다.
 * 실패해도 치명적이지 않으므로 null을 반환한다(연결 자체는 성공시킨다).
 */
async function fetchEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(USERINFO_URL, {
      headers: { Authorization: 'Bearer ' + accessToken },
    });
    if (!response.ok) {
      // 상태 코드만 기록(토큰 값은 절대 로그에 남기지 않는다).
      console.error('[google-auth] userinfo 조회 실패: HTTP', response.status);
      return null;
    }
    const json = (await response.json()) as { email?: unknown };
    // 외부 응답(신뢰 경계)이므로 표시·저장 전에 형식을 검증한다.
    // 문자열 + '@' 포함 + 상한 길이만 통과시키고, 아니면 null(연결 자체는 성공시킨다).
    const email = json.email;
    if (
      typeof email === 'string' &&
      email.length > 0 &&
      email.length <= MAX_EMAIL_LENGTH &&
      email.includes('@')
    ) {
      return email;
    }
    return null;
  } catch (error) {
    console.error('[google-auth] userinfo 조회 중 오류:', error);
    return null;
  }
}

/** connect() 결과: 성공이면 토큰 번들, 사용자가 취소/디스미스했으면 cancel. */
export type GoogleAuthResult =
  | { type: 'success'; bundle: GoogleTokenBundle }
  | { type: 'cancel' };

/**
 * 구글 OAuth 브라우저 플로우(Authorization Code + PKCE)를 실행한다.
 * 성공 시 토큰 번들을 반환하고, 사용자가 취소/디스미스/오류로 끝나면 cancel을 반환한다.
 * (오류여도 throw하지 않고 cancel로 합쳐 호출측 분기를 단순화한다.)
 */
export async function connect(): Promise<GoogleAuthResult> {
  try {
    const request = new AuthSession.AuthRequest({
      clientId: clientId(),
      scopes: SCOPES,
      redirectUri: redirectUri(),
      usePKCE: true,
      // offline 접근으로 refresh token 확보, consent로 매번 동의 화면을 띄워 누락 방지.
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });

    await request.makeAuthUrlAsync(DISCOVERY);
    const result = await request.promptAsync(DISCOVERY);

    if (result.type !== 'success') {
      // 취소/디스미스/오류 모두 cancel로 처리. 오류면 사유만 기록(토큰 없음).
      if (result.type === 'error') {
        console.error(
          '[google-auth] 인증 응답 오류:',
          result.error?.message ?? result.params?.error ?? 'unknown',
        );
      }
      return { type: 'cancel' };
    }

    const code = result.params.code;
    const codeVerifier = request.codeVerifier;
    if (!code || !codeVerifier) {
      throw new Error(
        '구글 로그인 실패: 인증 코드 또는 PKCE 검증값을 받지 못했습니다.',
      );
    }

    const token = await AuthSession.exchangeCodeAsync(
      {
        clientId: clientId(),
        code,
        redirectUri: redirectUri(),
        extraParams: { code_verifier: codeVerifier },
      },
      DISCOVERY,
    );

    const email = await fetchEmail(token.accessToken);
    const expiresAt = computeExpiresAt(token.issuedAt, token.expiresIn);

    const bundle: GoogleTokenBundle = {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken ?? null,
      expiresAt,
      email,
      scope: token.scope ?? SCOPES.join(' '),
    };
    return { type: 'success', bundle };
  } catch (error) {
    console.error('[google-auth] 연결 중 오류:', error);
    throw new Error('구글 캘린더 연결에 실패했어요. 잠시 후 다시 시도해주세요.');
  }
}

/**
 * refresh token으로 access token을 갱신한다.
 * 응답에 새 refresh token이 없으면 입력값을 유지한다(구글은 보통 재발급하지 않음).
 * email은 호출측이 기존 값을 유지하도록 null로 둔다.
 */
export async function refresh(refreshToken: string): Promise<GoogleTokenBundle> {
  try {
    const token = await AuthSession.refreshAsync(
      {
        clientId: clientId(),
        refreshToken,
        extraParams: {},
      },
      DISCOVERY,
    );

    const expiresAt = computeExpiresAt(token.issuedAt, token.expiresIn);

    return {
      accessToken: token.accessToken,
      // 새 refresh token이 없으면 기존 것을 유지한다.
      refreshToken: token.refreshToken ?? refreshToken,
      expiresAt,
      email: null,
      scope: token.scope ?? SCOPES.join(' '),
    };
  } catch (error) {
    console.error('[google-auth] 토큰 갱신 중 오류:', error);
    throw new Error('구글 인증 갱신에 실패했어요. 다시 연결해주세요.');
  }
}

/**
 * 토큰을 구글에서 폐기한다(best-effort).
 * 실패해도 로컬 연결 해제는 진행돼야 하므로 throw하지 않고 사유만 기록한다.
 */
export async function revoke(token: string): Promise<void> {
  try {
    await AuthSession.revokeAsync({ token }, DISCOVERY);
  } catch (error) {
    // 토큰 값은 로그에 남기지 않는다.
    console.error('[google-auth] 토큰 폐기 실패(무시하고 계속):', error);
  }
}
