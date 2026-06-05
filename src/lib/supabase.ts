// URL polyfill은 Supabase가 내부적으로 URL 클래스를 사용하므로
// RN 환경에서 Node.js URL API를 polyfill해야 크래시가 나지 않는다
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// 키가 없을 때 앱이 크래시하지 않도록 graceful 처리.
// 개발 초기(키 미설정) 단계에서도 앱 기동은 가능해야 한다.
if (!url || !key) {
  console.warn(
    '[Supabase] EXPO_PUBLIC_SUPABASE_URL 또는 EXPO_PUBLIC_SUPABASE_ANON_KEY가 설정되지 않았습니다. ' +
      '.env 파일에 키를 추가하세요. Supabase 기능이 비활성화됩니다.',
  );
}

// 키가 있을 때만 클라이언트 생성, 없으면 null.
// 호출 측은 getSupabase()를 통해 안전하게 접근한다.
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          // 세션을 AsyncStorage에 영속화해 앱 재시작 후에도 로그인 상태 유지
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          // RN은 딥링크 방식이므로 URL에서 세션을 감지할 필요 없음
          detectSessionInUrl: false,
        },
      })
    : null;

/**
 * Supabase 클라이언트를 반환한다.
 * 키가 설정되지 않은 상태에서 호출하면 명확한 에러를 던져
 * 디버깅 시간을 줄인다.
 */
export function getSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase 미설정: .env에 EXPO_PUBLIC_SUPABASE_URL과 EXPO_PUBLIC_SUPABASE_ANON_KEY를 넣으세요.',
    );
  }
  return supabase;
}

/**
 * Supabase 키가 올바르게 설정되었는지 확인한다.
 * 키 미설정 시 Supabase 기능을 조건부로 렌더링할 때 사용한다.
 */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
