-- 0009의 INSERT 정책이 anon 신청을 막던 문제 수정(42501 new row violates RLS).
-- 정책을 명시적으로 재생성하고, 권한도 명시 부여한다(방어적 이중화).
-- 여전히 SELECT/UPDATE/DELETE 정책은 없으므로 anon 키로 이메일 열람은 불가하다.

grant insert on table public.launch_waitlist to anon, authenticated;

drop policy if exists "waitlist insert only" on public.launch_waitlist;
create policy "waitlist insert only"
  on public.launch_waitlist
  as permissive
  for insert
  to anon, authenticated
  with check (true);
