import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

/**
 * Elevation 토큰 (iOS shadow ↔ Android elevation) — 디자인시스템.md §2.5
 *
 * Platform.select로 플랫폼별 그림자 스타일을 반환한다.
 * 인라인 Platform.OS 분기 대신 이 토큰을 참조한다.
 */
export const elevation = {
  0: Platform.select<ViewStyle>({
    ios: { shadowOpacity: 0 },
    android: { elevation: 0 },
    default: {},
  }),
  1: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  2: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }),
  3: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
  4: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
  5: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
    },
    android: { elevation: 16 },
    default: {},
  }),
} as const satisfies Record<number, ViewStyle>;

export type ElevationToken = keyof typeof elevation;
