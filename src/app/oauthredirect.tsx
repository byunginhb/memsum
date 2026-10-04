import { Redirect } from 'expo-router';

/**
 * OAuth redirect 랜딩 라우트.
 *
 * why: 구글 OAuth 브라우저 redirect(makeRedirectUri가 만드는 memsum://oauthredirect)는
 * 인증 코드를 expo-web-browser의 auth 세션이 캡처하는 것과 별개로, OS 딥링크로도 앱에
 * 전달된다. app.json scheme 배열에 등록된 어떤 스킴으로 와도 Expo Router는 이를
 * memsum://oauthredirect(=/oauthredirect)로 정규화하는데, 이 경로에 라우트가 없으면
 * 기본 "Unmatched Route(+not-found)" 화면이 뜬다.
 *
 * 인증 코드 처리는 google-auth.connect()가 담당하므로 이 화면은 아무 일도 하지 않고
 * 사용자를 홈으로 즉시 되돌려, 딥링크 이중 전달로 인한 not-found 잔상만 제거한다.
 */
export default function OAuthRedirect() {
  return <Redirect href="/" />;
}
