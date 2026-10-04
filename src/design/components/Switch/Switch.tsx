import type { ReactNode } from 'react';
import { Platform, Switch as RNSwitch } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';

export type SwitchProps = {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/**
 * Switch — RN 내장 스위치 래퍼. 동작은 플랫폼 기본, 색만 토큰(켜짐 코발트, 꺼짐 ruleStrong).
 * iOS thumb는 시스템 흰색이 자연스러워 두고, Android·웹 thumb만 토큰으로 맞춘다.
 */
export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps): ReactNode {
  const { colors } = useTheme();
  // react-native-web은 켜짐 thumb 기본색이 청록(#009688)이라 웹 전용 prop으로 맞춘다.
  const webThumb = Platform.OS === 'web' ? ({ activeThumbColor: colors.bgElevated } as object) : null;

  return (
    <RNSwitch
      {...webThumb}
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      thumbColor={Platform.OS === 'ios' ? undefined : colors.bgElevated}
      ios_backgroundColor={colors.borderStrong}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
    />
  );
}
