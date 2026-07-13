import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Android READ_MEDIA_IMAGES 런타임 권한을 요청한다.
 * 이미 허용돼 있으면 즉시 true를 반환(팝업 없음).
 * iOS는 네이티브 모듈이 PHPhotoLibrary 권한을 자동 요청하므로 이 함수는 Android 전용.
 * 거부돼도 앱은 계속 동작한다(수동 사진 선택기 경로는 사용 가능).
 *
 * 온보딩 권한 스텝과 use-auto-capture가 이 함수를 공유해 중복 팝업을 방지한다.
 */
export async function requestAndroidMediaPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  try {
    const permission = PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission);
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    console.error('[permissions] 미디어 권한 요청 실패:', error);
    return false;
  }
}
