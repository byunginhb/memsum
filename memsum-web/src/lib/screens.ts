import type { Lang } from '@/lib/landing-copy';

/**
 * 새 디자인("형광펜 & 코발트") 앱 화면 — scripts/build-screens.sh 가 만든 720x1280 webp.
 * 화면 속 글자가 이미지에 구워져 있어 언어마다 따로 둔다.
 *
 * why 별도 파일: landing-copy.ts 의 이미지 경로(shots·appScreens.src)는 옛 디자인 PNG를 가리키지만
 * 그 파일은 문구 사전이라 손대지 않는다. 대신 카피의 의미 키(home·report·detail)를 여기서 새 화면에 잇는다.
 */
export type ScreenKey = 'home' | 'report' | 'result' | 'search';

export const SCREEN_SIZE = { width: 720, height: 1280 } as const;

export function screenSrc(lang: Lang, key: ScreenKey): string {
  return `/screens/${lang}/${key}.webp`;
}


/**
 * 히어로 스캔에서 형광펜을 그을 줄 — 홈 화면 "놓치면 안 돼요" 목록의 제목 줄(원본 1080x1920 px).
 * 원본에서 잰 값: 각 줄 글자 띠의 아래끝(y1)과 좌우(x0,x1). 박스는 글자 높이 70%, 아래 정렬로 만든다.
 */
const HOME_ROWS: Record<Lang, readonly (readonly [number, number, number])[]> = {
  ko: [
    [785, 302, 738],
    [985, 304, 694],
    [1186, 302, 646],
    [1387, 304, 676],
  ],
  en: [
    [789, 304, 882],
    [991, 304, 626],
    [1192, 304, 784],
    [1393, 304, 814],
  ],
};

const RAW_W = 1080;
const RAW_H = 1920;
const BOX_H = 38;
const BOX_BELOW = 6;
const PAD_L = 10;
const PAD_R = 12;

export type ScanBox = { left: string; top: string; width: string; height: string; yFrac: number };

export function homeScanBoxes(lang: Lang): ScanBox[] {
  const pct = (v: number, base: number) => `${((v / base) * 100).toFixed(3)}%`;
  return HOME_ROWS[lang].map(([y1, x0, x1]) => {
    const top = y1 + BOX_BELOW - BOX_H;
    return {
      left: pct(x0 - PAD_L, RAW_W),
      top: pct(top, RAW_H),
      width: pct(x1 - x0 + PAD_L + PAD_R, RAW_W),
      height: pct(BOX_H, RAW_H),
      yFrac: (top + BOX_H / 2) / RAW_H,
    };
  });
}

/* ── 작동 순서 장면(HowItWorks) 기하 — 모두 720x1280 화면 px 기준(scratchpad 측정값) ───────── */

const SCR_W = 720;
const SCR_H = 1280;

/** 자료실 화면 첫 썸네일(청첩장 캡처) — 장면 ①의 "방금 찍은 스크린샷"으로 잘라 쓴다(날짜 배지 위까지). */
const CARD = { x: 33, y: 292, w: 202, h: 213 } as const;

/** 그 캡처 안 글자 줄 [위, 아래, 왼, 오른](px) — 스캔선이 지날 때 형광펜을 긋는 자리. */
const CARD_ROWS: Record<Lang, readonly (readonly [number, number, number, number])[]> = {
  ko: [
    [318, 328, 54, 125],
    [345, 352, 57, 165],
    [369, 376, 53, 141],
    [393, 399, 54, 137],
  ],
  en: [
    [319, 326, 54, 168],
    [345, 350, 53, 178],
    [369, 375, 54, 150],
    [393, 399, 57, 157],
  ],
};

const pct = (v: number) => `${v.toFixed(3)}%`;

/** 캡처 카드 안 이미지 배치(카드 박스 기준 %) — 자료실 화면 전체를 깔고 카드 영역만 보이게. */
export const SCENE_CARD_IMG = {
  width: pct((SCR_W / CARD.w) * 100),
  left: pct((-CARD.x / CARD.w) * 100),
  top: pct((-CARD.y / CARD.h) * 100),
} as const;

/** 카드 비율(가로/세로). */
export const SCENE_CARD_RATIO = `${CARD.w} / ${CARD.h}`;

export type SceneMark = { left: string; top: string; width: string; height: string; y: string };

/** 카드 안 형광펜 박스(카드 기준 %) + 스캔선이 그 줄에 닿는 카드 높이 비율(y). */
export function sceneCardMarks(lang: Lang): SceneMark[] {
  const H = 14; // 글자 높이 약 70%를 덮는 박스, 아래 정렬
  return CARD_ROWS[lang].map(([, bottom, x0, x1]) => {
    const top = bottom + 3 - H;
    return {
      left: pct(((x0 - 4 - CARD.x) / CARD.w) * 100),
      top: pct(((top - CARD.y) / CARD.h) * 100),
      width: pct(((x1 - x0 + 8) / CARD.w) * 100),
      height: pct((H / CARD.h) * 100),
      y: ((top + H / 2 - CARD.y) / CARD.h).toFixed(3),
    };
  });
}

/** 결과 시트 — 화면 위쪽은 딤 처리된 홈이고 시트는 이 높이부터 시작한다. */
const SHEET_TOP = 396;
export const SCENE_SHEET = {
  top: pct((SHEET_TOP / SCR_H) * 100),
  imgTop: pct((-SHEET_TOP / (SCR_H - SHEET_TOP)) * 100),
} as const;

/** 결과 시트에서 떨어져 나오는 일정 줄(날짜·제목·장소·확실 배지). */
const PIECE = { y: 800, h: 165 } as const;
export const SCENE_PIECE = {
  top: pct((PIECE.y / SCR_H) * 100),
  height: pct((PIECE.h / SCR_H) * 100),
  imgTop: pct((-PIECE.y / PIECE.h) * 100),
} as const;
