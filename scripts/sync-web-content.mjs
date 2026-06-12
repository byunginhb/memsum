// 정책 문서 동기화 — docs/store/*.md(SSOT) → memsum-web/content/.
//
// Vercel은 memsum-web/을 루트로 빌드하므로 저장소 밖(../docs)을 읽을 수 없다.
// 문구 수정은 docs/store에서 하고 이 스크립트를 재실행한 뒤 커밋한다:
//   node scripts/sync-web-content.mjs

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs/store');
const DEST = join(ROOT, 'memsum-web/content');

const FILES = [
  ['privacy-policy.ko.md', 'privacy.ko.md'],
  ['privacy-policy.en.md', 'privacy.en.md'],
  ['terms-of-service.ko.md', 'terms.ko.md'],
  ['terms-of-service.en.md', 'terms.en.md'],
];

mkdirSync(DEST, { recursive: true });
for (const [from, to] of FILES) {
  copyFileSync(join(SRC, from), join(DEST, to));
  console.log(`${from} → content/${to}`);
}
