-- supabase/migrations/20261004120000_usage_limits.sql
-- Memsum 사용자별 일일 호출 상한(비용 폭탄 방지).
--
-- process-capture(Edge Function)가 OpenAI를 부르기 전에 consume_daily_usage()로 1을 소비한다.
-- weekly-report도 진행 중인 주를 OpenAI로 재생성할 때만 같은 함수로 소비한다(kind 별도).
-- 상한을 넘으면 false → 함수가 429(rate_limited)로 거절한다.
--
-- 설계:
--   - 카운터 테이블은 RLS 활성 + 본인 행 "읽기"만 허용. 쓰기 정책은 두지 않는다
--     (클라이언트가 직접 카운터를 0으로 되돌리는 것을 막기 위해).
--   - 증가는 security definer 함수가 auth.uid() 기준으로만 수행한다(남의 카운터 조작 불가).
--     함수를 직접 RPC로 불러도 자기 카운터만 늘어나므로 우회 이득이 없다.
--   - 하루 경계는 UTC 날짜(서버 단일 기준 — 사용자 시간대와 무관하게 단순·예측 가능).
--   - "내 데이터 삭제"(src/lib/account.ts) 대상에서 제외: 개인 콘텐츠가 아닌 횟수 기록이며,
--     지우면 상한 우회가 가능해진다.

create table public.usage_counters (
  user_id    uuid not null references auth.users on delete cascade,
  usage_date date not null,
  kind       text not null,
  count      integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, kind)
);

alter table public.usage_counters enable row level security;

create policy "users read own usage"
  on public.usage_counters
  for select
  using (auth.uid() = user_id);

-- 원자적 소비: 같은 날 같은 kind 행을 upsert로 1 증가시키고, 증가 후 값이 상한 이하인지 반환한다.
-- 동시 요청도 행 잠금(on conflict do update)으로 직렬화돼 상한을 넘겨 통과하지 않는다.
create or replace function public.consume_daily_usage(p_kind text, p_limit integer)
returns boolean
language plpgsql
security definer
-- 빈 search_path: security definer 함수가 호출자 스키마의 같은 이름 객체로 가로채이지 않게 한다.
-- 그래서 본문의 테이블·함수는 모두 스키마 한정(public.·auth.)으로 쓴다(now·length는 pg_catalog 암묵 탐색).
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_count integer;
begin
  if v_user is null then
    return false;
  end if;
  if p_kind is null or length(p_kind) = 0 or length(p_kind) > 64 or p_limit is null or p_limit < 1 then
    return false;
  end if;

  insert into public.usage_counters as uc (user_id, usage_date, kind, count, updated_at)
  values (v_user, (now() at time zone 'utc')::date, p_kind, 1, now())
  on conflict (user_id, usage_date, kind)
  do update set count = uc.count + 1, updated_at = now()
  returning uc.count into v_count;

  return v_count <= p_limit;
end;
$$;

-- 익명 키(비로그인)로는 호출 불가. 로그인(익명 로그인 포함) 사용자만.
revoke all on function public.consume_daily_usage(text, integer) from public;
revoke all on function public.consume_daily_usage(text, integer) from anon;
grant execute on function public.consume_daily_usage(text, integer) to authenticated;
