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

/** appScreens.items 의 옛 경로 → 새 화면 키. */
export function screenKeyFromLegacySrc(src: string): ScreenKey {
  if (src.includes('report')) return 'report';
  if (src.includes('detail')) return 'result';
  return 'home';
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
