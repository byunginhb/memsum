import { useEffect, useRef, useState } from 'react';

import { recognizeText } from '../../modules/vision-ocr';
import { useScreenshotWatcher } from './use-screenshot-watcher';
import type { ScreenshotEvent } from './use-screenshot-watcher';

export type OcrStatus = 'pending' | 'done' | 'error';

export type OcrItem = {
  id: string;
  platform: 'ios' | 'android';
  createdAt: number; // epoch seconds
  status: OcrStatus;
  text?: string;
  error?: string;
};

// 네이티브 raw 페이로드에서 OCR source 추출.
// iOS는 assetId(PHAsset localIdentifier), Android는 uri(content:// 또는 file://).
type ScreenshotRaw = {
  assetId?: string;
  uri?: string;
};

function ocrSource(event: ScreenshotEvent): { assetId?: string; uri?: string } {
  const raw = (event.raw ?? {}) as ScreenshotRaw;
  if (event.platform === 'ios') {
    return { assetId: raw.assetId };
  }
  return { uri: raw.uri };
}

// 불변성 유지: 항상 새 배열을 만들고 일치하는 항목만 교체한다.
function replaceItem(items: OcrItem[], next: OcrItem): OcrItem[] {
  return items.map((item) => (item.id === next.id ? next : item));
}

/**
 * 스크린샷 → 온디바이스 OCR 통합 훅.
 *
 * useScreenshotWatcher의 이벤트를 구독하고, 새 스크린샷마다 recognizeText를 호출해
 * pending → done(text) / error(message) 로 상태를 갱신한다.
 * OCR은 비동기이므로 항목을 먼저 pending으로 추가한 뒤 결과로 교체한다.
 */
export function useScreenshotOcr(): { items: OcrItem[] } {
  const { events } = useScreenshotWatcher();
  const [items, setItems] = useState<OcrItem[]>([]);
  // 이미 OCR을 시작한 이벤트 id 집합. 재렌더로 중복 실행되는 것을 막는다.
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const pending = events.filter(
      (event) => event.id.length > 0 && !processedIds.current.has(event.id),
    );
    if (pending.length === 0) return;

    for (const event of pending) {
      processedIds.current.add(event.id);

      const base: OcrItem = {
        id: event.id,
        platform: event.platform,
        createdAt: event.createdAt,
        status: 'pending',
      };
      // 불변성 유지: 새 배열로 pending 항목 추가.
      setItems((prev) => [...prev, base]);

      void runOcr(event, base, setItems);
    }
  }, [events]);

  return { items };
}

// 단일 이벤트에 대한 OCR 실행. 실패해도 throw하지 않고 error 상태로 반영한다.
async function runOcr(
  event: ScreenshotEvent,
  base: OcrItem,
  setItems: React.Dispatch<React.SetStateAction<OcrItem[]>>,
): Promise<void> {
  try {
    const result = await recognizeText(ocrSource(event));
    console.log('[OCR]', { id: base.id, platform: base.platform, text: result.text });
    setItems((prev) => replaceItem(prev, { ...base, status: 'done', text: result.text }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[OCR] 실패:', { id: base.id, error: message });
    setItems((prev) => replaceItem(prev, { ...base, status: 'error', error: message }));
  }
}
