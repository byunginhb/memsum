// 웹 대체 구현 — 웹(개발용 미리보기)에는 사진첩 감지가 없다.
// 네이티브 index.ts와 같은 export를 맞추고 모두 아무 일도 하지 않는다(권한은 미지원 = denied).

export type ScreenshotEvent = {
  assetId?: string;
  uri?: string;
  displayName?: string;
  createdAt: number;
};

export type PermissionStatus = 'granted' | 'limited' | 'denied' | 'undetermined';

export function addScreenshotListener(_listener: (event: ScreenshotEvent) => void): {
  remove: () => void;
} {
  return { remove: () => undefined };
}

export function startWatching(): void {}

export function stopWatching(): void {}

export function consumeAskToken(_token: string): boolean {
  return false;
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return 'denied';
}

export async function requestPermission(): Promise<PermissionStatus> {
  return 'denied';
}

export function checkNow(): void {}

export function markHandled(_mediaId: number): void {}

export default {};
