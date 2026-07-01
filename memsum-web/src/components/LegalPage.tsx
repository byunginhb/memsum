import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { type Lang } from '@/lib/landing-copy';
import { mdToHtml } from '@/lib/markdown';

/**
 * 정책 문서 공통 페이지 — content/의 md(SSOT 사본)를 빌드 시 읽어 정적 렌더한다.
 * 원본은 docs/store/*.md이며 scripts/sync-web-content.mjs로 동기화한다.
 */
export function LegalPage({
  contentFile,
  lang = 'ko',
}: {
  contentFile: string;
  lang?: Lang;
}) {
  const md = readFileSync(
    join(process.cwd(), 'content', contentFile),
    'utf8',
  );
  const html = mdToHtml(md);
  return (
    <>
      <SiteHeader lang={lang} />
      <main className="mx-auto w-full max-w-3xl px-5 pt-6">
        <article
          className="legal"
          // 신뢰 가능한 자체 md를 escape 변환한 HTML — 외부 입력 없음.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
      <SiteFooter lang={lang} />
    </>
  );
}
