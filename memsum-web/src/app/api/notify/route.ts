// 출시 알림 신청 이메일 수집 엔드포인트.
//
// why 서버 라우트: 허니팟 검사·검증을 서버에서 하고, Supabase 호출을 클라이언트에
// 노출하지 않는다. 저장은 anon 키 + RLS "insert 전용" 정책으로 한다(테이블에 select
// 정책이 없어 anon 키로는 이메일을 절대 열람할 수 없음 → service_role 불필요).
//
// 보안: 토큰/키 값은 로그에 남기지 않는다. 중복 이메일은 조용히 성공 처리(재신청 허용).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NotifyBody = {
  email?: unknown;
  locale?: unknown;
  // 허니팟: 사람에겐 숨겨진 필드. 봇이 채우면 저장 없이 성공으로 흘려보낸다.
  company?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let body: NotifyBody;
  try {
    body = (await request.json()) as NotifyBody;
  } catch {
    return Response.json({ error: 'invalid_request' }, { status: 400 });
  }

  // 허니팟이 채워졌으면 봇으로 간주 — 저장하지 않고 성공처럼 응답(스팸에 신호 주지 않음).
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    return Response.json({ ok: true });
  }

  if (typeof body.email !== 'string' || !EMAIL_RE.test(body.email.trim())) {
    return Response.json({ error: 'invalid_email' }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const locale = body.locale === 'en' ? 'en' : 'ko';

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('[notify] Supabase 환경변수 미설정(SUPABASE_URL/SUPABASE_ANON_KEY)');
    return Response.json({ error: 'unconfigured' }, { status: 503 });
  }

  try {
    // 평문 INSERT만 사용한다. upsert(on_conflict + resolution)는 UPDATE 정책까지
    // 요구하는데 이 테이블은 INSERT 전용 RLS라 업서트 시 42501로 막힌다(실측 확인).
    // 중복(unique 위반=409)은 아래에서 성공으로 처리한다.
    const res = await fetch(`${url}/rest/v1/launch_waitlist`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ email, locale }),
    });

    // 이미 신청된 이메일(unique 위반) → 재신청도 성공으로 응답.
    if (res.status === 409) {
      return Response.json({ ok: true });
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notify] Supabase insert 실패:', res.status, detail);
      return Response.json({ error: 'store_failed' }, { status: 502 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[notify] insert 중 오류:', err);
    return Response.json({ error: 'store_failed' }, { status: 502 });
  }
}
