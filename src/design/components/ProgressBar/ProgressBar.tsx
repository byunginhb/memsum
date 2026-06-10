import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius } from '@/design/tokens';

/** 진행바 높이(px) — design.md §26 통계카드. */
const BAR_HEIGHT = 8;

type ProgressBarProps = {
  /** 현재 값(예: 23). */
  value: number;
  /** 최대 값(예: 30). 0 이하면 빈 바로 처리. */
  max: number;
  /** 스크린리더용 라벨(예: "23/30"). 색상 외 정보 전달(§35). */
  label?: string;
  /** 채움 색 톤. 기본 primary. */
  tone?: 'primary' | 'accent';
};

/**
 * ProgressBar — 진행 상황 막대(design.md §26).
 *
 * value/max 비율을 0~1로 클램프해 채운다. 트랙은 bgMuted, 채움은 primary/accent 토큰.
 * 색상만으로 정보를 전달하지 않도록 호출측(WeeklyStatsCard)이 숫자 텍스트를 함께 보여준다.
 */
export function ProgressBar({
  value,
  max,
  label,
  tone = 'primary',
}: ProgressBarProps): ReactNode {
  const { colors } = useTheme();

  // 0~1 클램프: 음수·초과·0 division 방어.
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const fillColor = tone === 'accent' ? colors.accent : colors.primary;

  return (
    <View
      style={{
        height: BAR_HEIGHT,
        borderRadius: radius.full,
        backgroundColor: colors.bgMuted,
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
          borderRadius: radius.full,
          backgroundColor: fillColor,
        }}
      />
    </View>
  );
}
