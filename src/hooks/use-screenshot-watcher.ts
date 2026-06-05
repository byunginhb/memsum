import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  addScreenshotListener,
  type ScreenshotEvent as NativeScreenshotEvent,
} from '../../modules/photo-library-watcher';

export type ScreenshotEvent = {
  id: string;
  createdAt: number; // epoch seconds
  platform: 'ios' | 'android';
  raw?: unknown;
};

// 네이티브 페이로드(iOS: assetId, Android: uri)를 공유 ScreenshotEvent 형태로 매핑한다.
function toScreenshotEvent(payload: NativeScreenshotEvent): ScreenshotEvent {
  const id = payload.assetId ?? payload.uri ?? '';
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  return {
    id,
    createdAt: payload.createdAt,
    platform,
    raw: payload,
  };
}

/**
 * 스크린샷 감지 구독 훅.
 *
 * 마운트 시 네이티브 onScreenshot 이벤트를 구독하고, 언마운트 시 해제한다.
 * 권한 요청은 네이티브 모듈의 OnCreate에서 수행되므로 여기서는 구독만 담당한다.
 * 반환 형태 `{ events: ScreenshotEvent[] }`와 export 타입은 공유 계약으로 유지한다.
 */
export function useScreenshotWatcher(): { events: ScreenshotEvent[] } {
  const [events, setEvents] = useState<ScreenshotEvent[]>([]);

  useEffect(() => {
    const subscription = addScreenshotListener((payload) => {
      const event = toScreenshotEvent(payload);
      console.log('[Screenshot]', event);
      // 불변성 유지: 항상 새 배열 생성.
      setEvents((prev) => [...prev, event]);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return { events };
}
