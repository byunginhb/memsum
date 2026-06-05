-- supabase/migrations/0001_init.sql
-- Memsum 초기 스키마: user_profiles, captures + RLS
-- W1-수정.md §5 기준

create table public.user_profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  timezone text default 'Asia/Seoul',
  created_at timestamptz default now()
);

create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  image_url text not null,
  ocr_text text,
  parsed_event jsonb,
  source_platform text check (source_platform in ('ios','android')),
  status text default 'pending' check (status in ('pending','ocr_done','calendar_added','failed')),
  created_at timestamptz default now()
);

-- user_id + 최신순 조회를 자주 하므로 복합 인덱스 생성
create index on public.captures (user_id, created_at desc);

-- RLS 활성화: 정책이 없으면 모든 접근 차단(기본값)이므로 반드시 정책과 함께 설정
alter table public.user_profiles enable row level security;
alter table public.captures enable row level security;

-- 본인 프로필만 읽기/쓰기/수정/삭제 가능
create policy "own profile" on public.user_profiles
  for all using (auth.uid() = id);

-- 본인이 업로드한 캡처만 읽기/쓰기/수정/삭제 가능
create policy "own captures" on public.captures
  for all using (auth.uid() = user_id);
