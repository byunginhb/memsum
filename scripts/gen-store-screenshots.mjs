// scripts/gen-store-screenshots.mjs
//
// Google Play 휴대전화 스크린샷(1080×1920, 불투명) 합성기 — docs/design/redesign-2026-10.md "형광펜 & 코발트".
//
// 구도: 위쪽에 짧은 캡션(Wanted Sans Black, 핵심 구절 하나만 형광펜 바탕 + 잉크 글씨),
// 아래에 실제 앱 화면(둥근 모서리 + 얇은 테두리)과 그 바깥의 크롭 모서리 4개.
// 바탕은 장면마다 paper / cobalt 를 번갈아 쓰되 cobalt 는 두 장만(시작·중간 강조).
//
// 원본 화면: assets/store/raw/<lang>/NN-*.png (웹 미리보기를 360×640, 배율 3으로 찍은 1080×1920).
// 캡션은 docs/store/listings/<lang>/full.txt 에 적힌 실제 기능과 맞춘다(최상급·감탄·가짜 후기 금지).
//
// 실행: node scripts/gen-store-screenshots.mjs   (devDep @resvg/resvg-js 필요)
// 산출: docs/store/images/<lang>/phone/NN-*.png

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

import { encodeRgbPng } from './lib/png-rgb.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = join(ROOT, 'assets', 'fonts');
const FONT_FILES = ['WantedSans-Regular.ttf', 'WantedSans-Bold.ttf', 'WantedSans-Black.ttf', 'JetBrainsMono-Medium.ttf'].map(
  (name) => join(FONTS_DIR, name),
);
const RAW_DIR = join(ROOT, 'assets', 'store', 'raw');
const OUT_ROOT = join(ROOT, 'docs', 'store', 'images');

// ── 브랜드 색 (src/design/tokens/colors.ts palette) ─────────────────────────
const COBALT = '#1530FF';
const PAPER = '#F2F3F0';
const INK = '#0D0E12';
const MARKER = '#E8FF3A';

const W = 1080;
const H = 1920;
const SANS = 'Wanted Sans';

// ── 배치 ────────────────────────────────────────────────────────────────────
const CAPTION = { x: 96, size: 76, line: 96, top: 214 };
/** 기기 화면: 원본 9:16을 그대로 줄인다. 아래 여백은 크롭 모서리가 들어갈 만큼만. */
const SCREEN = { w: 792, h: 1408, r: 44 };
SCREEN.x = (W - SCREEN.w) / 2;
SCREEN.y = H - SCREEN.h - 84;
const CORNER = { out: 22, len: 56, stroke: 7 };

/**
 * 장면 목록. caption = [첫 줄, 둘째 줄], 둘째 줄의 {…} 가 형광펜 구절(한 장에 한 곳).
 * bg: 'cobalt' | 'paper'.
 */
const SCENES = [
  { file: '01-scan', bg: 'cobalt' },
  { file: '02-home', bg: 'paper' },
  { file: '03-result', bg: 'paper' },
  { file: '04-calendar', bg: 'cobalt' },
  { file: '05-report', bg: 'paper' },
  { file: '06-search', bg: 'paper' },
];

const CAPTIONS = {
  'ko-KR': {
    '01-scan': ['스크린샷을 찍으면', '{글자를 읽어} 정리해요'],
    '02-home': ['놓치면 안 될 일정을', '{D-day 순}으로 먼저 보여 줘요'],
    '03-result': ['캡처마다', '{제목과 요약}을 붙여요'],
    '04-calendar': ['날짜가 보이면', '{구글 캘린더}에 등록해요'],
    '05-report': ['일요일 저녁엔', '{다시 볼 5개}를 골라 줘요'],
    '06-search': ['다시 찾을 땐', '{캡처 속 글자}로 검색해요'],
  },
  'en-US': {
    '01-scan': ['Take a screenshot.', 'Memsum {reads the text}'],
    '02-home': ['Upcoming plans first,', 'sorted by {D-day}'],
    '03-result': ['Every capture gets', '{a title and summary}'],
    '04-calendar': ['Dates go straight', 'to {Google Calendar}'],
    '05-report': ['Every Sunday, {5 captures}', 'worth a second look'],
    '06-search': ['Search the {words inside}', 'your screenshots'],
  },
};

const resvgOptions = {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: SANS },
};

const f = (n) => n.toFixed(1);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 글자 폭 측정 — 같은 서체로 한 번 그려 bbox를 잰다(resvg는 텍스트 측정 API가 없다). */
function measure(text, size) {
  if (!text) return 0;
  // 앞뒤 공백도 폭에 넣으려고 양끝에 'I'를 붙여 재고 그만큼 뺀다.
  const probe = (t) =>
    `<svg width="3000" height="300" xmlns="http://www.w3.org/2000/svg">` +
    `<text x="10" y="${size * 1.5}" font-family="${SANS}" font-size="${size}" font-weight="900" letter-spacing="${CAPTION_TRACK(size)}">${esc(t)}</text></svg>`;
  const wOf = (t) => new Resvg(probe(t), resvgOptions).getBBox()?.width ?? 0;
  return wOf(`I${text}I`) - wOf('II');
}

