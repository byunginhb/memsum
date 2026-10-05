'use client';

import { useEffect } from 'react';

/**
 * 스크롤 연출 엔진 — 페이지에 하나만 둔다. 의존성 없이 CSS 변수 하나(`--p`)만 갱신한다.
 *
 * why 라이브러리 대신 직접: 필요한 건 "스크롤 위치 → 0~1 진행도 → 감속 스무딩" 뿐이고,
 * 실제 움직임(transform·opacity)은 전부 CSS calc()가 그 진행도에서 계산한다.
 * 그래서 매 프레임 쓰는 값은 요소당 숫자 하나, 레이아웃 읽기는 크기가 바뀔 때만 한다.
 *
 * 마크업 계약
 * - `data-fx="scene"`   자식 `[data-stage]` 블록들을 화면 가운데 선이 지나는 정도로 0~1(단계 균등). 지나는 중인 블록에 `data-active`.
 * - `data-fx="range"`   요소 윗변이 화면 높이의 `data-fx-start` 비율 지점 → `data-fx-end` 지점으로 갈 때 0→1.
 *                       `data-fx-from`/`data-fx-to` 로 그 값을 다른 구간에 옮겨 담을 수 있다.
 * - `data-fx="exit"`    요소가 처음 자리에서 자기 높이만큼 위로 빠져나가는 동안 0→1(히어로 시차).
 * - `data-rv`           화면에 들어오면 `data-in` 을 붙인다(한 번만). "title"이면 단어를 줄 단위로 묶어 `--l` 을 준다.
 *
 * JS가 없거나 모션 줄이기면 이 엔진은 아무것도 하지 않고, CSS 기본값(최종 상태)이 그대로 보인다.
 */

type Kind = 'scene' | 'range' | 'exit';

type Track = {
  el: HTMLElement;
  kind: Kind;
  tau: number;
  start: number;
  end: number;
  from: number;
  to: number;
  /** 문서 기준 윗변·높이(측정값). */
  top: number;
  height: number;
  stages: { el: HTMLElement; top: number; height: number }[];
  active: number;
  cur: number;
  target: number;
  written: string;
  live: boolean;
};

/** 스무딩 시간 상수(ms) — 스크롤을 바로 따라가되 끊김 없이 감속해 멈춘다. */
const DEFAULT_TAU = 110;
/** 이보다 작은 차이는 도착으로 본다(프레임 낭비 방지). */
const SETTLE = 0.0004;
/** 단계 판정 기준선(화면 높이 비율). */
const SCENE_LINE = 0.55;
/** 화면 아래쪽 이만큼은 아직 "안 들어온" 것으로 본다. */
const REVEAL_MARGIN = '0px 0px -10% 0px';
/** 한 번에 지연을 주는 최대 줄·항목 수(그 뒤는 같이 나온다). */
const MAX_STAGGER = 6;
/** 진행도가 구간 양 끝에서 이만큼 안쪽일 때만 "움직이는 중"으로 본다. */
const LIVE_EDGE = 0.001;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function docTop(el: HTMLElement): number {
  return el.getBoundingClientRect().top + window.scrollY;
}

function makeTrack(el: HTMLElement): Track {
  const d = el.dataset;
  return {
    el,
    kind: (d.fx as Kind) ?? 'range',
    tau: num(d.fxTau, DEFAULT_TAU),
    start: num(d.fxStart, 0.9),
    end: num(d.fxEnd, 0.4),
    from: num(d.fxFrom, 0),
    to: num(d.fxTo, 1),
    top: 0,
    height: 0,
    stages: [],
    active: -1,
    cur: NaN,
    target: 0,
    written: '',
    live: false,
  };
}

function measure(t: Track) {
  t.top = docTop(t.el);
  t.height = t.el.offsetHeight;
  if (t.kind === 'scene') {
    t.stages = Array.from(t.el.querySelectorAll<HTMLElement>('[data-stage]')).map((el) => ({
      el,
      top: docTop(el),
      height: el.offsetHeight,
    }));
  }
}

function computeTarget(t: Track, y: number, vh: number): number {
  if (t.kind === 'exit') return clamp01((y - (t.top - 64)) / Math.max(1, t.height));
  if (t.kind === 'range') {
    const span = (t.start - t.end) * vh;
    const raw = clamp01((t.start * vh - (t.top - y)) / Math.max(1, span));
    return t.from + (t.to - t.from) * raw;
  }
  // scene — 기준선이 지난 단계 수 + 지나는 중인 단계의 비율, 단계 수로 나눈다.
  const line = y + vh * SCENE_LINE;
  const n = t.stages.length;
  if (!n) return 0;
  let v = 0;
  let active = 0;
  t.stages.forEach((s, i) => {
    if (line >= s.top) {
      v = i + clamp01((line - s.top) / Math.max(1, s.height));
      active = i;
    }
  });
  if (active !== t.active) {
    t.stages.forEach((s, i) => {
      if (i === active) s.el.dataset.active = '';
      else delete s.el.dataset.active;
    });
    t.active = active;
  }
  return v / n;
}

