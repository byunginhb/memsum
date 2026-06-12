// 개인정보처리방침 웹 페이지 생성기.
//
// docs/store/privacy-policy.{ko,en}.md (SSOT)를 정적 HTML로 변환해
// memsum-web/ 에 출력한다. 문구 수정은 md에서 하고 이 스크립트를 재실행:
//   node scripts/gen-web-policy.mjs
//
// why 자체 미니 파서: 정책 문서가 쓰는 문법(h1~h3·표·리스트·굵게·링크·코드·hr)이
// 제한적이라 외부 마크다운 의존성 없이 결정적으로 변환한다(gen-icons.mjs 선례).

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'memsum-web');

/** 게시 페이지에서 제외할 내부 체크리스트 섹션 제목. */
const INTERNAL_SECTIONS = ['채워야 할 항목', 'Placeholders to fill in'];

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** 인라인 마크다운(굵게·링크·코드)을 HTML로. 입력은 이미 escape된 텍스트. */
function inline(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** 마크다운 본문 → HTML 본문. 지원: h1~h3, 표, 1·2단계 리스트, hr, 단락. */
function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  let skippingInternal = false;

  while (i < lines.length) {
    const line = lines[i];

    // 내부 체크리스트 섹션 진입/이탈 (## 단위로 스킵)
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      skippingInternal = INTERNAL_SECTIONS.some((t) => h2[1].includes(t));
    }
    if (skippingInternal) {
      i += 1;
      continue;
    }

    if (line.trim() === '') {
      i += 1;
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      out.push('<hr />');
      i += 1;
      continue;
    }
    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`);
      i += 1;
      continue;
    }

    // 표: | ... | 줄이 연속되고 둘째 줄이 구분선
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s:-]+\|/)) {
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const thead = `<thead><tr>${headers
        .map((h) => `<th>${inline(escapeHtml(h))}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (r) =>
            `<tr>${r.map((c) => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody>`;
      out.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // 리스트(1·2단계). "  - "는 직전 항목의 하위 리스트.
    if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && /^(\s*)- /.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)[1].length;
        const text = lines[i].replace(/^\s*- /, '');
        if (indent === 0) {
          items.push({ text, children: [] });
        } else if (items.length > 0) {
          items[items.length - 1].children.push(text);
        }
        i += 1;
      }
      const li = items
        .map((item) => {
          const sub =
            item.children.length > 0
              ? `<ul>${item.children
                  .map((c) => `<li>${inline(escapeHtml(c))}</li>`)
                  .join('')}</ul>`
              : '';
          return `<li>${inline(escapeHtml(item.text))}${sub}</li>`;
        })
        .join('');
      out.push(`<ul>${li}</ul>`);
      continue;
    }

    // 단락
    out.push(`<p>${inline(escapeHtml(line.trim()))}</p>`);
    i += 1;
  }
  return out.join('\n');
}

function splitRow(row) {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/** 공통 셸: 브랜드 헤더 + 본문 + 푸터. */
function page({ lang, title, body, altHref, altLabel }) {
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="robots" content="index,follow" />
<meta name="google-site-verification" content="ZExuZuVV_F2gY39RAdQoDeu3AYF26yYg81-mjzeWJwM" />
<style>
:root{--primary:#7C6FE8;--ink:#1F2430;--ink-soft:#5A6172;--line:#E7E4F4;--bg:#FAFAFD;--card:#FFFFFF;}
*{box-sizing:border-box;}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:"Pretendard Variable",Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Segoe UI",Roboto,sans-serif;
  line-height:1.7;font-size:16px;-webkit-text-size-adjust:100%;}
header{background:var(--primary);color:#fff;padding:28px 20px;}
.shell{max-width:760px;margin:0 auto;padding:0 4px;}
.brand{display:flex;align-items:center;gap:12px;text-decoration:none;color:#fff;}
.dots{display:grid;grid-template-columns:repeat(3,7px);gap:4px;}
.dots i{width:7px;height:7px;border-radius:50%;background:#fff;}
.dots i:last-child{background:#FF8A7A;}
.brand b{font-size:20px;letter-spacing:-0.02em;}
.lang{float:right;margin-top:-30px;}
.lang a{color:#fff;opacity:.85;text-decoration:underline;font-size:14px;}
main{max-width:760px;margin:0 auto;padding:32px 20px 72px;}
h1{font-size:26px;letter-spacing:-0.02em;line-height:1.35;}
h2{font-size:19px;margin-top:40px;letter-spacing:-0.01em;}
h3{font-size:16px;margin-top:28px;}
p,li{color:var(--ink);}
hr{border:none;border-top:1px solid var(--line);margin:32px 0;}
a{color:var(--primary);}
code{background:#F0EEFB;border-radius:4px;padding:1px 5px;font-size:.92em;}
.table-wrap{overflow-x:auto;margin:16px 0;border:1px solid var(--line);border-radius:10px;background:var(--card);}
table{border-collapse:collapse;width:100%;min-width:640px;font-size:14px;}
th,td{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top;}
th{background:#F4F2FC;font-weight:600;}
tr:last-child td{border-bottom:none;}
footer{border-top:1px solid var(--line);color:var(--ink-soft);font-size:13px;
  max-width:760px;margin:0 auto;padding:20px;}
</style>
</head>
<body>
<header><div class="shell">
  <a class="brand" href="./index.html"><span class="dots"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span><b>Memsum</b></a>
  <nav class="lang"><a href="${altHref}">${altLabel}</a></nav>
</div></header>
<main>
${body}
</main>
<footer>&copy; Memsum. All rights reserved.</footer>
</body>
</html>
`;
}

function buildPolicy(lang) {
  const src = readFileSync(
    join(ROOT, 'docs/store', `privacy-policy.${lang}.md`),
    'utf8',
  );
  const body = mdToHtml(src);
  const isKo = lang === 'ko';
  return page({
    lang: isKo ? 'ko' : 'en',
    title: isKo ? 'Memsum 개인정보처리방침' : 'Memsum Privacy Policy',
    body,
    altHref: isKo ? './privacy-en.html' : './privacy.html',
    altLabel: isKo ? 'English' : '한국어',
  });
}

function buildIndex() {
  const body = `
<h1>스크린샷, 찍기만 하세요.<br/>정리는 Memsum이 할게요.</h1>
<p>Memsum은 스크린샷을 자동으로 감지해 내용을 요약하고, 날짜가 보이면 캘린더에
등록해 두었다가 매주 일요일 저녁 5줄 리포트로 알려주는 앱입니다.</p>
<p>iOS·Android 출시 준비 중입니다.</p>
<hr />
<h2>문서</h2>
<ul>
  <li><a href="./privacy.html">개인정보처리방침 (한국어)</a></li>
  <li><a href="./privacy-en.html">Privacy Policy (English)</a></li>
</ul>
`;
  return page({
    lang: 'ko',
    title: 'Memsum — 스크린샷을 기억으로',
    body,
    altHref: './privacy-en.html',
    altLabel: 'Privacy Policy',
  });
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'privacy.html'), buildPolicy('ko'));
writeFileSync(join(OUT_DIR, 'privacy-en.html'), buildPolicy('en'));
writeFileSync(join(OUT_DIR, 'index.html'), buildIndex());
writeFileSync(
  join(OUT_DIR, 'vercel.json'),
  `${JSON.stringify({ cleanUrls: true }, null, 2)}\n`,
);
console.log('생성 완료: memsum-web/{index,privacy,privacy-en}.html + vercel.json');