/** 자간: display 스케일과 같은 -0.03em. */
const CAPTION_TRACK = (size) => f(-0.03 * size);

/** 한 줄 렌더 — {…} 구간이 있으면 그 뒤에 기운 형광펜 사각형을 깐다. */
function captionLine(raw, y, textColor) {
  const m = raw.match(/^(.*)\{(.+)\}(.*)$/);
  const size = CAPTION.size;
  const attrs = `font-family="${SANS}" font-weight="900" font-size="${size}" letter-spacing="${CAPTION_TRACK(size)}"`;
  if (!m) return `<text x="${CAPTION.x}" y="${y}" ${attrs} fill="${textColor}">${esc(raw)}</text>`;
  const [, before, mark, after] = m;
  const bx = CAPTION.x + measure(before, size);
  const mw = measure(mark, size);
  // 형광펜: 글자 높이의 약 70%, 아래쪽 정렬, 좌우로 살짝 삐져나오고 -1.5° 기운다(<Marked>와 같은 손맛).
  const bleed = 10;
  const mh = size * 0.56;
  const mx = bx - bleed;
  const my = y - mh + size * 0.1;
  const rect = `<rect x="${f(mx)}" y="${f(my)}" width="${f(mw + bleed * 2)}" height="${f(mh)}" fill="${MARKER}" transform="rotate(-1.5 ${f(mx)} ${f(my + mh)})"/>`;
  const text =
    `<text x="${CAPTION.x}" y="${y}" ${attrs} xml:space="preserve">` +
    `<tspan fill="${textColor}">${esc(before)}</tspan><tspan fill="${INK}">${esc(mark)}</tspan><tspan fill="${textColor}">${esc(after)}</tspan></text>`;
  return rect + text;
}

function compose({ lines, bg, png }) {
  const isCobalt = bg === 'cobalt';
  const ground = isCobalt ? COBALT : PAPER;
  const textColor = isCobalt ? PAPER : INK;
  const lineColor = isCobalt ? PAPER : INK;

  const caption = lines.map((l, i) => captionLine(l, CAPTION.top + i * CAPTION.line, textColor)).join('');

  const { x, y, w, h, r } = SCREEN;
  const href = `data:image/png;base64,${png.toString('base64')}`;
  const screen =
    `<clipPath id="screenClip"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>` +
    `<image x="${x}" y="${y}" width="${w}" height="${h}" href="${href}" clip-path="url(#screenClip)" preserveAspectRatio="xMidYMid slice"/>` +
    // 얇은 테두리 — paper 바탕에선 잉크 머리카락선, cobalt 바탕에선 종이색이 비치지 않게 잉크 22%.
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${INK}" stroke-opacity="${isCobalt ? 0.35 : 0.22}" stroke-width="2"/>`;

  // 크롭 모서리 — 화면 바깥으로 밀어낸 L자 4개(브랜드 마크).
  const { out, len, stroke } = CORNER;
  const a = { x: x - out, y: y - out };
  const b = { x: x + w + out, y: y + h + out };
  const d = [
    `M ${a.x} ${a.y + len} L ${a.x} ${a.y} L ${a.x + len} ${a.y}`,
    `M ${b.x - len} ${a.y} L ${b.x} ${a.y} L ${b.x} ${a.y + len}`,
    `M ${b.x} ${b.y - len} L ${b.x} ${b.y} L ${b.x - len} ${b.y}`,
    `M ${a.x + len} ${b.y} L ${a.x} ${b.y} L ${a.x} ${b.y - len}`,
  ].join(' ');
  const corners = `<path d="${d}" fill="none" stroke="${lineColor}" stroke-width="${stroke}" stroke-linecap="square"/>`;

  return (
    `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">` +
    `<rect width="${W}" height="${H}" fill="${ground}"/>` +
    caption +
    screen +
    corners +
    `</svg>`
  );
}

// ── 렌더 ──────────────────────────────────────────────────────────────────────
for (const [lang, captions] of Object.entries(CAPTIONS)) {
  const outDir = join(OUT_ROOT, lang, 'phone');
  // 이전 산출물을 지워 파일명 순서가 꼬이지 않게 한다(업로드는 파일명 순).
  if (existsSync(outDir)) {
    for (const old of readdirSync(outDir)) if (old.endsWith('.png')) rmSync(join(outDir, old));
  } else {
    mkdirSync(outDir, { recursive: true });
  }
  for (const scene of SCENES) {
    const src = join(RAW_DIR, lang, `${scene.file}.png`);
    if (!existsSync(src)) throw new Error(`원본 화면 없음: ${src}`);
    const svg = compose({ lines: captions[scene.file], bg: scene.bg, png: readFileSync(src) });
    // 바탕을 꽉 채워 그리므로 알파는 전부 255 — 버려도 색이 바뀌지 않는다.
    const img = new Resvg(svg, { ...resvgOptions, fitTo: { mode: 'width', value: W } }).render();
    const out = encodeRgbPng(img.pixels, img.width, img.height);
    writeFileSync(join(outDir, `${scene.file}.png`), out);
    console.log(`✓ ${lang}/phone/${scene.file}.png (${out.length} bytes)`);
  }
}
