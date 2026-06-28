-- 출시 알림 신청 이메일 수집(랜딩 waitlist).
-- why: 앱 미출시 상태에서 "출시되면 가장 먼저 사용" 신청 이메일을 모은다.
--      출시 시 1회 발송 후 삭제 예정(개인정보 최소 수집·보관).
-- 보안: RLS 켜고 INSERT 정책만 둔다. SELECT/UPDATE/DELETE 정책이 없으므로
--       anon 키로는 이메일을 절대 열람·수정·삭제할 수 없다(공개 신청만 허용).

create table if not exists public.launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- 출시 안내를 보낼 언어(ko/en). 신청 시점 랜딩 로케일.
  locale text,
  created_at timestamptz not null default now(),
  -- 출시 알림 발송 시각(발송 후 일괄 삭제 전 표시용). 미발송이면 null.
  notified_at timestamptz,
  constraint launch_waitlist_email_unique unique (email),
  -- 직접 API 호출로 들어오는 비정상 값 방어(서버 검증과 이중화).
  constraint launch_waitlist_email_format
    check (email ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'),
  constraint launch_waitlist_locale_check
    check (locale is null or locale in ('ko', 'en'))
);

alter table public.launch_waitlist enable row level security;

-- 공개 신청: anon/authenticated는 INSERT만. 열람 정책은 두지 않는다.
drop policy if exists "waitlist insert only" on public.launch_waitlist;
create policy "waitlist insert only"
  on public.launch_waitlist
  for insert
  to anon, authenticated
  with check (true);
