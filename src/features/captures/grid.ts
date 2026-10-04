import { spacing } from '@/design/tokens';

// 캡처 3열 그리드 규격 — 홈 "최근 캡처"와 자료실이 같이 쓴다(명세 §6 "홈과 동일").

/** 3열 고정. 마지막 줄이 1~2장이어도 칸 폭은 그대로. */
export const GRID_COLUMNS = 3;
/** 칸 간격 — 크롭 모서리 바깥 돌출(3px×2)이 겹치지 않는 폭. */
export const GRID_GAP = spacing.md;
/** 줄 간격 — 크롭 모서리가 위아래로 돌출하므로 넉넉히. */
export const GRID_ROW_GAP = spacing.xl;
