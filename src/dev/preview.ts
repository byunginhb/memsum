import type { PreviewSource } from './preview-types';

/**
 * 웹 미리보기 예시 데이터 — 네이티브(iOS·Android)에서는 항상 null.
 * 예시 데이터 본체는 preview.web.ts에 있어 네이티브 번들에는 아예 들어가지 않는다.
 */
export const preview: PreviewSource | null = null;
