import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius } from '@/design/tokens';

/** 진행바 높이(px) — 얇은 선. */
const BAR_HEIGHT = 4;

export type ProgressBarProps = {
  /** 현재 값(예: 23). */
  value: number;
  /** 최대 값(예: 30). 0 이하면 빈 바로 처리. */
  max: number;
  /** 스크린리더용 라벨(예: "23/30"). 색만으로 정보를 전달하지 않도록. */
  label?: string;
  /** 채움 색. primary(코발트, 기본) 또는 accent(형광펜). */
  tone?: 'primary' | 'accent';
};

/**
 * ProgressBar — 진행 막대. 트랙은 rule(border) 색, 채움은 코발트/형광펜.
 * 호출측이 숫자 텍스트를 함께 보여준다.
 */
export function ProgressBar({ value, max, label, tone = 'primary' }: ProgressBarProps): ReactNode {
  const { colors } = useTheme();
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View
      style={{
        height: BAR_HEIGHT,
        borderRadius: radius.pill,
        backgroundColor: colors.border,
        overflow: 'hidden',
      }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max, now: value }}
      accessibilityLabel={label}
    >
      <View
        style={{
          width: `${ratio * 100}%`,
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: tone === 'accent' ? colors.marker : colors.primary,
        }}
      />
    </View>
  );
}
