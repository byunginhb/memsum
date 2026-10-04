// scripts/gen-feature-graphic.mjs
//
// Google Play 피처 그래픽(1024×500) 생성기 — docs/design/redesign-2026-10.md "형광펜 & 코발트".
//
// 구도: 코발트 바탕. 왼쪽엔 살짝 기운 스크린샷 한 장(종이색) — 코발트 스캔선이 지나간 자리의
// 글자 줄 두 개에 형광펜이 그어져 있고, 종이색 크롭 모서리가 둘러싼다(앱의 시그니처 "스캔" 장면).
// 오른쪽엔 mono 머리표, 워드마크, 형광펜 한 구절이 있는 태그라인, 기능 한 줄.
// 서체는 앱과 같은 Wanted Sans(Regular/Bold/Black) + JetBrains Mono Medium.
//
// 실행: node scripts/gen-feature-graphic.mjs [--lang ko|en|all]   (기본 all, devDep @resvg/resvg-js 필요)
// 산출: ko → assets/store/feature-graphic.png + docs/store/images/ko-KR/feature.png
//       en → docs/store/images/en-US/feature.png
// 모두 1024×500, 알파 없는 RGB PNG(Play 는 불투명 요구).

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

import { encodeRgbPng } from './lib/png-rgb.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = join(ROOT, 'assets', 'fonts');
const FONT_FILES = [
  'WantedSans-Regular.ttf',
  'WantedSans-Bold.ttf',
  'WantedSans-Black.ttf',
  'JetBrainsMono-Medium.ttf',
].map((name) => join(FONTS_DIR, name));
const STORE_IMAGES = join(ROOT, 'docs', 'store', 'images');

// ── 언어별 문구 ──────────────────────────────────────────────────────────────
// 기능 줄은 스토어 등록정보(docs/store/listings/<lang>/full.txt)에 있는 라이브 기능만.
// 택배 추적은 스토어 설명 기준 주력 기능이 아니라 피처 그래픽에서 뺐다.
const COPY = {
  ko: {
    line1: '스크린샷 속 약속,',
    mark: '놓치지 않게',
    rest: ' 기억해요',
    features: '자동 감지 · 전날 밤 리마인드 · 일요일 5줄 리포트',
    outs: [join(ROOT, 'assets', 'store', 'feature-graphic.png'), join(STORE_IMAGES, 'ko-KR', 'feature.png')],
  },
  en: {
    line1: 'Plans in your screenshots,',
    mark: 'never missed',
    rest: '',
    features: 'Auto-detect · Reminders · Sunday 5-line report',
    outs: [join(STORE_IMAGES, 'en-US', 'feature.png')],
  },
};

const langArg = (() => {
  const i = process.argv.indexOf('--lang');
  return i >= 0 ? process.argv[i + 1] : 'all';
})();
if (!['ko', 'en', 'all'].includes(langArg)) throw new Error(`--lang 은 ko | en | all: ${langArg}`);

// ── 브랜드 색 (src/design/tokens/colors.ts palette) ─────────────────────────
const COBALT = '#1530FF';
const COBALT_DEEP = '#0E22CC';
const PAPER = '#F2F3F0';
const INK = '#0D0E12';
const MARKER = '#E8FF3A';
const RULE = 'rgba(13,14,18,0.10)';

const W = 1024;
const H = 500;

const SANS = 'Wanted Sans';
const MONO = 'JetBrains Mono';

const f = (n) => n.toFixed(1);

const resvgOptions = {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: SANS },
};

/** 글자 폭 측정 — 같은 서체로 한 번 그려 bbox를 잰다(resvg는 텍스트 측정 API가 없다). */
function measureText(text, { size, weight, family = SANS, tracking = 0 }) {
  const probe =
    `<svg width="2000" height="400" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="0" y="${size * 1.5}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${tracking}">${text}</text></svg>`;
  const box = new Resvg(probe, resvgOptions).getBBox();
  return box ? box.width : text.length * size * 0.9;
}

// ── 왼쪽: 스캔된 스크린샷 ────────────────────────────────────────────────────
const SHOT = { x: 112, y: 62, w: 224, h: 376, r: 22, rotate: -4 };
const SHOT_CX = SHOT.x + SHOT.w / 2;
const SHOT_CY = SHOT.y + SHOT.h / 2;

