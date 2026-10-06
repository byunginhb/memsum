// scripts/marketing/lib/kit.mjs — 홍보 자산 공용 부품("형광펜 & 코발트", docs/design/redesign-2026-10.md).
//
// 모든 자산은 HTML/CSS 로 그린 뒤 Playwright(Chromium)로 찍는다. 정지 이미지와 릴스가 같은 부품
// (미니 스크린샷·크롭 모서리·형광펜·마크)을 공유해야 톤이 갈라지지 않아서 한곳에 둔다.
//
// 외부 의존성(playwright, ffmpeg-static)은 저장소 package.json 에 넣지 않았다(홍보물 재생성 때만 필요).
// 찾는 순서: $MARKETING_DEPS_DIR → scripts/marketing/ → 저장소 루트. README 의 설치 명령 참고.

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..', '..', '..');
export const OUT_DIR = join(ROOT, 'docs', 'marketing', 'assets');
const FONTS = join(ROOT, 'assets', 'fonts');
const RAW = join(ROOT, 'assets', 'store', 'raw');

// ── 의존성 ────────────────────────────────────────────────────────────────────
function requireDep(name) {
  const bases = [process.env.MARKETING_DEPS_DIR, join(HERE, '..'), ROOT].filter(Boolean);
  for (const base of bases) {
    try {
      return createRequire(join(base, 'noop.js'))(name);
    } catch {
      /* 다음 후보 */
    }
  }
  throw new Error(
    `${name} 을(를) 찾지 못했어요. README 의 설치 명령(npm --prefix scripts/marketing i ...)을 먼저 실행하거나 MARKETING_DEPS_DIR 을 지정하세요.`,
  );
}
export const playwright = () => requireDep('playwright');
export const ffmpegPath = () => requireDep('ffmpeg-static');

// ── 색·서체 (src/design/tokens 와 같은 값) ────────────────────────────────────
export const C = {
  cobalt: '#1530FF',
  paper: '#F2F3F0',
  surface: '#FAFAF8',
  ink: '#0D0E12',
  ink2: '#565A63',
  marker: '#E8FF3A',
  primaryMuted: '#DCE0FF',
  success: '#0B6E3B',
  rule: 'rgba(13,14,18,0.10)',
  ruleStrong: 'rgba(13,14,18,0.22)',
};

const fontUrl = (f) => pathToFileURL(join(FONTS, f)).href;
export const rawShot = (lang, file) => pathToFileURL(join(RAW, lang === 'ko' ? 'ko-KR' : 'en-US', `${file}.png`)).href;
export const iconUrl = pathToFileURL(join(ROOT, 'assets', 'images', 'icon.png')).href;

