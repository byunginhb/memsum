// scripts/gen-icons.mjs
//
// Memsum 브랜드 앱 아이콘·스플래시 에셋 생성기.
// 브랜드 마크(design.md §7-4, DotsGrid.tsx): 라벤더(#7C6FE8) 배경 + 흰 점 3×3,
// 우하단 1개만 코랄(accent #FFB84D). 이 9닷 로고를 스토어용 PNG로 래스터화한다.
//
// 실행: node scripts/gen-icons.mjs   (devDep @resvg/resvg-js 필요)
// 산출:
//   assets/images/icon.png                    (1024, 불투명 — iOS/일반 앱 아이콘)
//   assets/images/android-icon-foreground.png (1024, 투명 — 적응형 전경, 세이프존)
//   assets/images/android-icon-monochrome.png (1024, 투명 흰점 — 테마 아이콘)
//   assets/images/splash-icon.png             (1024, 투명 — 스플래시, 라벤더 배경 위)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'assets', 'images');

// ── 브랜드 색 (src/design/tokens/colors.ts) ──────────────────────────────────
const LAVENDER = '#7C6FE8'; // primary (brand)
const WHITE = '#FFFFFF'; // onPrimary
const CORAL = '#FFB84D'; // accent (우하단 점)

// 3×3 그리드: 점 지름 d, 간격 g. 브랜드 비율 d:g = 0.18:0.14 ≈ 1:0.778 유지.
// 전체 폭 = 3d + 2g = 3d + 2(0.778d) = 4.556d.
const GAP_RATIO = 0.14 / 0.18;
const SPAN_IN_DOTS = 3 + 2 * GAP_RATIO; // ≈ 4.556

/**
 * 9닷 브랜드 마크 SVG 문자열 생성.
 * @param size 정방형 캔버스 px
 * @param gridFraction 그리드가 차지하는 캔버스 비율(여백 포함)
 * @param bg 배경색(null이면 투명)
 * @param dotColor 일반 점 색
 * @param accentColor 우하단 점 색(null이면 dotColor와 동일)
 */
function dotsSvg({ size, gridFraction, bg, dotColor, accentColor }) {
  const span = size * gridFraction;
  const dot = span / SPAN_IN_DOTS;
  const gap = dot * GAP_RATIO;
  const offset = (size - span) / 2;
  const r = dot / 2;

  let circles = '';
  for (let i = 0; i < 9; i += 1) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const cx = offset + col * (dot + gap) + r;
    const cy = offset + row * (dot + gap) + r;
    const fill = i === 8 && accentColor ? accentColor : dotColor;
    circles += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${fill}"/>`;
  }

  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">${bgRect}${circles}</svg>`;
}

/** SVG 문자열을 size×size PNG로 렌더해 파일로 쓴다. */
function renderPng(svg, size, outName) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  const out = join(ASSETS, outName);
  writeFileSync(out, png);
  console.log(`✓ ${outName} (${png.length} bytes)`);
}

const SIZE = 1024;

// 1) iOS/일반 앱 아이콘 — 불투명 라벤더 배경(애플이 모서리 라운딩 처리). 여백 넉넉히.
renderPng(
  dotsSvg({ size: SIZE, gridFraction: 0.56, bg: LAVENDER, dotColor: WHITE, accentColor: CORAL }),
  SIZE,
  'icon.png',
);

// 2) Android 적응형 전경 — 투명 배경, 세이프존(중앙) 안에 들어오도록 그리드를 더 작게.
renderPng(
  dotsSvg({ size: SIZE, gridFraction: 0.5, bg: null, dotColor: WHITE, accentColor: CORAL }),
  SIZE,
  'android-icon-foreground.png',
);

// 3) Android 모노크롬(테마 아이콘) — 단색 흰점 실루엣, 투명 배경.
renderPng(
  dotsSvg({ size: SIZE, gridFraction: 0.5, bg: null, dotColor: WHITE, accentColor: WHITE }),
  SIZE,
  'android-icon-monochrome.png',
);

// 4) 스플래시 아이콘 — 투명 배경 흰점(+코랄). app.json 스플래시 backgroundColor(라벤더) 위에 표시.
renderPng(
  dotsSvg({ size: SIZE, gridFraction: 0.56, bg: null, dotColor: WHITE, accentColor: CORAL }),
  SIZE,
  'splash-icon.png',
);

console.log('완료: 브랜드 아이콘·스플래시 4종 생성.');
