// scripts/gen-brand-assets.mjs
//
// 웹 브랜드 에셋 생성기 — "형광펜 & 코발트"(docs/design/redesign-2026-10.md)
//   src/app/icon.png   512  파비콘(코발트 둥근 타일 + 종이색 크롭 모서리 + 형광펜 막대, 바깥 투명)
//   public/og.png      1200x630  한국어 공유 이미지
//   public/og.en.png   1200x630  영어 공유 이미지
// 문구는 src/lib/landing-copy.ts 의 meta.ogTitle 을 그대로 쓴다(여기서 문구를 새로 만들지 않는다).
// 마크 기하는 src/components/brand/BrandMark.tsx · 앱 BrandMark 와 같다(바꾸면 함께).
//
// 실행(memsum-web 에서): node --experimental-strip-types scripts/gen-brand-assets.mjs
// 필요: 저장소 루트 node_modules 의 @resvg/resvg-js, 루트 assets/fonts 의 Wanted Sans·JetBrains Mono,
//       루트 assets/store/raw/<locale>/02-home.png(새 디자인 홈 캡처).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

import { LANDING_COPY } from '../src/lib/landing-copy.ts';

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = join(WEB, '..');
const FONT_DIR = join(ROOT, 'assets', 'fonts');
const FONT_FILES = ['WantedSans-Black.ttf', 'WantedSans-Bold.ttf', 'WantedSans-Regular.ttf', 'JetBrainsMono-Medium.ttf'].map(
  (f) => join(FONT_DIR, f),
);

const C = {
  paper: '#F2F3F0',
  surface: '#FAFAF8',
  ink: '#0D0E12',
  ink2: '#565A63',
  cobalt: '#1530FF',
  marker: '#E8FF3A',
  rule: 'rgba(13,14,18,0.12)',
};

const G = { tileRadius: 0.22, frame: 0.62, corner: 0.2, stroke: 0.065, barWidth: 0.5, barHeight: 0.15, barRadius: 0.12, barRotate: -8 };
const f = (n) => Number(n).toFixed(2);

