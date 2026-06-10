-- supabase/migrations/0006_calendar.sql
-- Memsum 구글 캘린더 연동 — 등록 결과 추적 컬럼 추가.
--
-- captures(0001_init.sql)에 캘린더 등록 메타데이터를 비파괴적으로 추가한다.
--   - calendar_event_id   : 등록된 Google Calendar 이벤트 id(중복 등록 판별·삭제 동기화용).
--   - calendar_html_link  : "구글 캘린더에서 열기" 딥링크(events.insert 응답 htmlLink).
--   - calendar_synced_at  : 마지막 동기화 시각(등록 시점 표시·재시도 판단용).
--   세 컬럼 모두 nullable이라 기존 행/처리 흐름에 영향이 없다(미등록=NULL).
--
-- 등록 완료 시 클라이언트(calendar-store)가 status='calendar_added'로도 갱신한다.
-- status enum(0001)에 'calendar_added'가 이미 있으므로 스키마 변경 불필요.
--
-- RLS: captures의 기존 행 단위 정책("own captures": auth.uid() = user_id)이
--   새 컬럼도 그대로 커버한다(컬럼이 아니라 행 단위 적용 → 추가 정책 불필요).

alter table public.captures
  add column calendar_event_id text,
  add column calendar_html_link text,
  add column calendar_synced_at timestamptz;

-- 캘린더 탭은 "이벤트가 있고(parsed_event.event 존재) 등록 여부로 나뉜" 캡처를
-- 최신순으로 조회한다. 등록된 행을 빠르게 거르도록 user_id + 등록시각 부분 인덱스를 둔다.
create index on public.captures (user_id, calendar_synced_at desc)
  where calendar_event_id is not null;