/** 스크린샷 안 의사 글자 줄. mark=true면 형광펜이 그어진 줄(스캔선이 지나간 자리). */
const ROWS = [
  { y: 52, w: 0.46, h: 14, bold: true },
  { y: 92, w: 0.82, h: 10 },
  { y: 112, w: 0.7, h: 10 },
  { y: 150, w: 0.64, h: 12, mark: true },
  { y: 176, w: 0.78, h: 10 },
  { y: 196, w: 0.5, h: 10 },
  { y: 232, w: 0.72, h: 12, mark: true },
  { y: 268, w: 0.84, h: 10 },
  { y: 288, w: 0.6, h: 10 },
];
/** 스캔선 위치(스크린샷 상단 기준). 형광펜 줄 두 개를 지나 조금 더 내려간 자리. */
const SCAN_Y = 252;
const SCAN_TAIL = 64;

function screenshotMarkup() {
  const pad = 22;
  const innerW = SHOT.w - pad * 2;
  let rows = '';
  for (const row of ROWS) {
    const x = SHOT.x + pad;
    const y = SHOT.y + row.y;
    const w = innerW * row.w;
    if (row.mark) {
      // 형광펜: 줄보다 위아래로 두껍고 좌우로 살짝 삐져나오며 -1.5° 기운다(Marked와 같은 손맛).
      const mx = x - 6;
      const my = y - 7;
      rows +=
        `<rect x="${f(mx)}" y="${f(my)}" width="${f(w + 12)}" height="${f(row.h + 14)}" ` +
        `fill="${MARKER}" transform="rotate(-1.5 ${f(mx)} ${f(my + row.h)})"/>`;
    }
    const fill = row.bold ? INK : row.mark ? INK : 'rgba(13,14,18,0.22)';
    rows += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${row.h}" rx="${row.h / 2}" fill="${fill}"/>`;
  }

  // 상단 상태 표시줄(시각) — mono 숫자.
  const status =
    `<text x="${SHOT.x + pad}" y="${SHOT.y + 30}" font-family="${MONO}" font-weight="500" font-size="12" fill="${INK}">09:41</text>` +
    `<rect x="${SHOT.x + SHOT.w - pad - 26}" y="${SHOT.y + 21}" width="26" height="11" rx="3" fill="none" stroke="${INK}" stroke-width="1.5"/>` +
    `<rect x="${SHOT.x + SHOT.w - pad - 24}" y="${SHOT.y + 23}" width="17" height="7" rx="1.5" fill="${INK}"/>`;

  // 스캔선: 2px 코발트 + 위로 번지는 꼬리(지나온 자리).
  const scanY = SHOT.y + SCAN_Y;
  const scan =
    `<rect x="${SHOT.x}" y="${scanY - SCAN_TAIL}" width="${SHOT.w}" height="${SCAN_TAIL}" fill="url(#tail)"/>` +
    `<rect x="${SHOT.x}" y="${scanY - 1}" width="${SHOT.w}" height="3" fill="${COBALT}"/>`;

  // 아래쪽 아직 안 읽힌 줄 위 구분선 하나(스크린샷 속 카드 경계 느낌).
  const rule = `<rect x="${SHOT.x + pad}" y="${SHOT.y + 320}" width="${innerW}" height="1" fill="${RULE}"/>`;

  const shot =
    `<g clip-path="url(#shotClip)">` +
    `<rect x="${SHOT.x}" y="${SHOT.y}" width="${SHOT.w}" height="${SHOT.h}" fill="${PAPER}"/>` +
    status +
    rows +
    rule +
    scan +
    `</g>`;

  // 크롭 모서리 — 스크린샷 바깥으로 밀어낸 종이색 L자 4개.
  const out = 16;
  const len = 34;
  const a = { x: SHOT.x - out, y: SHOT.y - out };
  const b = { x: SHOT.x + SHOT.w + out, y: SHOT.y + SHOT.h + out };
  const corners = [
    `M ${a.x} ${a.y + len} L ${a.x} ${a.y} L ${a.x + len} ${a.y}`,
    `M ${b.x - len} ${a.y} L ${b.x} ${a.y} L ${b.x} ${a.y + len}`,
    `M ${b.x} ${b.y - len} L ${b.x} ${b.y} L ${b.x - len} ${b.y}`,
    `M ${a.x + len} ${b.y} L ${a.x} ${b.y} L ${a.x} ${b.y - len}`,
  ].join(' ');
  const frame = `<path d="${corners}" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;

  // 바닥 그림자(시트처럼 떠 있는 면) — 진한 코발트로 살짝.
  const shadow = `<rect x="${SHOT.x + 10}" y="${SHOT.y + 14}" width="${SHOT.w}" height="${SHOT.h}" rx="${SHOT.r}" fill="${COBALT_DEEP}"/>`;

  return `<g transform="rotate(${SHOT.rotate} ${SHOT_CX} ${SHOT_CY})">${shadow}${shot}${frame}</g>`;
}

// ── 오른쪽: 머리표 · 워드마크 · 태그라인 ────────────────────────────────────
const TEXT_X = 452;

function copyMarkup(copy) {
  const eyebrow = `<text x="${TEXT_X}" y="128" font-family="${MONO}" font-weight="500" font-size="18" letter-spacing="1.5" fill="${PAPER}" fill-opacity="0.72">SCREENSHOT → 5 LINES</text>`;

  const wordmark = `<text x="${TEXT_X - 4}" y="222" font-family="${SANS}" font-weight="900" font-size="104" letter-spacing="-4" fill="${PAPER}">Memsum</text>`;

  // 태그라인 2줄. 두 번째 줄 앞 구절에 형광펜(형광펜 위 글자는 항상 잉크).
  const tagSize = 40;
  const { line1, mark: markPhrase, rest } = copy;
  const line1Y = 298;
  const line2Y = 352;
  const markW = measureText(markPhrase, { size: tagSize, weight: 700, tracking: -0.8 });
  const markH = tagSize * 0.7;
  const bleed = 5;
  const markX = TEXT_X - bleed;
  const markY = line2Y - markH + 9;
  const tagline =
    `<text x="${TEXT_X}" y="${line1Y}" font-family="${SANS}" font-weight="700" font-size="${tagSize}" letter-spacing="-0.8" fill="${PAPER}">${line1}</text>` +
    `<rect x="${f(markX)}" y="${f(markY)}" width="${f(markW + bleed * 2)}" height="${f(markH)}" fill="${MARKER}" transform="rotate(-1.5 ${f(markX)} ${f(markY + markH)})"/>` +
    `<text x="${TEXT_X}" y="${line2Y}" font-family="${SANS}" font-weight="700" font-size="${tagSize}" letter-spacing="-0.8">` +
    `<tspan fill="${INK}">${markPhrase}</tspan><tspan fill="${PAPER}">${rest}</tspan></text>`;

  // 머리카락 구분선 + 기능 한 줄.
  const rule = `<rect x="${TEXT_X}" y="388" width="470" height="1.5" fill="${PAPER}" fill-opacity="0.28"/>`;
  const features = `<text x="${TEXT_X}" y="424" font-family="${SANS}" font-weight="400" font-size="22" fill="${PAPER}" fill-opacity="0.86">${copy.features}</text>`;

  return eyebrow + wordmark + tagline + rule + features;
}

// ── 전체 SVG ──────────────────────────────────────────────────────────────────
const svgFor = (copy) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <clipPath id="shotClip">
      <rect x="${SHOT.x}" y="${SHOT.y}" width="${SHOT.w}" height="${SHOT.h}" rx="${SHOT.r}"/>
    </clipPath>
    <linearGradient id="tail" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${COBALT}" stop-opacity="0"/>
      <stop offset="1" stop-color="${COBALT}" stop-opacity="0.16"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${COBALT}"/>
  ${screenshotMarkup()}
  ${copyMarkup(copy)}
</svg>`;

// ── 렌더 ──────────────────────────────────────────────────────────────────────
for (const lang of langArg === 'all' ? ['ko', 'en'] : [langArg]) {
  const copy = COPY[lang];
  const img = new Resvg(svgFor(copy), { ...resvgOptions, fitTo: { mode: 'width', value: W } }).render();
  const png = encodeRgbPng(img.pixels, img.width, img.height);
  for (const out of copy.outs) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, png);
    console.log(`✓ ${out.replace(`${ROOT}/`, '')} (${png.length} bytes)`);
  }
}
