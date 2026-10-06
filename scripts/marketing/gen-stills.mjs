// scripts/marketing/gen-stills.mjs — 홍보용 정지 이미지 생성기("형광펜 & 코발트").
//
// 산출(docs/marketing/assets/, 모두 알파 없는 RGB PNG):
//   feed-01~05.png / feed-0N.en.png   1080x1080  인스타 피드 캐러셀(문제 → 스캔 → 캘린더 → 5줄 → 받기)
//   story-01~03.png / story-0N.en.png 1080x1920  스토리·릴스 커버(위 250px·아래 340px 는 앱 UI 자리라 비움)
//   ph-gallery-01~04.png              1270x760   Product Hunt 갤러리(영어)
//   profile-avatar.png                1080x1080  프로필 사진(원형으로 잘려도 마크가 들어가게)
//   x-header.png / x-header.en.png    1500x500   X(트위터) 헤더
//
// 실행: node scripts/marketing/gen-stills.mjs [--only feed,story,ph,avatar,x]
// 문구는 lib/copy.mjs(확정 문구 출처 표기)에서만 가져온다.

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { COPY } from './lib/copy.mjs';
import { C, OUT_DIR, SHOTS, doc, esc, marked, markSvg, openPage, playwright, rawShot, shotHtml, toRgbPng } from './lib/kit.mjs';
import { PARTS_CSS, calendarRows, checkIcon, clipCard, col, ctaPill, h, p, phone, reportList, topbar } from './parts.mjs';

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i >= 0 ? new Set(process.argv[i + 1].split(',')) : null;
})();
const want = (k) => !only || only.has(k);

// ── 쌓인 스크린샷 더미 배치(결정적) ─────────────────────────────────────────────
const PILE_KEYS = ['receipt', 'coupon', 'fee', 'dinner', 'recipe', 'flight', 'article', 'exhibit', 'dentist', 'wedding'];
/** [x, y, 회전] — 0~1 상대 좌표. 마지막(청첩장)이 맨 위. */
const PILE = [
  [0.02, 0.1, -13], [0.2, 0.02, 7], [0.4, 0.12, -5], [0.58, 0.0, 11], [0.76, 0.1, -8],
  [0.1, 0.36, 9], [0.3, 0.3, -11], [0.52, 0.38, 4], [0.78, 0.34, 12], [0.36, 0.5, -3],
];
function pile(lang, { x, y, w, h, u }) {
  return PILE.map(([px, py, r], i) =>
    shotHtml(SHOTS[lang][PILE_KEYS[i]], {
      u,
      style: `left:${Math.round(x + px * w)}px;top:${Math.round(y + py * h)}px;transform:rotate(${r}deg);box-shadow:0 0 0 1px rgba(13,14,18,.14),0 18px 40px -18px rgba(13,14,18,.45)`,
    }),
  ).join('');
}