/** 제목 단어들을 실제 줄바꿈 위치로 묶어 줄 번호(--l)를 준다. */
function assignLines(el: HTMLElement) {
  const words = el.querySelectorAll<HTMLElement>('.rv-w');
  let line = -1;
  let lastTop = -Infinity;
  words.forEach((w) => {
    const top = Math.round(w.getBoundingClientRect().top);
    if (top > lastTop + 4) {
      line += 1;
      lastTop = top;
    }
    w.style.setProperty('--l', String(Math.min(line, MAX_STAGGER)));
  });
}

function assignStagger(el: HTMLElement) {
  const items = el.dataset.rv === 'rows' ? el.querySelectorAll<HTMLElement>('tbody tr') : el.children;
  Array.from(items).forEach((child, i) => {
    (child as HTMLElement).style.setProperty('--i', String(Math.min(i, MAX_STAGGER)));
  });
}

export function ScrollFx() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;

    // ── 등장(한 번) ───────────────────────────────
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>('[data-rv]'));
    const vh0 = window.innerHeight;
    revealEls.forEach((el) => {
      if (el.dataset.rv === 'title') assignLines(el);
      else if (el.dataset.rv === 'stagger' || el.dataset.rv === 'rows') assignStagger(el);
      // 이미 화면에 보이던 것(새로고침 위치 복원 등)은 연출 없이 그대로 둔다 — 깜빡임 방지.
      const r = el.getBoundingClientRect();
      if (r.top < vh0 * 0.9 && r.bottom > 0) el.dataset.in = 'instant';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          el.dataset.in = '';
          io.unobserve(el);
        });
      },
      { rootMargin: REVEAL_MARGIN },
    );
    revealEls.forEach((el) => {
      if (el.dataset.in === undefined) io.observe(el);
    });
    // 'instant' 는 첫 페인트에서 전환을 끄기 위한 표시일 뿐 — 곧 일반 상태로 돌려 호버 전환 등을 살린다.
    const instantTimer = window.setTimeout(() => {
      revealEls.forEach((el) => {
        if (el.dataset.in === 'instant') el.dataset.in = '';
      });
    }, 400);

    // ── 스크롤 연동 ───────────────────────────────
    const tracks = Array.from(document.querySelectorAll<HTMLElement>('[data-fx]')).map(makeTrack);
    let vh = window.innerHeight;
    let raf = 0;
    let last = 0;

    const remeasure = () => {
      vh = window.innerHeight;
      tracks.forEach(measure);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;
      const y = window.scrollY;
      let moving = false;
      tracks.forEach((t) => {
        if (!t.height) return; // display:none(다른 화면 크기용 사본)
        t.target = computeTarget(t, y, vh);
        if (Number.isNaN(t.cur)) t.cur = t.target; // 첫 프레임은 바로 그 자리로(로드 시 튀지 않게)
        else t.cur += (t.target - t.cur) * (1 - Math.exp(-dt / t.tau));
        if (Math.abs(t.target - t.cur) < SETTLE) t.cur = t.target;
        else moving = true;
        const s = t.cur.toFixed(4);
        if (s !== t.written) {
          t.el.style.setProperty('--p', s);
          t.written = s;
        }
        // 구간 한가운데 있을 때만 합성 레이어 힌트(data-live) — will-change 를 상시 걸지 않기 위함.
        const lo = Math.min(t.from, t.to);
        const hi = Math.max(t.from, t.to);
        const live = t.cur > lo + LIVE_EDGE && t.cur < hi - LIVE_EDGE;
        if (live !== t.live) {
          if (live) t.el.dataset.live = '';
          else delete t.el.dataset.live;
          t.live = live;
        }
      });
      if (moving) raf = requestAnimationFrame(frame);
      else last = 0;
    };

    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    remeasure();
    root.classList.add('fx');
    // fx 클래스로 레이아웃(고정 장면)이 바뀌므로 한 번 더 잰다.
    remeasure();
    kick();

    // 글꼴·이미지 로딩, 화면 회전 등으로 높이가 바뀌면 다시 잰다.
    let measureRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(measureRaf);
      measureRaf = requestAnimationFrame(() => {
        remeasure();
        kick();
      });
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize);

    return () => {
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(instantTimer);
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
      cancelAnimationFrame(measureRaf);
      root.classList.remove('fx');
    };
  }, []);

  return null;
}