export const BASE_CSS = `
@font-face{font-family:WS;font-weight:400;src:url(${fontUrl('WantedSans-Regular.ttf')})}
@font-face{font-family:WS;font-weight:600;src:url(${fontUrl('WantedSans-SemiBold.ttf')})}
@font-face{font-family:WS;font-weight:700;src:url(${fontUrl('WantedSans-Bold.ttf')})}
@font-face{font-family:WS;font-weight:900;src:url(${fontUrl('WantedSans-Black.ttf')})}
@font-face{font-family:JBM;font-weight:500;src:url(${fontUrl('JetBrainsMono-Medium.ttf')})}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:${C.paper};color:${C.ink};font-family:WS,sans-serif;-webkit-font-smoothing:antialiased;word-break:keep-all}
.stage{position:relative;overflow:hidden}
.mono{font-family:JBM,monospace;font-weight:500;letter-spacing:.02em}
.disp{font-weight:900;letter-spacing:-.035em;line-height:1.12}

/* 형광펜 — 반드시 바탕으로만. 글자는 항상 잉크. 높이 글자의 ~60%, 아래 정렬, -1.5° */
.mk{position:relative;display:inline-block;color:${C.ink};z-index:0}
.mk::before{content:'';position:absolute;z-index:-1;left:-.08em;right:-.1em;bottom:.06em;height:.6em;
  background:${C.marker};transform-origin:left center;transform:rotate(-1.5deg) scaleX(var(--m,1))}

/* 잉크·코발트 바탕: 형광펜이 글자 높이 전체를 덮어야 잉크 글자가 바탕에 묻히지 않는다. */
.dark .mk::before{bottom:-.04em;height:1.02em}

/* 크롭 모서리 */
.crop{position:absolute;inset:calc(var(--co,14px)*-1);pointer-events:none}
.crop i{position:absolute;width:var(--cl,48px);height:var(--cl,48px);border:0 solid var(--cc,${C.ink})}
.crop i:nth-child(1){top:0;left:0;border-top-width:var(--cw,5px);border-left-width:var(--cw,5px)}
.crop i:nth-child(2){top:0;right:0;border-top-width:var(--cw,5px);border-right-width:var(--cw,5px)}
.crop i:nth-child(3){bottom:0;left:0;border-bottom-width:var(--cw,5px);border-left-width:var(--cw,5px)}
.crop i:nth-child(4){bottom:0;right:0;border-bottom-width:var(--cw,5px);border-right-width:var(--cw,5px)}

/* 미니 스크린샷(앱 웹 미리보기의 예시 스크린샷과 같은 그림, src/dev/preview.web.ts shot()) */
.shot{position:absolute;overflow:hidden;width:calc(390px*var(--u));height:calc(844px*var(--u));
  border-radius:calc(30px*var(--u));box-shadow:0 0 0 1px rgba(13,14,18,.12)}
.shot .st{position:absolute;left:calc(28px*var(--u));top:calc(20px*var(--u));font-size:calc(15px*var(--u));font-weight:600}
.shot .bar{position:absolute;left:0;top:0;right:0;height:calc(112px*var(--u))}
.shot .hd{position:absolute;left:calc(28px*var(--u));top:calc(70px*var(--u));font-size:calc(22px*var(--u));font-weight:700;white-space:nowrap}
.shot .cd{position:absolute;left:calc(20px*var(--u));right:calc(20px*var(--u));border-radius:calc(18px*var(--u))}
.shot .ln{position:absolute;left:calc(40px*var(--u));white-space:nowrap;line-height:1}
.shot .ln .mkb{position:absolute;z-index:0;left:-.12em;right:-.12em;bottom:-.08em;height:.78em;background:${C.marker};
  transform-origin:left center;transform:rotate(-1.5deg) scaleX(var(--m,0))}
.shot .ln .tx{position:relative;z-index:1}
.shot .blk{position:absolute;left:calc(40px*var(--u));height:calc(12px*var(--u));border-radius:99px;opacity:.12}
.shot .scan{position:absolute;left:0;right:0;top:0;height:16%;border-top:calc(5px*var(--u)) solid ${C.cobalt};
  background:linear-gradient(to bottom,rgba(21,48,255,.16),rgba(21,48,255,0));opacity:0}

/* 앱 화면(원본 1080x1920 캡처) */
.phone{position:absolute;border-radius:var(--pr,36px);overflow:hidden;box-shadow:0 0 0 2px rgba(13,14,18,.18)}
.phone img{display:block;width:100%;height:auto}
`;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "앞 {형광펜} 뒤" → 형광펜 구절 하나를 .mk 로 감싼다. 형광펜 구절 글자는 항상 잉크. */
export function marked(text, { m = 1, id = '' } = {}) {
  const parts = String(text).match(/^(.*?)\{(.+?)\}(.*)$/s);
  if (!parts) return esc(text);
  const [, a, b, c] = parts;
  return `${esc(a)}<span class="mk"${id ? ` id="${id}"` : ''} style="--m:${m}">${esc(b)}</span>${esc(c)}`;
}

export const crop = ({ color = C.ink, len = 48, w = 5, out = 14 } = {}) =>
  `<div class="crop" style="--cc:${color};--cl:${len}px;--cw:${w}px;--co:${out}px"><i></i><i></i><i></i><i></i></div>`;