// ── 피드 1080x1080 ──────────────────────────────────────────────────────────
const FEED = 1080;
function feed(lang, n) {
  const c = COPY[lang];
  const ko = lang === 'ko';
  const pad = 84;
  const css = `.stage{--pad:${pad}px}`;
  const num = `0${n}/05`;
  const textCol = (inner, y = 150) => col({ x: pad, y, w: FEED - pad * 2 }, inner);
  if (n === 1) {
    return {
      bg: C.paper,
      css,
      body:
        pile(lang, { x: 40, y: 560, w: 900, h: 700, u: 0.62 }) +
        topbar({ right: num }) +
        textCol(h(c.problem, { size: ko ? 92 : 84 }) + p(esc(c.problemSub), { size: 34, mt: 30 })),
    };
  }
  if (n === 2) {
    return {
      bg: C.cobalt,
      css,
      body:
        topbar({ color: C.paper, right: num }) +
        textCol(h(c.scan, { size: ko ? 86 : 84, color: C.paper, dark: true })) +
        clipCard(lang, 'wedding', { x: 170, y: 470, w: 740, h: 500, rot: -2.5, marks: [1, 1, 1, 0.45], scan: 0.8, corner: C.paper, cw: 6, cl: 62, co: 22 }),
    };
  }
  if (n === 3) {
    return {
      bg: C.paper,
      css,
      body:
        topbar({ right: num }) +
        textCol(h(c.calendar, { size: ko ? 86 : 84 })) +
        clipCard(lang, 'wedding', { x: 590, y: 420, w: 390, h: 240, rot: 3.5, marks: [0, 1, 0, 0], corner: C.ink, cw: 4, cl: 34, co: 12 }) +
        calendarRows(c, { x: pad, y: 720, w: FEED - pad * 2, only: [1] }),
    };
  }
  if (n === 4) {
    return {
      bg: C.ink,
      css,
      body:
        topbar({ color: C.paper, right: num }) +
        textCol(h(c.report, { size: ko ? 86 : 80, color: C.paper, dark: true }) + p(esc(c.sunday), { size: 24, color: '#9EA2AC', mt: 34, cls: 'mono' })) +
        reportList(c, { x: pad, y: 470, w: FEED - pad * 2, dark: true, withSub: false, vars: '--nw:78px;--nf:64px;--tf:38px;--rp:20px' }),
    };
  }
  // 5: 받기
  return {
    bg: C.cobalt,
    css,
    body:
      topbar({ color: C.paper, right: num }) +
      `<div style="position:absolute;left:${pad - 26}px;top:118px">${markSvg(190)}</div>` +
      textCol(
        h(c.hero, { size: ko ? 84 : 78, color: C.paper, dark: true }) +
          `<div style="margin-top:48px">${ctaPill(c, { bg: C.ink, fg: C.paper, size: 40 })}</div>` +
          p(`${esc(c.availability[0])}<br>${esc(c.availability[1])}`, { size: 28, color: C.paper, mt: 34 }) +
          p(`<span class="mono">memsum.app</span> · ${esc(c.perks)}`, { size: 24, color: 'rgba(242,243,240,.75)', mt: 18 }),
        340,
      ),
  };
}

// ── 스토리 1080x1920 ────────────────────────────────────────────────────────
function story(lang, n) {
  const c = COPY[lang];
  const ko = lang === 'ko';
  const pad = 96;
  const css = `.stage{--pad:${pad}px}`;
  const textCol = (inner, y = 340) => col({ x: pad, y, w: 1080 - pad * 2 }, inner);
  if (n === 1) {
    return {
      bg: C.cobalt,
      css,
      body:
        topbar({ y: 270, color: C.paper }) +
        textCol(h(c.tagline, { size: ko ? 112 : 100, color: C.paper, dark: true })) +
        clipCard(lang, 'wedding', { x: 110, y: 760, w: 860, h: 640, rot: -2.5, marks: [1, 1, 1, 0.45], scan: 0.78, corner: C.paper, cw: 7, cl: 72, co: 26 }) +
        `<div class="cap" style="top:1480px;font-size:32px;font-weight:600;color:${C.paper}">${esc(c.features)}</div>`,
    };
  }
  if (n === 2) {
    // 6가지 분류: 주제 칩 6개(영수증 선택) + 그 주제로 모인 캡처. why 칩 순서: 랜딩·스토어 등록정보의 분류 나열 순서.
    const chips = c.cats
      .map((name, i) => {
        const on = i === 2;
        return (
          `<div style="display:flex;align-items:center;justify-content:center;height:112px;border-radius:999px;font-weight:700;font-size:${ko ? 44 : 42}px;letter-spacing:-.02em;` +
          (on ? `background:${C.cobalt};color:${C.paper}` : `border:3px solid ${C.ruleStrong};color:${C.ink}`) +
          `">${esc(name)}</div>`
        );
      })
      .join('');
    return {
      bg: C.paper,
      css,
      body:
        topbar({ y: 270 }) +
        textCol(h(c.sort, { size: ko ? 112 : 100 })) +
        col({ x: pad, y: 700, w: 1080 - pad * 2 }, `<div style="width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:20px">${chips}</div>`) +
        clipCard(lang, 'receipt', { x: 180, y: 1000, w: 720, h: 540, rot: -2, marks: [1, 0, 0, 0], corner: C.ink, cw: 6, cl: 64, co: 22 }),
    };
  }
  // 3: 일요일 5줄 + 받기
  return {
    bg: C.ink,
    css,
    body:
      topbar({ y: 270, color: C.paper }) +
      textCol(h(c.hero, { size: ko ? 96 : 86, color: C.paper, dark: true })) +
      phone(rawShot(lang, '05-report'), { x: 200, y: 730, w: 680, h: 560, corner: C.paper, r: 30, cl: 56, cw: 6, co: 22 }) +
      col(
        { x: pad, y: 1360, w: 1080 - pad * 2 },
        ctaPill(c, { bg: C.cobalt, fg: C.paper, size: 44, pad: '32px 50px' }) +
          p(esc(c.availability.join(' ')), { size: 30, color: '#9EA2AC', mt: 30 }),
      ),
  };
}

