// scripts/gen-icons.mjs
//
// Memsum 앱 아이콘·스플래시 에셋 생성기 — docs/design/redesign-2026-10.md §8
// 브랜드 마크: 종이색 크롭 모서리 4개로 만든 프레임 + 그 안을 가로지르는 기울어진 형광펜 막대.
// 기하 비율은 src/design/components/BrandMark/BrandMark.tsx의 BRAND_MARK_GEOMETRY와 같다(바꾸면 둘 다).
//
// 실행: node scripts/gen-icons.mjs   (devDep @resvg/resvg-js 필요)
// 산출(assets/images):
//   icon.png                    1024 불투명(알파 채널 없음) — 코발트 바탕 + 마크
//   icon-1024-noalpha.png       1024 불투명(알파 채널 없음) — 스토어 업로드용 사본
//   android-icon-foreground.png 1024 투명 — 적응형 전경, 마크를 세이프존(지름 66%) 안에
//   android-icon-background.png 1024 불투명 — 코발트 단색
//   android-icon-monochrome.png 1024 투명 — 흰 실루엣(모서리 + 막대)
//   splash-icon.png             1024 투명 — 코발트 타일 마크(라이트 paper / 다크 ink 바탕 모두에서 보이게)
//   favicon.png                 48 — 웹 파비콘(코발트 타일 마크)

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { crc32, deflateSync } from 'node:zlib';

import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets', 'images');

// ── 브랜드 색 (src/design/tokens/colors.ts palette) ─────────────────────────
const COBALT = '#1530FF';
const PAPER = '#F2F3F0';
const MARKER = '#E8FF3A';
const WHITE = '#FFFFFF';

// ── 마크 기하 (BRAND_MARK_GEOMETRY와 동일) ───────────────────────────────────
const G = {
  tileRadius: 0.22,
  frame: 0.62,
  corner: 0.2,
  stroke: 0.065,
  barWidth: 0.5,
  barHeight: 0.15,
  barRadius: 0.12,
  barRotate: -8,
};

const SIZE = 1024;
/** 적응형 아이콘 세이프존: 캔버스 지름의 66% 원. 마크 캔버스를 그만큼으로 줄이면 프레임 모서리까지 원 안에 든다. */
const ANDROID_SAFE = 0.66;
/** 스플래시 타일이 캔버스에서 차지하는 비율. AnimatedSplash MARK_SIZE(120) = imageWidth(200) × 0.6. */
const SPLASH_TILE = 0.6;

const f = (n) => n.toFixed(2);

/**
 * 마크 SVG 조각(모서리 + 막대). (ox, oy)에서 시작하는 m×m 칸 안에 그린다.
 */
function markShapes({ ox, oy, m, cornerColor, barColor }) {
  const cx = ox + m / 2;
  const cy = oy + m / 2;
  const half = (m * G.frame) / 2;
  const l = m * G.corner;
  const a = { x: cx - half, y: cy - half };
  const b = { x: cx + half, y: cy + half };
  const corners = [
    `M ${f(a.x)} ${f(a.y + l)} L ${f(a.x)} ${f(a.y)} L ${f(a.x + l)} ${f(a.y)}`,
    `M ${f(b.x - l)} ${f(a.y)} L ${f(b.x)} ${f(a.y)} L ${f(b.x)} ${f(a.y + l)}`,
    `M ${f(b.x)} ${f(b.y - l)} L ${f(b.x)} ${f(b.y)} L ${f(b.x - l)} ${f(b.y)}`,
    `M ${f(a.x + l)} ${f(b.y)} L ${f(a.x)} ${f(b.y)} L ${f(a.x)} ${f(b.y - l)}`,
  ].join(' ');

  const bw = m * G.barWidth;
  const bh = m * G.barHeight;
  const bar =
    `<rect x="${f(cx - bw / 2)}" y="${f(cy - bh / 2)}" width="${f(bw)}" height="${f(bh)}" ` +
    `rx="${f(bh * G.barRadius)}" fill="${barColor}" transform="rotate(${G.barRotate} ${f(cx)} ${f(cy)})"/>`;
  const frame =
    `<path d="${corners}" fill="none" stroke="${cornerColor}" stroke-width="${f(m * G.stroke)}" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`;
  return bar + frame;
}

