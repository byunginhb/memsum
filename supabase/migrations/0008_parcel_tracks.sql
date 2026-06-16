-- supabase/migrations/0008_parcel_tracks.sql
-- Memsum 택배 추적(한국 한정·옵션) — 운송장 추적 상태 테이블.
--
-- 택배 SMS 스크린샷에서 추출한 운송장을 SweetTracker(스마트택배) API로 조회한 결과를
-- 사용자별로 보관한다. MVP 범위: 서버 cron·푸시·캘린더 자동등록 없음(클라이언트가 앱 진입 시
-- track-parcel Edge Function으로 갱신 + 로컬 알림). 상태 변화 이벤트는 events(jsonb)에 누적.
--
-- 한국 택배 API는 며칠 후 도착 ETA를 제공하지 않으므로(상태 이벤트 level 1~6만),
-- level/state로 "추적 중 / 오늘 도착 예상(level>=5) / 배송완료(level 6)"만 표현한다.
--
-- RLS: captures(0001) 패턴과 동일 — 행 단위 (auth.uid() = user_id). user_id 필수(CLAUDE.md §7).
-- 개인정보(수령인·주소·기사 연락처)는 저장하지 않는다(track-parcel이 응답에서 제거 후 반환).

create table public.parcel_tracks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  -- 출처 캡처(스크린샷). 캡처가 지워져도 추적은 남도록 set null.
  capture_id        uuid references public.captures on delete set null,
  carrier_code      text not null,                 -- SweetTracker t_code
  carrier_name      text,                          -- 표시용 택배사명
  invoice_no        text not null,                 -- 운송장번호(숫자만)
  level             integer not null default 0,    -- 0=미조회, 1~6(준비/집화/배송중/지점/출발/완료)
  status_text       text,                          -- 마지막 진행 상태(kind, 예 "배송출발")
  last_where        text,                          -- 마지막 위치(허브명 — 개인정보 아님)
  estimate          text,                          -- 당일 배송 시간대(택배사 제공 시, 예 "19~21시")
  events            jsonb not null default '[]'::jsonb, -- [{level,kind,where,timeString}] 최신순
  last_event_at     timestamptz,                   -- 마지막 이벤트 시각
  last_checked_at   timestamptz,                   -- 마지막 폴링 시각(주기 제어용)
  delivered_at      timestamptz,                   -- 배송완료(level 6) 시각
  state             text not null default 'active'
                      check (state in ('active', 'delivered', 'stopped')),
  -- 로컬 알림 중복 방지 플래그.
  notified_out_for_delivery boolean not null default false,
  notified_delivered        boolean not null default false,
  created_at        timestamptz not null default now(),
  -- 같은 사용자가 같은 택배를 중복 추적하지 않도록.
  unique (user_id, carrier_code, invoice_no)
);

alter table public.parcel_tracks enable row level security;

create policy "own parcels"
  on public.parcel_tracks
  for all
  using (auth.uid() = user_id);

-- 홈 "배송 현황"은 활성 추적만 조회 → (user_id, state) 인덱스.
create index parcel_tracks_user_state_idx
  on public.parcel_tracks (user_id, state);
