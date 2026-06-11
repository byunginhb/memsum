import { NativeModule, requireNativeModule } from 'expo';

// 네이티브가 보내는 onScreenshot 이벤트 페이로드.
// iOS: { assetId, createdAt, uri? } — uri는 업로드용 임시 파일(내보내기 실패 시 없음)
// Android: { uri, displayName, createdAt }
export type ScreenshotEvent = {
  assetId?: string;
  uri?: string;
  displayName?: string;
  createdAt: number;
};

type PhotoLibraryWatcherModuleEvents = {
  onScreenshot: (event: ScreenshotEvent) => void;
};

declare class PhotoLibraryWatcherModule extends NativeModule<PhotoLibraryWatcherModuleEvents> {
  startWatching: () => void;
  checkNow: () => void;
}

const Native = requireNativeModule<PhotoLibraryWatcherModule>('PhotoLibraryWatcher');

// 스크린샷 이벤트 구독. 반환된 subscription의 remove()로 해제한다.
export function addScreenshotListener(listener: (event: ScreenshotEvent) => void) {
  return Native.addListener('onScreenshot', listener);
}

/**
 * 라이브 감지 시작 — JS 리스너 등록 직후 호출한다(멱등).
 * 옵저버를 JS 준비 후에 등록해, 리스너 없는 이벤트가 "본 것"으로 마킹되며
 * 유실되는 것을 막는다(부트 윈도우 스크린샷은 checkNow가 회수).
 */
export function startWatching(): void {
  try {
    Native.startWatching();
  } catch (error) {
    console.warn('[photo-library-watcher] startWatching 미지원/실패:', error);
  }
}

/**
 * 캐치업 트리거 — 구독 직후·포그라운드 복귀 시 호출해, 리스너가 없던 동안
 * (JS 로딩 중·백그라운드 동결/서스펜드 중) 생긴 스크린샷을 회수한다.
 * 네이티브가 기준점(모듈 생성 시점) 이후의 미발화 항목만 onScreenshot으로 보낸다.
 * 구버전 네이티브(함수 없음)에서도 앱이 죽지 않도록 방어한다.
 */
export function checkNow(): void {
  try {
    Native.checkNow();
  } catch (error) {
    console.warn('[photo-library-watcher] checkNow 미지원/실패:', error);
  }
}

export default Native;
