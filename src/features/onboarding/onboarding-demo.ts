// 자동 생성 — node scripts/gen-onboarding-demo.mjs. 직접 고치지 말 것(이미지와 좌표가 어긋난다).
import type { ScanBox } from '@/design';

/** assets/images/onboarding-demo.png 크기(px). */
export const ONBOARDING_DEMO_SIZE = { width: 1080, height: 1440 } as const;

/** 데모 이미지 가로/세로 비. */
export const ONBOARDING_DEMO_RATIO = 1080 / 1440;

/** 데모 이미지 속 말풍선 글자 줄(정규화 0~1, 위→아래). 같은 서체로 잰 실제 잉크 영역. */
export const ONBOARDING_DEMO_BOXES: readonly ScanBox[] = [
  { x: 0.0757, y: 0.4007, width: 0.5357, height: 0.0389 },
  { x: 0.0743, y: 0.4482, width: 0.519, height: 0.0396 },
  { x: 0.0747, y: 0.4951, width: 0.5388, height: 0.0389 },
  { x: 0.0747, y: 0.5429, width: 0.2534, height: 0.0372 },
  { x: 0.0737, y: 0.59, width: 0.3999, height: 0.0394 },
  { x: 0.0757, y: 0.6373, width: 0.5176, height: 0.0373 },
];
