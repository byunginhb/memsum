// scripts/marketing/gen-reel.mjs — 세로 홍보 영상(릴스·쇼츠) 생성기.
//
// 장면(약 25.5초, 무음 + 빈 오디오 트랙, 자막형 헤드라인):
//   A 0.0  쌓이는 스크린샷 + "사진첩 ‘스크린샷’ 폴더, 몇 장이세요?"  (첫 프레임부터 헤드라인이 보인다)
//   B 4.3  새 스크린샷 한 장이 들려 올라오고, 코발트 스캔선이 훑으며 줄마다 형광펜(시그니처 "스캔")
//   C 10.2 날짜 줄이 떨어져 나와 캘린더 행으로 → [캘린더에 등록] → 등록됨
//   D 15.8 일요일 19:00, 5줄 리포트 순위가 차례로 떨어진다(1위만 형광펜)
//   E 21.0 아이콘 마크가 조립되고 "까먹어도 괜찮아요…" + "Google Play에서 받기"
//
// 방식: 한 HTML 에 모든 장면을 층으로 쌓고, window.frame(t) 가 시각 t 의 상태를 직접 계산해 그린다
// (CSS 애니메이션 대신 — 프레임마다 정확히 같은 그림이 나오도록). Playwright 로 30fps JPEG 를 찍어
// ffmpeg(H.264 High, yuv420p, faststart)로 바로 인코딩한다.
//
// 실행: node scripts/marketing/gen-reel.mjs [--lang ko|en|all] [--frames 0,4.5,9]  (--frames 는 해당 시각 PNG 만 저장)
// 산출: docs/marketing/assets/reel-30s.mp4, reel-30s.en.mp4

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { COPY } from './lib/copy.mjs';
import { C, OUT_DIR, SHOTS, doc, esc, markSvg, openPage, playwright, ffmpegPath, shotHtml, toRgbPng } from './lib/kit.mjs';
import { PARTS_CSS, calendarRows, checkIcon, clipCard, ctaPill, reportList } from './parts.mjs';

const W = 1080;
const H = 1920;
const FPS = 30;
const DURATION = 25.5;
const PAD = 96;

const arg = (k, d) => {
  const i = process.argv.indexOf(k);
  return i >= 0 ? process.argv[i + 1] : d;
};
const langs = arg('--lang', 'all') === 'all' ? ['ko', 'en'] : [arg('--lang')];
const stills = arg('--frames', null)?.split(',').map(Number);

/** 쌓인 더미(청첩장은 장면 A 끝에 맨 위로 떨어지는 '새 스크린샷'이라 따로). [키, x, y, 회전, 착지 시각] */
const PILE = [
  ['receipt', -40, 1000, -13, -1], ['coupon', 190, 930, 7, -1], ['fee', 420, 1010, -5, -1], ['dinner', 640, 920, 11, -1],
  ['recipe', 840, 1030, -8, -1], ['flight', 40, 1260, 9, 0.25], ['article', 270, 1200, -11, 0.55], ['exhibit', 520, 1290, 4, 0.9],
  ['dentist', 760, 1220, 14, 1.3],
];

function headlineBlock(id, lines, { y, size, color, dark }) {
  return (
    `<div id="${id}" class="disp${dark ? ' dark' : ''}" style="position:absolute;left:${PAD}px;right:${PAD}px;top:${y}px;font-size:${size}px;color:${color}">` +
    lines
      .map((l, i) => {
        const m = l.match(/^(.*?)\{(.+?)\}(.*)$/);
        const inner = m ? `${esc(m[1])}<span class="mk" style="--m:0">${esc(m[2])}</span>${esc(m[3])}` : esc(l);
        return `<div class="hl" data-i="${i}" style="opacity:0">${inner}</div>`;
      })
      .join('') +
    `</div>`
  );
}

