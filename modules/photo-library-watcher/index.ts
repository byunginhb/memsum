import { PermissionsAndroid, Platform } from 'react-native';
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

/**
 * 사진(스크린샷) 접근 권한 상태.
 * - limited: iOS "선택한 사진만" — 새 스크린샷은 감지되지 않을 수 있지만 거부와 구분해 안내한다.
 */
export type PermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

type PhotoLibraryWatcherModuleEvents = {
  onScreenshot: (event: ScreenshotEvent) => void;
};

declare class PhotoLibraryWatcherModule extends NativeModule<PhotoLibraryWatcherModuleEvents> {
  startWatching: () => void;
  stopWatching: () => void;
  checkNow: () => void;
  markHandled: (mediaId: number) => void;
  consumeAskToken: (token: string) => boolean;
  // iOS 전용(Android는 JS PermissionsAndroid로 처리).
  getPermissionStatus?: () => Promise<PermissionStatus>;
  requestPermission?: () => Promise<PermissionStatus>;
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
 * 감지 중지 — 설정 OFF·권한 없음일 때 호출한다(멱등).
 * Android: 옵저버 해제 + 백그라운드 잡 취소 + 질문 알림 제거(잡도 꺼짐 플래그를 확인).
 * iOS: 옵저버 해제.
 */
export function stopWatching(): void {
  try {
    Native.stopWatching();
  } catch (error) {
    console.warn('[photo-library-watcher] stopWatching 미지원/실패:', error);
  }
}

/**
 * 질문 알림 딥링크의 1회용 토큰 대조(Android). 일치하면 네이티브가 토큰을 폐기하고 true.
 * iOS·구버전 네이티브는 false(딥링크 저장 경로 없음).
 */
export function consumeAskToken(token: string): boolean {
  try {
    return Native.consumeAskToken(token) === true;
  } catch (error) {
    console.warn('[photo-library-watcher] consumeAskToken 미지원/실패:', error);
    return false;
  }
}

/**
 * Android 사진 읽기 권한 이름 — OS 버전별 분기.
 * 13(API 33)+: READ_MEDIA_IMAGES, 12 이하: READ_EXTERNAL_STORAGE(13+에선 무의미).
 */
function androidMediaPermission() {
  const ANDROID_13_API = 33;
  return Number(Platform.Version) >= ANDROID_13_API
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
}

/**
 * 현재 권한 상태 조회 — 시스템 팝업을 띄우지 않는다.
 * Android는 "아직 안 물어봄"과 "거부"를 check만으로 구분할 수 없어 미허용은 undetermined로 본다
 * (requestPermission이 거부를 확정한다).
 */
export async function getPermissionStatus(): Promise<PermissionStatus> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.check(androidMediaPermission());
      return granted ? 'granted' : 'undetermined';
    }
    return (await Native.getPermissionStatus?.()) ?? 'undetermined';
  } catch (error) {
    console.warn('[photo-library-watcher] getPermissionStatus 실패:', error);
    return 'undetermined';
  }
}

/**
 * 권한 요청 — 미결정이면 시스템 팝업을 띄운다. 온보딩/설정 등 사용자가 맥락을 이해한
 * 시점에만 명시적으로 호출한다(모듈 생성·설정 복원 시 자동 요청 금지).
 */
export async function requestPermission(): Promise<PermissionStatus> {
  try {
    if (Platform.OS === 'android') {
      const result = await PermissionsAndroid.request(androidMediaPermission());
      return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
    }
    return (await Native.requestPermission?.()) ?? 'denied';
  } catch (error) {
    console.warn('[photo-library-watcher] requestPermission 실패:', error);
    return 'denied';
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

/**
 * 외부 경로(헤드리스 [저장] 등)가 항목을 처리했음을 네이티브에 알린다.
 * 옵저버/캐치업 마커를 전진시켜 같은 항목의 재발화(중복 저장)를 막는다(Android 전용 no-op 허용).
 */
export function markHandled(mediaId: number): void {
  try {
    Native.markHandled(mediaId);
  } catch (error) {
    console.warn('[photo-library-watcher] markHandled 미지원/실패:', error);
  }
}

export default Native;