function stepVisual(lang, c, i) {
  if (i === 0) {
    const ks = ['coupon', 'dinner', 'wedding'];
    return ks
      .map((k, j) =>
        shotHtml(SHOTS[lang][k], {
          u: 0.34,
          style: `left:${30 + j * 70}px;top:${j * 10}px;transform:rotate(${[-10, 4, 12][j]}deg);box-shadow:0 0 0 1px rgba(13,14,18,.14),0 14px 30px -14px rgba(13,14,18,.5)`,
        }),
      )
      .join('');
  }
  if (i === 1) {
    return clipCard(lang, 'wedding', { x: 10, y: 20, w: 290, h: 190, rot: -3, marks: [1, 1, 1, 1], corner: C.ink, cw: 4, cl: 30, co: 12 });
  }
  const r = c.cal.rows[1];
  return (
    `<div style="position:absolute;left:10px;top:20px;width:290px;border-top:2px solid ${C.ruleStrong};padding-top:18px">` +
    `<div class="mono" style="font-size:22px;color:${C.ink2}">${esc(r.mon)} ${esc(r.day)} · 12:30</div>` +
    `<div style="margin-top:8px;font-weight:700;font-size:28px;line-height:1.25">${esc(r.title)}</div>` +
    `<div style="margin-top:14px;display:flex;align-items:center;gap:10px;font-weight:700;font-size:24px">${checkIcon(30, C.success)}<span>${esc(c.cal.added)}</span></div>` +
    `<div style="margin-top:22px;border-top:2px solid ${C.ruleStrong};padding-top:14px;display:flex;gap:16px;align-items:baseline">` +
    `<span class="mk" style="font-weight:900;font-size:40px">1</span><span style="font-weight:700;font-size:22px;line-height:1.3">${esc(c.reportRows[0].t)}</span></div></div>`
  );
}

// ── Product Hunt 갤러리 1270x760 (영어) ──────────────────────────────────────
function ph(n) {
  const c = COPY.en;
  const pad = 80;
  const css = `.stage{--pad:${pad}px}`;
  const textCol = (inner, w = 580) => col({ x: pad, y: 170, w }, inner);
  if (n === 1) {
    return {
      bg: C.cobalt,
      css,
      body:
        topbar({ y: 64, color: C.paper }) +
        textCol(
          h(c.tagline, { size: 64, color: C.paper, dark: true }) +
            p(esc(c.features), { size: 24, color: C.paper, weight: 600, mt: 30 }) +
            `<div style="margin-top:56px">${ctaPill(c, { bg: C.ink, fg: C.paper, size: 28, pad: '22px 34px' })}</div>`,
        ) +
        clipCard('en', 'wedding', { x: 720, y: 150, w: 470, h: 470, rot: -2.5, marks: [1, 1, 1, 0.45], scan: 0.44, corner: C.paper, cw: 5, cl: 48, co: 18 }),
    };
  }
  if (n === 2) {
    return {
      bg: C.paper,
      css,
      body:
        topbar({ y: 64 }) +
        textCol(h(c.scan, { size: 62 }) + p(esc(c.body.scan), { size: 26 }), 560) +
        phone(rawShot('en', '01-scan'), { x: 700, y: 70, w: 340, h: 604, rot: -3, r: 26, cl: 40, cw: 4, co: 14 }) +
        phone(rawShot('en', '03-result'), { x: 900, y: 150, w: 320, h: 569, rot: 3, r: 26, cl: 40, cw: 4, co: 14 }),
    };
  }
  if (n === 3) {
    return {
      bg: C.paper,
      css,
      body:
        topbar({ y: 64 }) +
        textCol(h(c.calendar, { size: 60 }) + p(esc(c.body.calendar), { size: 26 }), 540) +
        phone(rawShot('en', '04-calendar'), { x: 880, y: 70, w: 320, h: 620, r: 26, cl: 40, cw: 4, co: 14 }) +
        clipCard('en', 'wedding', { x: 580, y: 520, w: 280, h: 180, rot: -4, marks: [0, 1, 0, 0], corner: C.ink, cw: 4, cl: 28, co: 12 }),
    };
  }
  return {
    bg: C.ink,
    css,
    body:
      topbar({ y: 64, color: C.paper }) +
      textCol(
        h(c.report, { size: 60, color: C.paper, dark: true }) +
          p(esc(c.body.report), { size: 26, color: '#9EA2AC' }) +
          p(esc(c.availability.join(' ')), { size: 24, color: C.paper, mt: 40 }),
        600,
      ) +
      phone(rawShot('en', '05-report'), { x: 820, y: 70, w: 360, h: 640, corner: C.paper, r: 26, cl: 40, cw: 4, co: 14 }),
  };
}