function svg(size, body) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

/** 캔버스 가운데에 m×m 마크 칸을 둔다. */
function centered(size, fraction, colors) {
  const m = size * fraction;
  const o = (size - m) / 2;
  return markShapes({ ox: o, oy: o, m, ...colors });
}

/** 코발트 둥근 타일 + 마크(BrandMark variant="tile"과 같은 모양). */
function tile(size, fraction) {
  const m = size * fraction;
  const o = (size - m) / 2;
  return (
    `<rect x="${f(o)}" y="${f(o)}" width="${f(m)}" height="${f(m)}" rx="${f(m * G.tileRadius)}" fill="${COBALT}"/>` +
    markShapes({ ox: o, oy: o, m, cornerColor: PAPER, barColor: MARKER })
  );
}

/**
 * RGBA 픽셀을 알파 채널 없는 RGB PNG로 인코딩한다.
 * why: 앱스토어 아이콘은 알파 채널이 있으면 거절된다. resvg 출력은 항상 RGBA라 직접 RGB로 다시 쓴다.
 */
function encodeRgbPng(rgba, width, height) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * (width * 3 + 1);
    raw[row] = 0; // 필터 없음
    for (let x = 0; x < width; x += 1) {
      const s = (y * width + x) * 4;
      const d = row + 1 + x * 3;
      raw[d] = rgba[s];
      raw[d + 1] = rgba[s + 1];
      raw[d + 2] = rgba[s + 2];
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 비트 깊이
  ihdr[9] = 2; // 색 형식: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** SVG를 size×size PNG 파일로 쓴다. opaque면 알파 채널 없는 RGB로. */
function render(svgText, size, outName, { opaque = false } = {}) {
  const image = new Resvg(svgText, { fitTo: { mode: 'width', value: size } }).render();
  const png = opaque ? encodeRgbPng(image.pixels, image.width, image.height) : image.asPng();
  writeFileSync(join(ASSETS, outName), png);
  console.log(`✓ ${outName} (${image.width}×${image.height}, ${opaque ? 'RGB' : 'RGBA'}, ${png.length} bytes)`);
}

const cobaltBg = `<rect width="${SIZE}" height="${SIZE}" fill="${COBALT}"/>`;
const iconSvg = svg(SIZE, cobaltBg + centered(SIZE, 1, { cornerColor: PAPER, barColor: MARKER }));

// 1) iOS/일반 앱 아이콘 + 스토어 업로드용 사본 — 모서리 라운딩은 OS가 한다.
render(iconSvg, SIZE, 'icon.png', { opaque: true });
render(iconSvg, SIZE, 'icon-1024-noalpha.png', { opaque: true });

// 2) Android 적응형 전경 — 투명 바탕, 세이프존 안.
render(
  svg(SIZE, centered(SIZE, ANDROID_SAFE, { cornerColor: PAPER, barColor: MARKER })),
  SIZE,
  'android-icon-foreground.png',
);

// 3) Android 적응형 배경 — 코발트 단색.
render(svg(SIZE, cobaltBg), SIZE, 'android-icon-background.png', { opaque: true });

// 4) Android 모노크롬(테마 아이콘) — 모서리 + 막대 흰 실루엣.
render(
  svg(SIZE, centered(SIZE, ANDROID_SAFE, { cornerColor: WHITE, barColor: WHITE })),
  SIZE,
  'android-icon-monochrome.png',
);

// 5) 스플래시 — 투명 바탕 위 코발트 타일 마크.
render(svg(SIZE, tile(SIZE, SPLASH_TILE)), SIZE, 'splash-icon.png');

// 6) 웹 파비콘.
const FAVICON = 48;
render(svg(FAVICON, tile(FAVICON, 1)), FAVICON, 'favicon.png');

console.log('완료: 아이콘·스플래시 에셋 7종 생성.');