// ── 예시 스크린샷(앱 미리보기 데이터와 동일. 와이파이 비밀번호 장면과 택배 장면(기능 제외 결정)은 뺐다) ─────────────
export const SHOTS = {
  ko: {
    wedding: { bg: '#FBF7F0', ink: '#3B3128', lines: ['김도윤 · 이지민', '10월 10일 토요일 낮 12시 30분', '달빛정원홀 3층 그랜드홀', '서울 강남구 도화로 120'] },
    dinner: { bg: '#FFFFFF', ink: '#1E1E1E', bar: '#1F6F50', barInk: '#FFFFFF', head: '예약 확정', lines: ['돌담식당 을지로점', '내일 오후 7:00 · 4명', '10분 지각 시 자동 취소'] },
    dentist: { bg: '#FFFFFF', ink: '#1F2329', bar: '#F2F3F5', head: '맑은미소치과', card: '#E9EBEF', lines: ['10/06(화) 오전 10:30', '스케일링 예약', '변경은 하루 전까지'] },
    exhibit: { bg: '#111111', ink: '#F5F5F5', head: '모바일 티켓', lines: ['올해의 작가상 2026', '가람미술관 서울', '14:00 입장 · 2매'] },
    coupon: { bg: '#000000', ink: '#FFFFFF', lines: ['가을 세일 20% 쿠폰', '5만 원 이상 최대 2만 원', '~ 10월 12일 23:59'] },
    article: { bg: '#FFFFFF', ink: '#202124', lines: ['회의를 절반으로', '줄이는 방법', '1. 안건 없는 초대는 거절', '2. 기본 25분'] },
    receipt: { bg: '#FAFAFA', ink: '#222222', card: '#FFFFFF', lines: ['하루로스터스 성수', '카페 라테 x2  13,000', '스콘 x1  4,300', '합계 17,300원'] },
    flight: { bg: '#2A5BD7', ink: '#FFFFFF', head: '모바일 탑승권', lines: ['HN 113', '김포 → 제주', '08:10 · 게이트 12 · 14C'] },
    recipe: { bg: '#FFF8EC', ink: '#3A2A12', lines: ['들기름 막국수', '메밀면 1인분', '들기름 2 · 간장 1', '김가루 · 깨 듬뿍'] },
    fee: { bg: '#CBD5E1', ink: '#1B1B1B', card: '#FFFFFF', lines: ['10월 회비 안내', '1인 20,000원', '금요일까지 부탁드려요'] },
  },
  en: {
    wedding: { bg: '#FBF7F0', ink: '#3B3128', lines: ['Daniel Kim & Mia Lee', 'Saturday, October 10 · 12:30 PM', 'The Chapel Hall, 3rd floor', '1200 Harbor Ave, Brooklyn'] },
    dinner: { bg: '#FFFFFF', ink: '#1E1E1E', bar: '#1F6F50', barInk: '#FFFFFF', head: 'Confirmed', lines: ['Juniper Kitchen', 'Tomorrow 7:00 PM · 4 people', 'Table held for 15 min'] },
    dentist: { bg: '#FFFFFF', ink: '#1F2329', bar: '#F2F3F5', head: 'Bright Smile Dental', card: '#E9EBEF', lines: ['Tue 10/6 · 10:30 AM', 'Cleaning appointment', 'Reschedule 24h ahead'] },
    exhibit: { bg: '#111111', ink: '#F5F5F5', head: 'Mobile ticket', lines: ['Modern Light 2026', 'City Museum of Art', '2:00 PM entry · 2 tickets'] },
    coupon: { bg: '#000000', ink: '#FFFFFF', lines: ['Fall sale 20% off', 'Orders over $50, up to $20', 'Ends Oct 12, 11:59 PM'] },
    article: { bg: '#FFFFFF', ink: '#202124', lines: ['How to cut your', 'meetings in half', '1. No agenda, no invite', '2. Default to 25 min'] },
    receipt: { bg: '#FAFAFA', ink: '#222222', card: '#FFFFFF', lines: ['Harbor Roasters', 'Latte x2  $11.00', 'Scone x1  $6.30', 'Total $17.30'] },
    flight: { bg: '#2A5BD7', ink: '#FFFFFF', head: 'Boarding pass', lines: ['CL 113', 'SFO → SEA', '8:10 AM · Gate 12 · 14C'] },
    recipe: { bg: '#FFF8EC', ink: '#3A2A12', lines: ['Sesame soba', 'Soba, 1 serving', 'Sesame oil 2 · soy 1', 'Seaweed · sesame seeds'] },
    fee: { bg: '#CBD5E1', ink: '#1B1B1B', card: '#FFFFFF', lines: ['October dues', '$20 each', 'Please send by Friday'] },
  },
};

/**
 * 미니 스크린샷 HTML. u = 390px 기준 배율. marks: 줄별 형광펜 진행도(0~1) 배열.
 * style 로 위치·회전을 받는다. scan=true 면 스캔선 요소를 넣는다(릴스에서 움직임).
 */
