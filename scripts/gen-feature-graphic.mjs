// scripts/gen-feature-graphic.mjs
//
// Google Play 피처 그래픽(1024×500) 생성기.
// 라벤더 배경 + Memsum 9닷 브랜드 마크 + 워드마크 + 한국어 태그라인.
// 텍스트는 Pretendard(앱 본문 폰트)로 렌더한다.
//
// 실행: node scripts/gen-feature-graphic.mjs
// 산출: assets/store/feature-graphic.png (1024×500)

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT = join(ROOT, 'assets', 'fonts', 'PretendardVariable.ttf');
const OUT_DIR = join(ROOT, 'assets', 'store');

// ── 브랜드 색 ────────────────────────────────────────────────────────────────
const LAVENDER = '#7C6FE8';
const LAVENDER_DARK = '#6A5DD6'; // 미묘한 그라데이션용
const WHITE = '#FFFFFF';
const CORAL = '#FFB84D';

const W = 1024;
const H = 500;

// ── 9닷 마크 SVG 조각 ─────────────────────────────────────────────────────────
const GAP_RATIO = 0.14 / 0.18;
const SPAN_IN_DOTS = 3 + 2 * GAP_RATIO;

/** (cx,cy) 중심, span 폭의 9닷 마크 <circle> 묶음. */
function dotsMarkup(centerX, centerY, span) {
  const dot = span / SPAN_IN_DOTS;
  const gap = dot * GAP_RATIO;
  const r = dot / 2;
  const x0 = centerX - span / 2;
  const y0 = centerY - span / 2;
  let out = '';
  for (let i = 0; i < 9; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = x0 + col * (dot + gap) + r;
    const cy = y0 + row * (dot + gap) + r;
    const fill = i === 8 ? CORAL : WHITE;
    out += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}"/>`;
  }
  return out;
}

// ── 전체 SVG ──────────────────────────────────────────────────────────────────
const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LAVENDER}"/>
      <stop offset="1" stop-color="${LAVENDER_DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${dotsMarkup(250, 250, 250)}
  <text x="470" y="235" font-size="92" font-weight="700" fill="${WHITE}">Memsum</text>
  <text x="474" y="305" font-size="34" font-weight="500" fill="${WHITE}" fill-opacity="0.92">쌓인 스크린샷, 다시 쓸모있게</text>
  <text x="474" y="352" font-size="26" font-weight="400" fill="${WHITE}" fill-opacity="0.78">OCR · 캘린더 자동 등록 · 주간 5줄 리포트</text>
</svg>`;

// ── 렌더 ──────────────────────────────────────────────────────────────────────
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const resvg = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: {
    fontFiles: [FONT],
    loadSystemFonts: false,
    defaultFontFamily: 'Pretendard Variable',
  },
});
const png = resvg.render().asPng();
const out = join(OUT_DIR, 'feature-graphic.png');
writeFileSync(out, png);
console.log(`✓ feature-graphic.png (${png.length} bytes) → assets/store/`);