function build(lang) {
  const c = COPY[lang];
  const ko = lang === 'ko';
  const size = ko ? 96 : 84;

  const pile = PILE.map(([k, x, y, r], i) =>
    shotHtml(SHOTS[lang][k], {
      u: 0.62,
      id: `p${i}`,
      style: `left:${x}px;top:${y}px;--r:${r}deg;transform:rotate(${r}deg);box-shadow:0 0 0 1px rgba(13,14,18,.14),0 18px 40px -18px rgba(13,14,18,.45)`,
    }),
  ).join('');

  const layerA =
    `<div class="layer" id="LA" style="background:${C.paper}">${pile}` +
    headlineBlock('hA', c.problem, { y: 300, size: ko ? 96 : 76, color: C.ink }) +
    `<div id="subA" style="position:absolute;left:${PAD}px;right:${PAD}px;top:${ko ? 560 : 590}px;font-size:38px;line-height:1.45;color:${C.ink2};opacity:0">${esc(c.problemSub)}</div></div>`;

  const layerB = `<div class="layer" id="LB" style="background:${C.cobalt}">${headlineBlock('hB', c.scan, { y: 300, size, color: C.paper, dark: true })}</div>`;

  const layerC =
    `<div class="layer" id="LC" style="background:${C.paper}">${headlineBlock('hC', c.calendar, { y: 300, size, color: C.ink })}` +
    calendarRows(c, { x: PAD, y: 960, w: W - PAD * 2, vars: '--fsd:80px;--fs1:44px;--fs2:28px;--fs3:34px', id: 'cal' }) +
    // 등록 후 상태(버튼과 겹쳐 두고 교차 전환)
    `<div id="okC" class="cal" style="position:absolute;opacity:0;background:transparent"><div class="ok" style="font-weight:700;font-size:34px;display:flex;align-items:center;gap:14px">${checkIcon(44, C.success)}<span>${esc(c.cal.added)}</span></div></div>` +
    `</div>`;

  const layerD =
    `<div class="layer" id="LD" style="background:${C.ink}">${headlineBlock('hD', c.report, { y: 300, size: ko ? 92 : 80, color: C.paper, dark: true })}` +
    `<div id="sunD" class="mono" style="position:absolute;left:${PAD}px;top:${ko ? 560 : 640}px;font-size:28px;color:#9EA2AC;opacity:0">${esc(c.sunday)} · ${esc(c.reportRange)}</div>` +
    reportList(c, { x: PAD, y: ko ? 640 : 720, w: W - PAD * 2, dark: true, vars: '--nw:92px;--nf:80px;--tf:38px;--sf:26px;--rp:24px', id: 'rep' }) +
    `</div>`;

  const layerE =
    `<div class="layer" id="LE" style="background:${C.cobalt}">` +
    `<div style="position:absolute;left:${PAD - 34}px;top:300px">${markSvg(260, { id: 'em' })}</div>` +
    headlineBlock('hE', c.hero, { y: 640, size: ko ? 100 : 90, color: C.paper, dark: true }) +
    `<div id="ctaE" style="position:absolute;left:${PAD}px;top:${ko ? 1050 : 1020}px;opacity:0;transform-origin:left center">${ctaPill(c, { bg: C.ink, fg: C.paper, size: 46, pad: '34px 54px' })}</div>` +
    `<div id="avE" style="position:absolute;left:${PAD}px;right:${PAD}px;top:${ko ? 1220 : 1190}px;font-size:32px;line-height:1.5;color:${C.paper};opacity:0">${esc(c.availability[0])}<br>${esc(c.availability[1])}</div>` +
    `</div>`;

  const card = clipCard(lang, 'wedding', { x: 110, y: 760, w: 860, h: 640, marks: [0, 0, 0, 0], scan: 0, corner: C.paper, cw: 7, cl: 72, co: 26, id: 'card' });
  const date = SHOTS[lang].wedding.lines[1];
  const chip = `<div id="chip" style="position:absolute;left:0;top:0;opacity:0;white-space:nowrap;font-size:40px;padding:6px 14px;background:${C.marker};color:${C.ink};font-weight:600;border-radius:4px;transform-origin:left top">${esc(date)}</div>`;

  const top = `<div id="brand" class="mono" style="position:absolute;left:${PAD}px;top:220px;font-size:26px">MEMSUM</div>`;
  const edge = `<div id="edge" style="position:absolute;left:0;right:0;height:10px;background:${C.marker};opacity:0"></div>`;

  return { body: layerA + layerB + layerC + layerD + layerE + card + chip + edge + top, ko };
}