export function shotHtml(spec, { u = 1, style = '', id = '', marks = [], scan = false } = {}) {
  const px = (n) => `calc(${n}px*var(--u))`;
  const p = [];
  if (spec.bar) p.push(`<div class="bar" style="background:${spec.bar}"></div>`);
  p.push(`<div class="st" style="color:${spec.barInk ?? spec.ink}">9:41</div>`);
  let y = 70;
  if (spec.head) {
    p.push(`<div class="hd" style="color:${spec.barInk ?? spec.ink}">${esc(spec.head)}</div>`);
    y = 150;
  }
  if (spec.card) p.push(`<div class="cd" style="top:${px(y - 30)};height:${px(spec.lines.length * 46 + 36)};background:${spec.card}"></div>`);
  spec.lines.forEach((line, i) => {
    const size = i === 0 ? 24 : 18;
    const weight = i === 0 ? 700 : 400;
    const top = y + i * 46 - size * 0.86;
    p.push(
      `<div class="ln" data-i="${i}" style="top:${px(top)};font-size:${px(size)};font-weight:${weight};color:${spec.ink}">` +
        `<span class="mkb" style="--m:${marks[i] ?? 0}"></span><span class="tx">${esc(line)}</span></div>`,
    );
  });
  const blockTop = y + spec.lines.length * 46 + 60;
  [300, 260, 320, 210, 280, 180].forEach((w, i) =>
    p.push(`<div class="blk" style="top:${px(blockTop + i * 34)};width:${px(w)};background:${spec.ink}"></div>`),
  );
  if (scan) p.push(`<div class="scan"></div>`);
  return `<div class="shot"${id ? ` id="${id}"` : ''} style="--u:${u};background:${spec.bg};${style}">${p.join('')}</div>`;
}

// ── 브랜드 마크(scripts/gen-icons.mjs G 와 같은 기하) ─────────────────────────
const G = { frame: 0.62, corner: 0.2, stroke: 0.065, barWidth: 0.5, barHeight: 0.15, barRadius: 0.12, barRotate: -8 };

/** size×size 마크 SVG. 릴스에서 따로 움직이도록 막대(id-bar)·모서리(id-c0..3)에 id 를 붙인다. */
export function markSvg(size, { corner = C.paper, bar = C.marker, id = 'mk' } = {}) {
  const m = 100;
  const cx = 50;
  const half = (m * G.frame) / 2;
  const l = m * G.corner;
  const a = cx - half;
  const b = cx + half;
  const paths = [
    `M ${a} ${a + l} L ${a} ${a} L ${a + l} ${a}`,
    `M ${b - l} ${a} L ${b} ${a} L ${b} ${a + l}`,
    `M ${b} ${b - l} L ${b} ${b} L ${b - l} ${b}`,
    `M ${a + l} ${b} L ${a} ${b} L ${a} ${b - l}`,
  ];
  const bw = m * G.barWidth;
  const bh = m * G.barHeight;
  return (
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style="overflow:visible">` +
    `<g transform="rotate(${G.barRotate} 50 50)"><rect id="${id}-bar" x="${cx - bw / 2}" y="${cx - bh / 2}" width="${bw}" height="${bh}" rx="${bh * G.barRadius}" fill="${bar}" style="transform-box:fill-box;transform-origin:left center"/></g>` +
    paths
      .map(
        (d, i) =>
          `<path id="${id}-c${i}" d="${d}" fill="none" stroke="${corner}" stroke-width="${m * G.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`,
      )
      .join('') +
    `</svg>`
  );
}

/** 완성 HTML 문서. */
export function doc({ w, h, bg = C.paper, css = '', body, script = '' }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${BASE_CSS}
html,body{width:${w}px;height:${h}px;background:${bg}}
.stage{width:${w}px;height:${h}px;background:${bg}}
${css}</style></head><body><div class="stage">${body}</div>${script ? `<script>${script}</script>` : ''}</body></html>`;
}

// ── 렌더링 ───────────────────────────────────────────────────────────────────
let tmp;
/** HTML 을 임시 파일로 써서 file:// 로 연다(서체·원본 화면을 file:// 로 읽기 위해). */
export async function openPage(browser, html, { w, h }) {
  tmp ??= mkdtempSync(join(tmpdir(), 'memsum-mkt-'));
  const file = join(tmp, `p${Math.random().toString(36).slice(2)}.html`);
  writeFileSync(file, html);
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  return page;
}

/** PNG 버퍼 → 알파 없는 RGB PNG(ffmpeg rgb24). */
export function toRgbPng(buf, outPath) {
  return new Promise((res, rej) => {
    const ff = spawn(ffmpegPath(), ['-v', 'error', '-y', '-f', 'png_pipe', '-i', '-', '-pix_fmt', 'rgb24', '-frames:v', '1', outPath]);
    let err = '';
    ff.stderr.on('data', (d) => (err += d));
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(err))));
    ff.stdin.end(buf);
  });
}
