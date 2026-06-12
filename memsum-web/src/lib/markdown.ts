/**
 * 정책 문서용 미니 마크다운 변환기 — scripts/gen-web-policy.mjs의 파서를 TS로 포팅.
 *
 * why 자체 파서: 정책 문서가 쓰는 문법(h1~h3·표·1/2단계 리스트·굵게·링크·코드·hr)이
 * 제한적이라 외부 마크다운 의존성 없이 결정적으로 변환한다. 콘텐츠는 우리가 작성한
 * 신뢰 가능한 md(content/)뿐이므로 XSS 표면도 escape 처리로 충분하다.
 */

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/** 인라인 마크다운(굵게·링크·코드) → HTML. 입력은 이미 escape된 텍스트. */
function inline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

function splitRow(row: string): string[] {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

type ListItem = { text: string; children: string[] };

/** 마크다운 본문 → HTML 본문. 지원: h1~h3, 표, 1·2단계 리스트, hr, 단락. */
export function mdToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

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
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const thead = `<thead><tr>${headers
        .map((h) => `<th>${inline(escapeHtml(h))}</th>`)
        .join('')}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map(
          (row) =>
            `<tr>${row.map((cell) => `<td>${inline(escapeHtml(cell))}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody>`;
      out.push(`<div class="table-wrap"><table>${thead}${tbody}</table></div>`);
      continue;
    }

    // 리스트(1·2단계). 들여쓴 "- "는 직전 항목의 하위 리스트.
    if (/^- /.test(line)) {
      const items: ListItem[] = [];
      while (i < lines.length && /^(\s*)- /.test(lines[i])) {
        const indent = lines[i].match(/^(\s*)/)?.[1].length ?? 0;
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
                  .map((child) => `<li>${inline(escapeHtml(child))}</li>`)
                  .join('')}</ul>`
              : '';
          return `<li>${inline(escapeHtml(item.text))}${sub}</li>`;
        })
        .join('');
      out.push(`<ul>${li}</ul>`);
      continue;
    }

    out.push(`<p>${inline(escapeHtml(line.trim()))}</p>`);
    i += 1;
  }
  return out.join('\n');
}
