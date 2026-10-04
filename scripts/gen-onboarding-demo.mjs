// scripts/gen-onboarding-demo.mjs
//
// 온보딩 1페이지 "스캔 데모"용 가상 스크린샷 생성기.
//
// 내용: 식당 예약 확정 문자 한 통(9:41 상태바, 메시지 앱 화면). 시간·장소가 들어 있어
// Memsum이 일정으로 뽑아낼 법한 스크린샷이다. 가게·사람 이름은 모두 가상.
// 같은 서체로 각 줄의 실제 글자 영역(bbox)을 재서 정규화 좌표(0~1)로 함께 내보낸다 —
// 온보딩의 형광펜 박스가 이미지 속 글자 줄에 정확히 얹히도록.
//
// 실행: node scripts/gen-onboarding-demo.mjs   (devDep @resvg/resvg-js 필요)
// 산출: assets/images/onboarding-demo.png
//       src/features/onboarding/onboarding-demo.ts (비율 + 줄 좌표, 자동 생성)

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Resvg } from '@resvg/resvg-js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONTS_DIR = join(ROOT, 'assets', 'fonts');
const FONT_FILES = ['WantedSans-Regular.ttf', 'WantedSans-SemiBold.ttf', 'WantedSans-Bold.ttf'].map((n) =>
  join(FONTS_DIR, n),
);
const OUT_PNG = join(ROOT, 'assets', 'images', 'onboarding-demo.png');
const OUT_TS = join(ROOT, 'src', 'features', 'onboarding', 'onboarding-demo.ts');

const SANS = 'Wanted Sans';
const resvgOptions = {
  font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: SANS },
};

// ── 메시지 앱(라이트) 색 — 실제 스크린샷처럼 보이게 앱 브랜드 색이 아닌 중립색을 쓴다 ──
const BG = '#FFFFFF';
const BUBBLE = '#E9E9EB';
const TEXT = '#000000';
const GRAY = '#8A8A8E';
const LINK = '#0A7AFF';
const RULE = 'rgba(0,0,0,0.12)';

// 3배율(390pt 폭 기기 기준이 아닌 360pt × 3) 캔버스.
const W = 1080;
const PAD_X = 48;

const BODY_SIZE = 48;
const BODY_LINE = 68;
const BUBBLE_PAD_X = 40;
const BUBBLE_PAD_Y = 30;
const BUBBLE_MAX_TEXT = W - PAD_X * 2 - BUBBLE_PAD_X * 2 - 120;

