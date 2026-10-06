// scripts/marketing/parts.mjs — 정지 이미지·릴스가 같이 쓰는 장면 조각(HTML 문자열).

import { C, SHOTS, crop, esc, marked, shotHtml } from './lib/kit.mjs';

export const PARTS_CSS = `
.top{position:absolute;left:var(--pad);right:var(--pad);display:flex;justify-content:space-between;font-size:24px}
.cap{position:absolute;left:var(--pad);right:var(--pad)}
.clip{position:absolute;border-radius:22px;overflow:visible}
.clip .win{position:absolute;inset:0;overflow:hidden;border-radius:inherit}
.clip .shot{left:0;top:0;border-radius:0;box-shadow:none}
.clip .scan{position:absolute;left:0;right:0;top:0;border-top:5px solid ${C.cobalt};
  background:linear-gradient(to bottom,rgba(21,48,255,.18),rgba(21,48,255,0))}
.col{position:absolute;display:flex;flex-direction:column;align-items:flex-start}
.col > *{max-width:100%}
.cal{position:absolute;background:${C.paper}}
.cal .row{display:grid;grid-template-columns:var(--dc,170px) 1fr;column-gap:20px;padding:34px 0;border-top:2px solid ${C.rule}}
.cal .mon,.cal .dow{font-size:var(--fs2,30px);color:${C.ink2};font-family:JBM,WS,monospace}
.cal .day{font-family:JBM,monospace;font-weight:500;font-size:var(--fsd,92px);line-height:1.05;letter-spacing:-.02em}
.cal .tt{font-weight:700;font-size:var(--fs1,46px);letter-spacing:-.02em;line-height:1.2}
.cal .mt{margin-top:10px;font-family:JBM,WS,monospace;font-size:var(--fs2,30px);color:${C.ink2}}
.cal .btn{margin-top:26px;display:inline-flex;align-items:center;gap:16px;padding:22px 34px;border-radius:24px;
  background:${C.primaryMuted};color:${C.cobalt};font-weight:700;font-size:var(--fs3,36px)}
.cal .ok{margin-top:26px;display:inline-flex;align-items:center;gap:14px;font-weight:700;font-size:var(--fs3,36px);padding:22px 0}
.rep .r{display:grid;grid-template-columns:var(--nw,96px) 1fr;column-gap:26px;align-items:start;padding:var(--rp,24px) 0;border-top:2px solid var(--rl)}
.rep .n{font-weight:900;font-size:var(--nf,76px);line-height:.92;letter-spacing:-.04em;justify-self:start;position:relative}
.rep .n.one{color:${C.ink};z-index:0}
.rep .n.one::before{content:'';position:absolute;z-index:-1;left:-10px;right:-14px;top:6%;bottom:-4%;background:${C.marker};
  transform-origin:left center;transform:rotate(-1.5deg) scaleX(var(--m,1))}
.rep .t{font-weight:700;font-size:var(--tf,36px);letter-spacing:-.02em;line-height:1.25}
.rep .s{margin-top:6px;font-size:var(--sf,26px);line-height:1.35;color:var(--sc)}
.pill{display:inline-flex;align-items:center;gap:22px;border-radius:999px;font-weight:700;white-space:nowrap}
.pill .k{font-family:JBM,monospace;font-weight:500;font-size:.56em;letter-spacing:.06em;opacity:.8}
`;

/** 머리 줄: 왼쪽 MEMSUM, 오른쪽 순번(캐러셀 실제 순서). */
export const topbar = ({ y = 72, color = C.ink, right = '' } = {}) =>
  `<div class="top mono" style="top:${y}px;color:${color}"><span>MEMSUM</span><span>${esc(right)}</span></div>`;

/** 흐름 배치 열 — 헤드라인이 몇 줄로 접혀도 아래 요소가 밀려 내려간다. */
export const col = ({ x, y, w }, inner) => `<div class="col" style="left:${x}px;top:${y}px;width:${w}px">${inner}</div>`;
/** 흐름용 헤드라인. dark=true 면 형광펜을 글자 높이 전체로. */
export const h = (lines, { size, color = C.ink, dark = false, line = 1.12, mt = 0 }) =>
  `<div class="disp${dark ? ' dark' : ''}" style="font-size:${size}px;line-height:${line};color:${color};margin-top:${mt}px">` +
  lines.map((l) => `<div>${marked(l)}</div>`).join('') +
  `</div>`;
export const p = (text, { size = 30, color = C.ink2, mt = 24, weight = 400, line = 1.5, cls = '' } = {}) =>
  `<div class="${cls}" style="font-size:${size}px;line-height:${line};color:${color};margin-top:${mt}px;font-weight:${weight}">${text}</div>`;

/** 두 줄 헤드라인(형광펜 구절 하나). */
export const headline = (lines, { y, size, color = C.ink, line = 1.12, id = '', extra = '' }) =>
  `<div class="cap disp"${id ? ` id="${id}"` : ''} style="top:${y}px;font-size:${size}px;line-height:${line};color:${color};${extra}">` +
  lines.map((l) => `<div>${marked(l)}</div>`).join('') +
  `</div>`;