const CSS = `
.layer{position:absolute;inset:0;overflow:hidden}
#card{transform-origin:center center;z-index:5}
#chip{z-index:6}
#edge{z-index:7}
#brand{z-index:8}
.hl{will-change:transform}
`;

// 브라우저 쪽 타임라인 — frame(t) 하나로 모든 층의 상태를 계산한다.
const SCRIPT = String.raw`
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const cl = (x) => Math.min(1, Math.max(0, x));
const seg = (t, a, b) => cl((t - a) / (b - a));
const out3 = (x) => 1 - Math.pow(1 - x, 3);
const io3 = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const back = (x) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;

function rise(el, t, start, dur = 0.55, dist = 46) {
  const p = out3(seg(t, start, start + dur));
  el.style.opacity = p;
  el.style.transform = 'translateY(' + (1 - p) * dist + 'px)';
}
function headline(id, t, start, markAt) {
  $$('#' + id + ' .hl').forEach((el, i) => rise(el, t, start + i * 0.09));
  const mk = $('#' + id + ' .mk');
  if (mk) mk.style.setProperty('--m', out3(seg(t, markAt, markAt + 0.5)));
}
function wipe(id, t, a, b) {
  const p = io3(seg(t, a, b));
  $('#' + id).style.clipPath = 'inset(' + (1 - p) * 100 + '% 0 0 0)';
  return p;
}

// 카드 상태: [중심x, 중심y, 배율, 회전]
const CARD = { A: [540, 1330, 0.42, -7], B: [540, 1100, 1, -2], C: [770, 740, 0.46, 3] };
const CARD_H = 640;
// 카드 안 줄 아래끝(카드 높이 비율) — shotHtml 기하에서 계산: 기준 높이 640/(860/390)
const BASE_H = CARD_H / (860 / 390);
const LINE_B = [0, 1, 2, 3].map((i) => (70 + i * 46 + 6) / BASE_H);

let chipFrom = null, chipTo = null, okPos = null;

window.frame = function (t) {
  // ── 층 와이프 ──
  wipe('LB', t, 4.3, 5.0);
  wipe('LC', t, 10.2, 10.9);
  const pD = wipe('LD', t, 15.8, 16.5);
  wipe('LE', t, 21.0, 21.7);
  const edge = $('#edge');
  const wipes = [[4.3, 5.0], [10.2, 10.9], [15.8, 16.5], [21.0, 21.7]];
  const w = wipes.find(([a, b]) => t > a && t < b);
  if (w) { edge.style.opacity = 1; edge.style.top = (1 - io3(seg(t, w[0], w[1]))) * 1920 - 5 + 'px'; } else edge.style.opacity = 0;

  // 머리표 색: 종이 바탕이면 잉크, 그 외 종이색
  // 머리표(y≈230)를 실제로 덮고 있는 층으로 판단 — 와이프가 진행도 0.875 를 넘으면 그 층이 덮는다.
  const covers = (a, b) => io3(seg(t, a, b)) > 0.875;
  const onPaper = covers(21.0, 21.7) || covers(15.8, 16.5) ? false : covers(10.2, 10.9) ? true : !covers(4.3, 5.0);
  $('#brand').style.color = onPaper ? '${C.ink}' : '${C.paper}';

  // ── A: 더미 ──
  headline('hA', t + 0.6, 0, 0.75);
  rise($('#subA'), t, 1.1);
  $$('[id^=p]').filter((e) => /^p\d+$/.test(e.id)).forEach((el, i) => {
    const land = ${JSON.stringify(PILE.map((p) => p[4]))}[i];
    const p = land < 0 ? 1 : seg(t, land - 0.55, land);
    const y = (1 - out3(p)) * -1500;
    const r = parseFloat(el.style.getPropertyValue('--r'));
    el.style.transform = 'translateY(' + y + 'px) rotate(' + (r + (1 - p) * 25) + 'deg)';
    el.style.opacity = p > 0 ? 1 : 0;
  });

  // ── 카드 ──
  let [x, y, s, r] = CARD.A;
  let op = 1;
  if (t < 3.6) {
    const p = seg(t, 2.95, 3.6);
    y = lerp(-900, CARD.A[1], back(p));
    r = CARD.A[3] - (1 - p) * 20;
    op = p > 0 ? 1 : 0;
  } else if (t < 10.2) {
    const p = io3(seg(t, 4.2, 5.1));
    [x, y, s, r] = CARD.A.map((v, i) => lerp(v, CARD.B[i], p));
    // 스캔 끝난 순간 살짝 튕김
    s *= 1 + 0.025 * Math.sin(Math.PI * seg(t, 7.75, 8.1));
  } else {
    const p = io3(seg(t, 10.2, 11.0));
    [x, y, s, r] = CARD.B.map((v, i) => lerp(v, CARD.C[i], p));
    op = 1 - seg(t, 15.8, 16.1);
    y -= seg(t, 15.8, 16.1) * 60;
  }
  const card = $('#card');
  card.style.transform = 'translate(' + (x - 540) + 'px,' + (y - 1080) + 'px) scale(' + s + ') rotate(' + r + 'deg)';
  card.style.opacity = op;

  // ── B: 스캔 ──
  headline('hB', t, 5.0, 7.95);
  const sp = seg(t, 6.0, 7.7);
  const scan = $('#card-scan');
  scan.style.transform = 'translateY(' + sp * CARD_H + 'px)';
  scan.style.opacity = t < 6.0 ? 0 : Math.min(sp * 30, (1 - sp) * 14, 1);
  $$('#card .ln .mkb').forEach((el, i) => el.style.setProperty('--m', out3(cl((sp - LINE_B[i]) / 0.09))));

  // ── C: 캘린더 ──
  headline('hC', t, 10.6, 11.3);
  const r0 = $('#cal-r0'), r1 = $('#cal-r1');
  rise(r0, t, 11.0);
  rise(r1, t, 12.45, 0.45, 24);
  if (!chipFrom && t >= 11.0) {
    // 카드가 자리 잡은 뒤의 날짜 줄 위치와 도착할 행 위치를 한 번 잰다.
    const ln = $('#card .ln[data-i="1"] .tx').getBoundingClientRect();
    const mt = $('#cal-r1 .mt');
    const prev = r1.style.transform; r1.style.transform = 'none';
    const dst = mt.getBoundingClientRect();
    const btn = $('#cal-btn1').getBoundingClientRect();
    r1.style.transform = prev;
    chipFrom = { x: ln.left, y: ln.top - 4, s: ln.height / 46 };
    chipTo = { x: dst.left, y: dst.top - 70 };
    okPos = { x: btn.left, y: btn.top };
  }
  const chip = $('#chip');
  if (chipFrom && t >= 11.7 && t < 12.9) {
    const p = io3(seg(t, 11.75, 12.5));
    const cx = lerp(chipFrom.x, chipTo.x, p);
    const cy = lerp(chipFrom.y, chipTo.y, p) - Math.sin(Math.PI * p) * 140;
    const cs = lerp(chipFrom.s, 0.8, p);
    chip.style.transform = 'translate(' + cx + 'px,' + cy + 'px) scale(' + cs + ') rotate(' + (-1.5 + Math.sin(Math.PI * p) * -4) + 'deg)';
    chip.style.opacity = Math.min(seg(t, 11.7, 11.85), 1 - seg(t, 12.55, 12.85));
  } else chip.style.opacity = 0;
  // 버튼 누름 → 등록됨
  const btn = $('#cal-btn1');
  const press = seg(t, 13.5, 13.62) - seg(t, 13.62, 13.8);
  btn.style.transform = 'scale(' + (1 - 0.04 * press) + ')';
  btn.style.opacity = 1 - seg(t, 13.85, 14.05);
  const ok = $('#okC');
  if (okPos) { ok.style.left = okPos.x + 'px'; ok.style.top = okPos.y + 'px'; }
  const pOk = out3(seg(t, 13.95, 14.35));
  ok.style.opacity = pOk;
  ok.style.transform = 'translateY(' + (1 - pOk) * 14 + 'px)';

  // ── D: 5줄 리포트 ──
  headline('hD', t, 16.2, 16.9);
  rise($('#sunD'), t, 16.45);
  for (let i = 0; i < 5; i++) {
    const a = 17.0 + i * 0.22;
    const row = $('#rep-r' + i);
    const pr = seg(t, a, a + 0.5);
    row.style.opacity = out3(seg(t, a, a + 0.3));
    row.style.borderTopColor = 'rgba(242,243,240,' + 0.14 * pr + ')';
    const n = $('#rep-n' + i);
    n.style.transform = 'translateY(' + (1 - back(pr)) * -90 + 'px)';
    const tx = row.children[1];
    tx.style.transform = 'translateX(' + (1 - out3(seg(t, a + 0.08, a + 0.55))) * 30 + 'px)';
  }
  // 1위 숫자: 형광펜이 깔리기 전엔 종이색, 깔리는 동안 잉크로(형광펜 위 글자는 항상 잉크).
  const m0 = out3(seg(t, 18.5, 18.95));
  $('#rep-n0').style.setProperty('--m', m0);
  $('#rep-n0').style.color = m0 > 0.35 ? '${C.ink}' : '${C.paper}';

  // ── E: 마크 조립 + 받기 ──
  const pc = out3(seg(t, 21.5, 22.1));
  const off = (1 - pc) * 26;
  [[-off, -off], [off, -off], [off, off], [-off, off]].forEach(([dx, dy], i) => {
    const el = $('#em-c' + i);
    el.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
    el.style.opacity = pc;
  });
  $('#em-bar').style.transform = 'scaleX(' + out3(seg(t, 22.05, 22.5)) + ')';
  headline('hE', t, 22.35, 23.05);
  const pp = seg(t, 23.3, 23.75);
  const cta = $('#ctaE');
  cta.style.opacity = out3(seg(t, 23.3, 23.5));
  cta.style.transform = 'scale(' + (0.9 + 0.1 * back(pp)) + ')';
  rise($('#avE'), t, 23.7);
};
`;

