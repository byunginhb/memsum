import type { ReactNode } from 'react';
import { Platform, Switch as RNSwitch } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';

type SwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Switch — 디자인시스템.md §32 "Material 트랙"
 *
 * RN 내장 Switch 래퍼. 동작은 플랫폼 기본을 따르고 색만 의미 토큰으로 덮는다.
 * thumb는 Android에서만 토큰을 강제(iOS는 시스템 흰색 기본이 자연스러워 미지정).
 */
export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps): ReactNode {
  const { colors } = useTheme();

  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      // iOS는 시스템 흰색 thumb가 가장 자연스러워 미지정. Android만 토큰으로 통일.
      thumbColor={Platform.OS === 'android' ? colors.bgSurface : undefined}
      ios_backgroundColor={colors.borderStrong}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