// ── 프로필·헤더 ─────────────────────────────────────────────────────────────
const avatar = () => ({
  bg: C.cobalt,
  css: '',
  // 원형으로 잘려도 모서리가 남게 마크 칸을 캔버스의 88%로.
  body: `<div style="position:absolute;left:${(1080 - 950) / 2}px;top:${(1080 - 950) / 2}px">${markSvg(950)}</div>`,
});

function xHeader(lang) {
  const c = COPY[lang];
  const ko = lang === 'ko';
  // X 는 왼쪽 아래를 프로필 사진이 덮고 모바일에서 위아래가 잘린다 → 글은 가운데 높이, 그림은 오른쪽.
  const keys = ['coupon', 'recipe', 'flight'];
  const fan = keys
    .map((k, i) =>
      shotHtml(SHOTS[lang][k], {
        u: 0.5,
        style: `left:${1030 + i * 120}px;top:${60 + i * 30}px;transform:rotate(${[-8, 5, 11][i]}deg);box-shadow:0 0 0 1px rgba(13,14,18,.14),0 18px 40px -18px rgba(13,14,18,.45)`,
      }),
    )
    .join('');
  return {
    bg: C.paper,
    css: '.stage{--pad:96px}',
    body:
      fan +
      clipCard(lang, 'wedding', { x: 870, y: 120, w: 360, h: 260, rot: -3, marks: [1, 1, 1, 0.45], scan: 0.82, corner: C.ink, cw: 5, cl: 40, co: 14 }) +
      col(
        { x: 96, y: 96, w: 760 },
        p('MEMSUM · GOOGLE PLAY', { size: 22, color: C.ink2, mt: 0, cls: 'mono' }) +
          h(c.tagline, { size: ko ? 76 : 64, mt: 26 }) +
          p(esc(c.features), { size: 26, weight: 600, mt: 26 }),
      ),
  };
}

// ── 렌더 ─────────────────────────────────────────────────────────────────────
const jobs = [];
for (const lang of ['ko', 'en']) {
  const sfx = lang === 'ko' ? '' : '.en';
  if (want('feed')) for (let n = 1; n <= 5; n++) jobs.push([`feed-0${n}${sfx}.png`, FEED, FEED, feed(lang, n)]);
  if (want('story')) for (let n = 1; n <= 3; n++) jobs.push([`story-0${n}${sfx}.png`, 1080, 1920, story(lang, n)]);
  if (want('x')) jobs.push([`x-header${sfx}.png`, 1500, 500, xHeader(lang)]);
}
if (want('ph')) for (let n = 1; n <= 4; n++) jobs.push([`ph-gallery-0${n}.png`, 1270, 760, ph(n)]);
if (want('avatar')) jobs.push(['profile-avatar.png', 1080, 1080, avatar()]);

mkdirSync(OUT_DIR, { recursive: true });
const browser = await playwright().chromium.launch();
try {
  for (const [name, w, h, s] of jobs) {
    const page = await openPage(browser, doc({ w, h, bg: s.bg, css: PARTS_CSS + s.css, body: s.body }), { w, h });
    const buf = await page.screenshot({ type: 'png' });
    await page.close();
    await toRgbPng(buf, join(OUT_DIR, name));
    console.log(`✓ ${name} ${w}x${h}`);
  }
} finally {
  await browser.close();
}
