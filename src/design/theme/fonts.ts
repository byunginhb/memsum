import { useSyncExternalStore } from 'react';
import { isLoaded } from 'expo-font';

import { fontFamily } from '@/design/tokens/typography';

/**
 * 앱 서체 에셋 — 루트 레이아웃의 useFonts에 그대로 넘긴다.
 * 키가 곧 RN fontFamily 이름이다(typography.ts의 fontFamily와 일치해야 한다).
 * 상대 경로를 쓰는 이유: jest moduleNameMapper가 `@/assets`를 src 아래로 잘못 풀어서.
 */
export const fontAssets = {
  [fontFamily.regular]: require('../../../assets/fonts/WantedSans-Regular.ttf'),
  [fontFamily.semibold]: require('../../../assets/fonts/WantedSans-SemiBold.ttf'),
  [fontFamily.bold]: require('../../../assets/fonts/WantedSans-Bold.ttf'),
  [fontFamily.black]: require('../../../assets/fonts/WantedSans-Black.ttf'),
  [fontFamily.mono]: require('../../../assets/fonts/JetBrainsMono-Medium.ttf'),
} as const;

const FONT_NAMES = Object.keys(fontAssets);

// 화면 렌더는 폰트 로딩을 기다리지 않는다(스플래시 동안 병렬 로드).
// 그래서 로드 완료를 구독 가능한 값으로 두어, 이미 그려진 Text도 로드 직후 다시 그리게 한다.
// 핫 리로드처럼 이미 등록된 경우는 isLoaded로 즉시 true에서 시작한다.
let ready = FONT_NAMES.every((name) => safeIsLoaded(name));
const listeners = new Set<() => void>();

function safeIsLoaded(name: string): boolean {
  try {
    return isLoaded(name);
  } catch {
    return false;
  }
}

/** 루트 레이아웃이 useFonts 결과를 알려준다. 실패면 false로 남아 시스템 폰트를 쓴다. */
export function setFontsReady(value: boolean): void {
  if (ready === value) return;
  ready = value;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return ready;
}

/** 커스텀 서체 사용 가능 여부. false면 Text는 시스템 폰트 + fontWeight로 대체한다. */
export function useFontsReady(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
