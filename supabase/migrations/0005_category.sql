-- supabase/migrations/0005_category.sql
-- Memsum 캡처 카테고리 분류 컬럼 추가 (홈 "주제별 묶음" + 검색 필터용).
--
-- captures(0001_init.sql)에 category 컬럼을 비파괴적으로 추가한다.
--   - 6종 enum(check)으로 값을 제한하고 기본값 'etc'(미분류)로 둔다.
--   - process-capture Edge Function이 gpt-4o-mini 분류 결과를 이 컬럼에 기록한다.
--   - 기존 행은 default 'etc'로 채워지므로 데이터 손실/마이그레이션 실패 없음.
--
-- RLS: captures의 기존 for-all 정책("own captures": auth.uid() = user_id)이
--   컬럼 단위가 아니라 행 단위로 적용되므로 새 컬럼도 그대로 커버한다(추가 정책 불필요).

alter table public.captures
  add column category text default 'etc'
    check (category in ('marketing','event','receipt','shopping','info','etc'));

-- 홈 "주제별 묶음"·검색 카테고리 필터는 user_id + category로 최신순 조회한다.
create index on public.captures (user_id, category, created_at desc);
