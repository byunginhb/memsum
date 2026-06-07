-- supabase/migrations/0004_weekly_reports.sql
-- Memsum 주간 5줄 리포트(Hero Moment) 스키마: weekly_reports, report_feedback + RLS
--
-- weekly_reports: 한 주(week_start ~ week_end)에 대해 gpt-4o-mini가 선별·랭킹한
--   상위 5개 캡처 결과를 캐시한다. unique(user_id, week_start)로 주당 1행만 유지해
--   재호출 시 OpenAI를 다시 부르지 않고 캐시를 즉시 반환한다(비용·지연 절감).
-- report_feedback: 각 리포트 항목(캡처)에 대한 up/down 피드백. 추후 랭킹 학습용 신호.
--
-- 두 테이블 모두 RLS 활성화 + (auth.uid() = user_id) 정책. user_id는 auth.users 직참조
--   (0001_init.sql captures 패턴 동일). FK는 on delete cascade로 정리.

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- 주 시작(월요일, KST 기준 날짜)·종료(일요일). 날짜 단위라 date 타입.
  week_start date not null,
  week_end date not null,
  -- 그 주에 존재한 전체 캡처 수(서브타이틀 "{total}개 중" 표시용).
  total_captures integer not null default 0,
  -- 선별된 캡처 id 배열(랭크 순). items와 중복 정보지만 빠른 조회/조인용.
  selected_capture_ids uuid[] not null default '{}',
  -- 항목 배열 jsonb: [{ capture_id, rank, title, summary }]. <5건이면 빈 배열([]).
  items jsonb not null default '[]'::jsonb,
  -- 리포트가 실제 생성(OpenAI 호출 또는 폴백 완료)된 시각.
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- 주당 1행만: 동일 주 재요청 시 upsert로 캐시를 갱신/재사용한다.
  unique (user_id, week_start)
);

create table public.report_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  -- 어떤 캡처에 대한 피드백인지. 캡처 삭제 시 함께 정리.
  capture_id uuid not null references public.captures on delete cascade,
  -- 어떤 주간 리포트 맥락의 피드백인지. 리포트 삭제 시 함께 정리.
  weekly_report_id uuid not null references public.weekly_reports on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  created_at timestamptz not null default now(),
  -- 한 리포트의 한 캡처에 대해 사용자당 1개 피드백만(재선택 시 upsert로 갱신).
  unique (user_id, weekly_report_id, capture_id)
);

-- 주간 리포트는 최신 주부터 자주 조회한다(week_start desc).
create index on public.weekly_reports (user_id, week_start desc);
-- 자료실/최근 생성순 조회용.
create index on public.weekly_reports (user_id, created_at desc);
-- 피드백 조회는 사용자 + 리포트 단위가 잦다.
create index on public.report_feedback (user_id, weekly_report_id);

-- RLS 활성화: 정책이 없으면 기본 차단이므로 반드시 정책과 함께 설정(CLAUDE.md §7).
alter table public.weekly_reports enable row level security;
alter table public.report_feedback enable row level security;

-- 본인 리포트만 읽기/쓰기/수정/삭제 가능.
create policy "own weekly reports" on public.weekly_reports
  for all using (auth.uid() = user_id);

-- 본인 피드백만 읽기/쓰기/수정/삭제 가능.
create policy "own report feedback" on public.report_feedback
  for all using (auth.uid() = user_id);
