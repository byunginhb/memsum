// Supabase 마이그레이션 러너 (직접 DB 연결).
//
// 사용법:
//   1) .env 에 SUPABASE_DB_URL=postgresql://...  (Settings → Database → Connection string)
//   2) node scripts/db-migrate.mjs
//
// supabase/migrations/*.sql 을 파일명 순서대로 트랜잭션 적용하고,
// schema_migrations 메타 테이블로 중복 적용을 방지한다(idempotent).
// 적용 후 테이블·RLS·정책을 검증해 출력한다.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');

// .env 에서 SUPABASE_DB_URL 만 직접 파싱(외부 의존성 없이).
function readEnv(name) {
  try {
    const raw = readFileSync(join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (key === name) {
        // 값에 = 가 포함될 수 있으므로 첫 = 이후 전체를 사용. 따옴표 제거.
        return trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // .env 없음 → 환경변수 폴백
  }
  return process.env[name] ?? '';
}

async function main() {
  const dbUrl = readEnv('SUPABASE_DB_URL');
  if (!dbUrl) {
    console.error(
      '\n[migrate] SUPABASE_DB_URL 이 .env 에 없습니다.\n' +
        'Supabase 대시보드 → Settings → Database → Connection string(URI, 비밀번호 포함)을\n' +
        '.env 에 SUPABASE_DB_URL= 로 추가하세요. (Session pooler 권장)\n',
    );
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    // Supabase 는 SSL 필수. 풀러 인증서 체인 문제 회피를 위해 검증 완화.
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('[migrate] DB 연결 성공');

  // 마이그레이션 이력 테이블
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    (await client.query('select version from public.schema_migrations')).rows.map(
      (r) => r.version,
    ),
  );

  let appliedCount = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`[migrate] skip (이미 적용됨): ${file}`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    console.log(`[migrate] apply: ${file}`);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public.schema_migrations(version) values($1)', [file]);
      await client.query('commit');
      appliedCount += 1;
      console.log(`[migrate]   ✓ ${file} 적용 완료`);
    } catch (err) {
      await client.query('rollback');
      console.error(`[migrate]   ✗ ${file} 실패 → 롤백:`, err.message);
      await client.end();
      process.exit(1);
    }
  }

  // ---- 검증 ----
  console.log('\n[verify] 스키마 검증');
  const tables = await client.query(`
    select c.relname as table, c.relrowsecurity as rls
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
      and c.relname in ('user_profiles','captures')
    order by c.relname;
  `);
  for (const row of tables.rows) {
    console.log(`[verify]   table public.${row.table} — RLS ${row.rls ? 'ON ✓' : 'OFF ✗'}`);
  }

  const policies = await client.query(`
    select tablename, policyname from pg_policies
    where schemaname = 'public' order by tablename;
  `);
  for (const row of policies.rows) {
    console.log(`[verify]   policy ${row.tablename}: "${row.policyname}"`);
  }

  await client.end();
  console.log(
    `\n[migrate] 완료 — 신규 적용 ${appliedCount}건, 테이블 ${tables.rows.length}개 확인.`,
  );
}

main().catch((err) => {
  console.error('[migrate] 치명적 오류:', err);
  process.exit(1);
});