async function encode(page, outPath) {
  const ff = spawn(
    ffmpegPath(),
    [
      '-v', 'error', '-y',
      '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
      '-map', '0:v', '-map', '1:a', '-shortest',
      // JPEG(전범위) → BT.709 제한 범위로 변환하고 태그도 709 로 — 휴대폰에서 코발트가 틀어지지 않게.
      '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-pix_fmt', 'yuv420p',
      '-preset', 'slow', '-crf', '19', '-r', String(FPS), '-g', String(FPS * 2),
      '-c:a', 'aac', '-b:a', '64k',
      '-movflags', '+faststart', outPath,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((res, rej) => ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`ffmpeg ${code}`)))));
  const total = Math.round(DURATION * FPS);
  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.frame(t), i / FPS);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`  ${(i / FPS).toFixed(1)}s / ${DURATION}s`);
  }
  ff.stdin.end();
  await done;
}

mkdirSync(OUT_DIR, { recursive: true });
const browser = await playwright().chromium.launch();
try {
  for (const lang of langs) {
    const { body } = build(lang);
    const page = await openPage(browser, doc({ w: W, h: H, bg: C.paper, css: PARTS_CSS + CSS, body, script: SCRIPT }), { w: W, h: H });
    // 측정값(칩 경로)이 정해지도록 C 장면을 한 번 지나 간다.
    await page.evaluate(() => window.frame(11.2));
    const sfx = lang === 'ko' ? '' : '.en';
    if (stills) {
      const dir = process.env.REEL_FRAMES_DIR ?? join(OUT_DIR, '..', 'reel-frames');
      mkdirSync(dir, { recursive: true });
      for (const t of stills) {
        await page.evaluate((x) => window.frame(x), t);
        await toRgbPng(await page.screenshot({ type: 'png' }), join(dir, `reel${sfx}-${t.toFixed(2)}.png`));
      }
      console.log(`✓ frames ${lang} → ${dir}`);
    } else {
      const out = join(OUT_DIR, `reel-30s${sfx}.mp4`);
      await encode(page, out);
      console.log(`✓ ${out}`);
    }
    await page.close();
  }
} finally {
  await browser.close();
}
