import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

export type HapticLevel = 'light' | 'medium' | 'heavy';

/** iOS impact 스타일 매핑. 인라인 분기 대신 lookup으로 추상화. */
const IOS_IMPACT_STYLE: Record<HapticLevel, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

/** Android 진동 길이(ms) 매핑 — 디자인시스템.md §4. */
const ANDROID_VIBRATION_MS: Record<HapticLevel, number> = {
  light: 8,
  medium: 16,
  heavy: 32,
};

/**
 * 플랫폼 햅틱 헬퍼 — 디자인시스템.md §4
 * iOS: Taptic Engine(expo-haptics) / Android: Vibration.
 * 햅틱 실패는 UX에 치명적이지 않으므로 조용히 무시한다.
 */
export async function haptic(level: HapticLevel): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(IOS_IMPACT_STYLE[level]);
    } else if (Platform.OS === 'android') {
      Vibration.vibrate(ANDROID_VIBRATION_MS[level]);
    }
  } catch {
    // 디바이스가 햅틱 미지원이거나 권한이 없을 수 있음 — 무시.
  }
}