/**
 * 스크린샷 한 장을 위쪽만 잘라 보여 주는 카드 + 크롭 모서리(웹 장면 sf-card 와 같은 연출).
 * marks: 줄별 형광펜 진행도, scan: 스캔선 위치(0~1, 카드 높이 기준) — null 이면 숨김.
 */
export function clipCard(lang, key, { x, y, w, h, rot = 0, marks = [], scan = null, corner = C.ink, cw = 5, cl = 56, co = 18, id = '' }) {
  const spec = SHOTS[lang][key];
  const u = w / 390;
  return (
    `<div class="clip"${id ? ` id="${id}"` : ''} style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);background:${spec.bg}">` +
    `<div class="win">${shotHtml(spec, { u, marks, id: id ? `${id}-shot` : '' })}${
      scan == null ? '' : `<div class="scan" ${id ? `id="${id}-scan"` : ''} style="opacity:1;height:${Math.round(h * 0.18)}px;transform:translateY(${Math.round(scan * h)}px);border-top-width:${Math.max(4, Math.round(5 * u))}px"></div>`
    }</div>` +
    crop({ color: corner, len: cl, w: cw, out: co }) +
    `</div>`
  );
}

const calIcon = (size, color) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>`;
export const checkIcon = (size, color) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M7.8 12.3l2.8 2.8 5.6-5.8"/></svg>`;

/** 캘린더 화면 행(앱 캘린더 탭과 같은 구성). states: 행별 'add' | 'added'. */
export function calendarRows(copy, { x, y, w, states = [], vars = '', id = 'cal', only } = {}) {
  const rows = copy.cal.rows
    .map((r, i) => ({ r, i }))
    .filter(({ i }) => (only ? only.includes(i) : true))
    .map(({ r, i }) => {
      const st = states[i] ?? r.state;
      const action =
        st === 'added'
          ? `<div class="ok" id="${id}-ok${i}">${checkIcon(44, C.success)}<span>${esc(copy.cal.added)}</span></div>`
          : `<div class="btn" id="${id}-btn${i}">${calIcon(40, C.cobalt)}<span>${esc(copy.cal.add)}</span></div>`;
      return (
        `<div class="row" id="${id}-r${i}"><div><div class="mon">${esc(r.mon)}</div><div class="day">${esc(r.day)}</div><div class="dow">${esc(r.dow)}</div></div>` +
        `<div><div class="tt">${esc(r.title)}</div><div class="mt">${esc(r.meta)}</div>${action}</div></div>`
      );
    })
    .join('');
  return `<div class="cal" id="${id}" style="left:${x}px;top:${y}px;width:${w}px;${vars}">${rows}</div>`;
}

/** 5줄 리포트 목록. dark=true 면 잉크 바탕용 색. */
export function reportList(copy, { x, y, w, dark = false, vars = '', count = 5, withSub = true, id = 'rep' }) {
  const fg = dark ? C.paper : C.ink;
  const sub = dark ? '#9EA2AC' : C.ink2;
  const rule = dark ? 'rgba(242,243,240,0.14)' : C.rule;
  const rows = copy.reportRows
    .slice(0, count)
    .map(
      (r, i) =>
        `<div class="r" id="${id}-r${i}"><div class="n${i === 0 ? ' one' : ''}" id="${id}-n${i}">${i + 1}</div>` +
        `<div><div class="t">${esc(r.t)}</div>${withSub ? `<div class="s">${esc(r.s)}</div>` : ''}</div></div>`,
    )
    .join('');
  return `<div class="rep" id="${id}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;color:${fg};--sc:${sub};--rl:${rule};${vars}">${rows}</div>`;
}

/** 다운로드 버튼 모양(배지 대신 브랜드 알약). Google 로고는 쓰지 않는다. */
export const ctaPill = (copy, { bg = C.ink, fg = C.paper, size = 40, pad = '30px 46px', id = '' } = {}) =>
  `<div class="pill"${id ? ` id="${id}"` : ''} style="background:${bg};color:${fg};font-size:${size}px;padding:${pad}">` +
  `<svg width="${size * 0.8}" height="${size * 0.8}" viewBox="0 0 24 24" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M6.5 10.5L12 16l5.5-5.5M5 20h14"/></svg>` +
  `<span>${esc(copy.cta)}</span></div>`;

/** 원본 앱 화면 한 장(위쪽만 보이게 h 로 자를 수 있음) + 크롭 모서리. */
export const phone = (src, { x, y, w, h, rot = 0, corner = C.ink, r = 34, cl = 54, cw = 5, co = 18, shadow = true, id = '' }) =>
  `<div${id ? ` id="${id}"` : ''} style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h ?? Math.round((w * 16) / 9)}px;transform:rotate(${rot}deg)">` +
  `<div class="phone" style="inset:0;--pr:${r}px;${shadow ? '' : 'box-shadow:none'}"><img src="${src}"></div>` +
  crop({ color: corner, len: cl, w: cw, out: co }) +
  `</div>`;