/** 말풍선 속 줄(위→아래). 형광펜 박스도 이 순서로 그어진다. */
const LINES = [
  { text: '[오늘의식탁 성수점] 예약 확정', weight: 600 },
  { text: '김지은님, 예약이 확정됐어요.', weight: 400 },
  { text: '일시 10월 18일(토) 오후 7:30', weight: 400 },
  { text: '인원 성인 4명', weight: 400 },
  { text: '장소 연무장길 12, 2층', weight: 400 },
  { text: '변경은 하루 전까지 가능해요.', weight: 400 },
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function textEl(text, { x, y, size, weight = 400, fill = TEXT, anchor = 'start' }) {
  return (
    `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${size}" font-weight="${weight}" ` +
    `fill="${fill}" text-anchor="${anchor}">${esc(text)}</text>`
  );
}

/** 한 줄을 실제 위치에 그려 resvg로 잉크 영역을 잰다(resvg엔 텍스트 측정 API가 없다). */
function measure(el, width, height) {
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${el}</svg>`;
  const box = new Resvg(svg, resvgOptions).getBBox();
  if (!box) throw new Error(`글자 영역을 잴 수 없음: ${el}`);
  return box;
}

// ── 레이아웃 ─────────────────────────────────────────────────────────────────
const STATUS_H = 150;
const NAV_TOP = STATUS_H;
const AVATAR_R = 62;
const AVATAR_CY = NAV_TOP + 40 + AVATAR_R;
const NAME_Y = AVATAR_CY + AVATAR_R + 52;
const NAV_BOTTOM = NAME_Y + 40;
const STAMP_Y = NAV_BOTTOM + 96;
const BUBBLE_TOP = STAMP_Y + 44;

const bubbleTextX = PAD_X + BUBBLE_PAD_X;
const firstBaseline = BUBBLE_TOP + BUBBLE_PAD_Y + BODY_SIZE * 0.95;
const lineEls = LINES.map((l, i) =>
  textEl(l.text, { x: bubbleTextX, y: firstBaseline + i * BODY_LINE, size: BODY_SIZE, weight: l.weight }),
);
const BUBBLE_BOTTOM = firstBaseline + (LINES.length - 1) * BODY_LINE + BODY_SIZE * 0.3 + BUBBLE_PAD_Y;
// 보낸 답장(오른쪽 파란 말풍선) + 읽음 표시 + 아래 입력창 — 실제 대화 화면처럼 세로로 채운다.
const REPLY_TEXT = '네, 감사합니다!';
const REPLY_TOP = BUBBLE_BOTTOM + 40;
const REPLY_H = BODY_SIZE + BUBBLE_PAD_Y * 2 + 8;
const READ_Y = REPLY_TOP + REPLY_H + 46;
/** 캔버스 세로 길이 — 온보딩 1페이지 남은 공간(세로형)을 채우는 3:4 비율. */
const H = 1440;
const INPUT_H = 96;
const INPUT_TOP = H - INPUT_H - 44;

const lineBoxes = lineEls.map((el) => measure(el, W, H));
const widest = Math.max(...lineBoxes.map((b) => b.x + b.width - bubbleTextX));
if (widest > BUBBLE_MAX_TEXT) throw new Error(`말풍선 줄이 너무 길다: ${widest}px > ${BUBBLE_MAX_TEXT}px`);
const BUBBLE_W = widest + BUBBLE_PAD_X * 2;

const replyEl = (x) => textEl(REPLY_TEXT, { x, y: REPLY_TOP + BUBBLE_PAD_Y + 4 + BODY_SIZE * 0.85, size: BODY_SIZE, fill: '#FFFFFF' });
const replyBox = measure(replyEl(0), W, H);
const REPLY_W = replyBox.width + BUBBLE_PAD_X * 2;
const REPLY_X = W - PAD_X - REPLY_W;
if (READ_Y > INPUT_TOP - 40) throw new Error('내용이 입력창과 겹친다 — H를 늘릴 것');

// ── 상태바 아이콘(셀룰러 막대 · 와이파이 · 배터리) ──────────────────────────
function statusIcons() {
  const baseY = 108;
  const bars = [14, 22, 30, 38]
    .map((h, i) => `<rect x="${786 + i * 16}" y="${baseY - h}" width="11" height="${h}" rx="2.5" fill="${TEXT}"/>`)
    .join('');
  // 와이파이: 아래 한 점을 중심으로 한 ±45° 부채꼴 호 3개 + 중심 점.
  const cx = 884;
  const cy = baseY - 2;
  const k = Math.SQRT1_2;
  const wifi =
    [11, 23, 35]
      .map(
        (r) =>
          `<path d="M ${cx - r * k} ${cy - r * k} A ${r} ${r} 0 0 1 ${cx + r * k} ${cy - r * k}" ` +
          `fill="none" stroke="${TEXT}" stroke-width="7" stroke-linecap="round"/>`,
      )
      .join('') + `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${TEXT}"/>`;
  const battery =
    `<rect x="938" y="${baseY - 36}" width="76" height="36" rx="10" fill="none" stroke="${TEXT}" stroke-opacity="0.4" stroke-width="3.5"/>` +
    `<rect x="944" y="${baseY - 30}" width="58" height="24" rx="6" fill="${TEXT}"/>` +
    `<rect x="1018" y="${baseY - 24}" width="5" height="12" rx="2" fill="${TEXT}" fill-opacity="0.4"/>`;
  return bars + wifi + battery;
}

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  ${textEl('9:41', { x: 168, y: 108, size: 51, weight: 600, anchor: 'middle' })}
  ${statusIcons()}
  <path d="M ${PAD_X + 34} ${AVATAR_CY - 26} L ${PAD_X + 8} ${AVATAR_CY} L ${PAD_X + 34} ${AVATAR_CY + 26}"
    fill="none" stroke="${LINK}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${W / 2}" cy="${AVATAR_CY}" r="${AVATAR_R}" fill="#B9BCC4"/>
  ${textEl('오늘', { x: W / 2, y: AVATAR_CY + 17, size: 46, weight: 600, fill: '#FFFFFF', anchor: 'middle' })}
  ${textEl('오늘의식탁 성수점 ›', { x: W / 2, y: NAME_Y, size: 36, weight: 400, anchor: 'middle' })}
  <rect x="0" y="${NAV_BOTTOM}" width="${W}" height="2" fill="${RULE}"/>
  ${textEl('문자 메시지 · 오늘 오후 2:03', { x: W / 2, y: STAMP_Y, size: 34, weight: 400, fill: GRAY, anchor: 'middle' })}
  <rect x="${PAD_X}" y="${BUBBLE_TOP}" width="${BUBBLE_W}" height="${BUBBLE_BOTTOM - BUBBLE_TOP}" rx="54" fill="${BUBBLE}"/>
  ${lineEls.join('\n  ')}
  <rect x="${REPLY_X}" y="${REPLY_TOP}" width="${REPLY_W}" height="${REPLY_H}" rx="${REPLY_H / 2}" fill="${LINK}"/>
  ${replyEl(REPLY_X + BUBBLE_PAD_X)}
  ${textEl('읽음 오후 2:05', { x: W - PAD_X - 8, y: READ_Y, size: 32, fill: GRAY, anchor: 'end' })}
  <circle cx="${PAD_X + 44}" cy="${INPUT_TOP + INPUT_H / 2}" r="44" fill="#EDEDF0"/>
  <path d="M ${PAD_X + 44} ${INPUT_TOP + INPUT_H / 2 - 20} v 40 M ${PAD_X + 24} ${INPUT_TOP + INPUT_H / 2} h 40"
    stroke="${GRAY}" stroke-width="7" stroke-linecap="round"/>
  <rect x="${PAD_X + 112}" y="${INPUT_TOP}" width="${W - PAD_X * 2 - 112}" height="${INPUT_H}" rx="${INPUT_H / 2}"
    fill="none" stroke="#D1D1D6" stroke-width="3"/>
  ${textEl('문자 메시지', { x: PAD_X + 152, y: INPUT_TOP + INPUT_H / 2 + 12, size: 36, fill: '#B5B5BA' })}
</svg>`;

const png = new Resvg(svg, { ...resvgOptions, fitTo: { mode: 'original' } }).render().asPng();
writeFileSync(OUT_PNG, png);

// ── 줄 좌표(정규화) — 형광펜이 글자를 살짝 감싸도록 위아래·좌우 여유를 준다 ──
const BOX_PAD_X = 10;
const BOX_PAD_Y = 6;
const r4 = (n) => Math.round(n * 10000) / 10000;
const boxes = lineBoxes.map((b) => ({
  x: r4((b.x - BOX_PAD_X) / W),
  y: r4((b.y - BOX_PAD_Y) / H),
  width: r4((b.width + BOX_PAD_X * 2) / W),
  height: r4((b.height + BOX_PAD_Y * 2) / H),
}));

const ts = `// 자동 생성 — node scripts/gen-onboarding-demo.mjs. 직접 고치지 말 것(이미지와 좌표가 어긋난다).
import type { ScanBox } from '@/design';

/** assets/images/onboarding-demo.png 크기(px). */
export const ONBOARDING_DEMO_SIZE = { width: ${W}, height: ${H} } as const;

/** 데모 이미지 가로/세로 비. */
export const ONBOARDING_DEMO_RATIO = ${W} / ${H};

/** 데모 이미지 속 말풍선 글자 줄(정규화 0~1, 위→아래). 같은 서체로 잰 실제 잉크 영역. */
export const ONBOARDING_DEMO_BOXES: readonly ScanBox[] = [
${boxes.map((b) => `  { x: ${b.x}, y: ${b.y}, width: ${b.width}, height: ${b.height} },`).join('\n')}
];
`;
mkdirSync(dirname(OUT_TS), { recursive: true });
writeFileSync(OUT_TS, ts);

console.log(`✓ ${OUT_PNG} (${W}×${H})`);
console.log(`✓ ${OUT_TS} (${boxes.length}줄)`);
