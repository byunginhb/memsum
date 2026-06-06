-- supabase/migrations/0003_search.sql
-- 캡처 키워드 검색 성능: pg_trgm 트라이그램 인덱스.
-- ILIKE '%키워드%'(선행 와일드카드)는 btree를 못 쓰므로 GIN trgm 인덱스로 가속한다.
-- 한국어도 트라이그램 부분일치가 동작한다(형태소 분석 아님, 부분문자열 매칭).

create extension if not exists pg_trgm;

-- ocr_text 부분일치 검색용 GIN 인덱스.
create index if not exists idx_captures_ocr_trgm
  on public.captures using gin (ocr_text gin_trgm_ops);

-- parsed_event의 title 텍스트도 자주 검색하므로 표현식 인덱스 추가.
create index if not exists idx_captures_title_trgm
  on public.captures using gin ((parsed_event ->> 'title') gin_trgm_ops);
