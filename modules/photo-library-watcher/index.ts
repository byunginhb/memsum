import { NativeModule, requireNativeModule } from 'expo';

// 네이티브가 보내는 onScreenshot 이벤트 페이로드.
// iOS: { assetId, createdAt }, Android: { uri, displayName, createdAt }
export type ScreenshotEvent = {
  assetId?: string;
  uri?: string;
  displayName?: string;
  createdAt: number;
};

type PhotoLibraryWatcherModuleEvents = {
  onScreenshot: (event: ScreenshotEvent) => void;
};

declare class PhotoLibraryWatcherModule extends NativeModule<PhotoLibraryWatcherModuleEvents> {}

const Native = requireNativeModule<PhotoLibraryWatcherModule>('PhotoLibraryWatcher');

// 스크린샷 이벤트 구독. 반환된 subscription의 remove()로 해제한다.
export function addScreenshotListener(listener: (event: ScreenshotEvent) => void) {
  return Native.addListener('onScreenshot', listener);
}

export default Native;
