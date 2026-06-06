-- supabase/migrations/0002_storage.sql
-- 캡처 원본 이미지 저장용 Storage 버킷 + RLS.
-- 경로 규칙: captures-raw/{user_id}/{capture_id}.jpg (첫 폴더 = 소유자 uid)

-- 비공개 버킷. 10MB 제한, 이미지 MIME만 허용.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'captures-raw', 'captures-raw', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 본인 폴더(첫 경로 세그먼트 = auth.uid()) 객체만 접근. 재적용 안전을 위해 drop 후 생성.
drop policy if exists "captures-raw read own" on storage.objects;
create policy "captures-raw read own" on storage.objects
  for select using (
    bucket_id = 'captures-raw' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "captures-raw insert own" on storage.objects;
create policy "captures-raw insert own" on storage.objects
  for insert with check (
    bucket_id = 'captures-raw' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "captures-raw update own" on storage.objects;
create policy "captures-raw update own" on storage.objects
  for update using (
    bucket_id = 'captures-raw' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "captures-raw delete own" on storage.objects;
create policy "captures-raw delete own" on storage.objects
  for delete using (
    bucket_id = 'captures-raw' and (storage.foldername(name))[1] = auth.uid()::text
  );
