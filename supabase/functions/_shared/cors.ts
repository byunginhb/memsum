// supabase/functions/_shared/cors.ts
// Edge Function 공통 CORS 헤더.
// 클라이언트(Expo 앱·WebView)에서 직접 호출하므로 preflight(OPTIONS) 응답이 필요하다.
// Authorization 헤더를 명시 허용해야 JWT 기반 RLS 컨텍스트 전달이 가능하다.

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