/** (ox, oy)에서 시작하는 m×m 칸 안의 브랜드 마크. */
function mark({ ox, oy, m, tile, cornerColor }) {
  const cx = ox + m / 2;
  const cy = oy + m / 2;
  const half = (m * G.frame) / 2;
  const l = m * G.corner;
  const a = { x: cx - half, y: cy - half };
  const b = { x: cx + half, y: cy + half };
  const d = [
    `M ${f(a.x)} ${f(a.y + l)} L ${f(a.x)} ${f(a.y)} L ${f(a.x + l)} ${f(a.y)}`,
    `M ${f(b.x - l)} ${f(a.y)} L ${f(b.x)} ${f(a.y)} L ${f(b.x)} ${f(a.y + l)}`,
    `M ${f(b.x)} ${f(b.y - l)} L ${f(b.x)} ${f(b.y)} L ${f(b.x - l)} ${f(b.y)}`,
    `M ${f(a.x + l)} ${f(b.y)} L ${f(a.x)} ${f(b.y)} L ${f(a.x)} ${f(b.y - l)}`,
  ].join(' ');
  const bw = m * G.barWidth;
  const bh = m * G.barHeight;
  return [
    tile ? `<rect x="${f(ox)}" y="${f(oy)}" width="${f(m)}" height="${f(m)}" rx="${f(m * G.tileRadius)}" fill="${C.cobalt}"/>` : '',
    `<rect x="${f(cx - bw / 2)}" y="${f(cy - bh / 2)}" width="${f(bw)}" height="${f(bh)}" rx="${f(bh * G.barRadius)}" fill="${C.marker}" transform="rotate(${G.barRotate} ${f(cx)} ${f(cy)})"/>`,
    `<path d="${d}" fill="none" stroke="${cornerColor}" stroke-width="${f(m * G.stroke)}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ].join('');
}

function render(svg, width) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Wanted Sans' },
  });
  return r;
}

const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** 글자 한 줄의 실제 렌더 폭(px) — resvg로 그려 경계 상자를 잰다. 형광펜 길이·줄바꿈을 정확히 맞추기 위함. */
function measure(text, size, weight) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="400"><text x="0" y="200" font-family="Wanted Sans" font-weight="${weight}" font-size="${size}" letter-spacing="${f(-0.035 * size)}">${esc(text)}</text></svg>`;
  const box = render(svg, 4000).getBBox();
  return box ? box.x + box.width : 0;
}

/** 단어 단위 탐욕 줄바꿈(한국어도 띄어쓰기 단위 = keep-all). */
function wrap(text, size, weight, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, size, weight) > maxWidth) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── 파비콘 ─────────────────────────────────────────────
{
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${mark({ ox: 0, oy: 0, m: 512, tile: true, cornerColor: C.paper })}</svg>`;
  writeFileSync(join(WEB, 'src', 'app', 'icon.png'), render(svg, 512).render().asPng());
  console.log('src/app/icon.png');
}

// ── OG 이미지 ──────────────────────────────────────────
/** 홈 캡처에서 형광펜을 그을 일정 제목 줄(원본 1080x1920 px, src/lib/screens.ts 와 같은 값). */
const HOME_ROWS = {
  ko: [[785, 302, 738], [985, 304, 694], [1186, 302, 646], [1387, 304, 676]],
  en: [[789, 304, 882], [991, 304, 626], [1192, 304, 784], [1393, 304, 814]],
};
const LOCALE_DIR = { ko: 'ko-KR', en: 'en-US' };

function og(lang) {
  const W = 1200;
  const H = 630;
  const title = LANDING_COPY[lang].meta.ogTitle;

  // 문장 단위로 나눈 뒤, 마지막 문장(핵심)에 형광펜.
  const sentences = title.split(/(?<=\.)\s+/);
  const size = 64;
  const lineH = 78;
  const maxW = 640;
  const lines = sentences.flatMap((s, si) => wrap(s, size, 900, maxW).map((t) => ({ t, marked: si === sentences.length - 1 })));
  const textX = 72;
  const blockH = lines.length * lineH;
  const firstBase = 330 - blockH / 2 + lineH * 0.8;

  const textSvg = lines
    .map(({ t, marked }, i) => {
      const y = firstBase + i * lineH;
      const w = measure(t, size, 900);
      const hl = marked
        ? `<rect x="${f(textX - 4)}" y="${f(y - size * 0.5)}" width="${f(w + 8)}" height="${f(size * 0.62)}" fill="${C.marker}"/>`
        : '';
      return `${hl}<text x="${textX}" y="${f(y)}" font-family="Wanted Sans" font-weight="900" font-size="${size}" letter-spacing="${f(-0.035 * size)}" fill="${C.ink}">${esc(t)}</text>`;
    })
    .join('');

  // 오른쪽: 새 디자인 홈 화면 + 크롭 모서리 + 스캔선 + 형광펜 줄
  const shot = readFileSync(join(ROOT, 'assets', 'store', 'raw', LOCALE_DIR[lang], '02-home.png')).toString('base64');
  const sw = 300;
  const sh = (sw * 1920) / 1080;
  const sx = 840;
  const sy = 64;
  const k = sw / 1080;
  const marks = HOME_ROWS[lang]
    .slice(0, 3)
    .map(([y1, x0, x1]) => {
      const top = sy + (y1 + 6 - 38) * k;
      return `<rect x="${f(sx + (x0 - 10) * k)}" y="${f(top)}" width="${f((x1 - x0 + 22) * k)}" height="${f(38 * k)}" fill="${C.marker}" style="mix-blend-mode:multiply" transform="rotate(-1.5 ${f(sx + x0 * k)} ${f(top)})"/>`;
    })
    .join('');
  const scanY = sy + 1250 * k;
  const cl = 22;
  const co = 12;
  const cw = 3;
  const cx0 = sx - co;
  const cy0 = sy - co;
  const cx1 = sx + sw + co;
  const cy1 = Math.min(sy + sh + co, H - 26);
  const crop = [
    `M ${cx0} ${cy0 + cl} L ${cx0} ${cy0} L ${cx0 + cl} ${cy0}`,
    `M ${cx1 - cl} ${cy0} L ${cx1} ${cy0} L ${cx1} ${cy0 + cl}`,
    `M ${cx1} ${cy1 - cl} L ${cx1} ${cy1} L ${cx1 - cl} ${cy1}`,
    `M ${cx0 + cl} ${cy1} L ${cx0} ${cy1} L ${cx0} ${cy1 - cl}`,
  ].join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="shot"><rect x="${sx}" y="${sy}" width="${sw}" height="${f(Math.min(sh, cy1 - co - sy))}" rx="12"/></clipPath>
    <linearGradient id="tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.cobalt}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${C.cobalt}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  ${mark({ ox: 64, oy: 52, m: 56, tile: false, cornerColor: C.ink })}
  <text x="128" y="91" font-family="Wanted Sans" font-weight="900" font-size="32" letter-spacing="-1" fill="${C.ink}">Memsum</text>
  ${textSvg}
  <rect x="72" y="${H - 72}" width="${maxW}" height="2" fill="${C.ink}"/>
  <g clip-path="url(#shot)">
    <rect x="${sx}" y="${sy}" width="${sw}" height="${f(sh)}" fill="${C.surface}"/>
    <image x="${sx}" y="${sy}" width="${sw}" height="${f(sh)}" xlink:href="data:image/png;base64,${shot}"/>
    ${marks}
    <rect x="${sx}" y="${f(scanY)}" width="${sw}" height="70" fill="url(#tail)"/>
    <rect x="${sx}" y="${f(scanY)}" width="${sw}" height="3" fill="${C.cobalt}"/>
  </g>
  <rect x="${sx}" y="${sy}" width="${sw}" height="${f(Math.min(sh, cy1 - co - sy))}" rx="12" fill="none" stroke="${C.rule}" stroke-width="1"/>
  <path d="${crop}" fill="none" stroke="${C.ink}" stroke-width="${cw}"/>
</svg>`;
  return render(svg, W).render().asPng();
}

for (const [lang, file] of [['ko', 'og.png'], ['en', 'og.en.png']]) {
  writeFileSync(join(WEB, 'public', file), og(lang));
  console.log(`public/${file}`);
}
