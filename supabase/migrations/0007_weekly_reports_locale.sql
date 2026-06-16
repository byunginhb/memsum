-- supabase/migrations/0007_weekly_reports_locale.sql
-- Memsum 주간 리포트 다국어 — 생성 언어 추적 컬럼 추가.
--
-- weekly_reports(0004)에 items(title/summary)를 어떤 언어로 생성했는지 기록하는
-- locale 컬럼을 비파괴적으로 추가한다. weekly-report Edge Function이:
--   - 캐시 조회 시 요청 로케일과 행의 locale이 다르면(사용자가 언어 변경) 같은 주라도
--     해당 언어로 다시 생성·덮어쓴다(주당 1행 유지 — unique(user_id, week_start) 그대로).
--   - 생성/갱신 시 사용한 로케일을 이 컬럼에 저장한다.
--
-- nullable이라 기존 행/처리 흐름에 영향이 없다. 마이그레이션 이전 행(locale NULL)은
-- 함수에서 'ko'로 간주한다(한국어 단일 언어 시절 데이터 호환).
--
-- RLS: weekly_reports의 기존 행 단위 정책(auth.uid() = user_id)이 새 컬럼도
--   그대로 커버한다(컬럼이 아니라 행 단위 적용 → 추가 정책 불필요).

alter table public.weekly_reports
  add column if not exists locale text;

-- 방어적 제약: 앱이 'ko'/'en'만 보내지만, DB 차원에서도 이상값을 막는다(NULL은 legacy 허용).
alter table public.weekly_reports
  drop constraint if exists weekly_reports_locale_check;
alter table public.weekly_reports
  add constraint weekly_reports_locale_check
  check (locale is null or locale in ('ko', 'en'));
