import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import type { ParcelLevel } from '@/features/parcel/types';

type ParcelProgressProps = {
  /** 현재 진행 단계(1~6). 0(미조회)이면 모든 dot 미완 상태. */
  level: ParcelLevel;
};

/** 배송 단계 수(준비·집화·배송중·지점·출발·완료). */
const STEP_COUNT = 6;
const STEPS = [1, 2, 3, 4, 5, 6] as const;

/** dot 직경 — 현재 단계는 약간 더 크게 강조. */
const DOT_SIZE = 10;
const CURRENT_DOT_SIZE = 14;

/**
 * ParcelProgress — 1~6 진행 dot + 연결선.
 * 완료 구간은 primary(완료=level6은 success), 미완 구간은 gray300.
 * 색맹 대응: 현재 단계 dot을 크게 그려 색에만 의존하지 않는 단서를 준다.
 */
export function ParcelProgress({ level }: ParcelProgressProps): ReactNode {
  const { colors } = useTheme();
  // 완료(level6)는 전 구간을 success로, 그 외 도달 구간은 primary로 채운다.
  const reachedColor = level >= STEP_COUNT ? colors.success : colors.primary;

  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {STEPS.map((step, index) => {
        const reached = level >= step;
        const isCurrent = level === step;
        const dotColor = reached ? reachedColor : colors.borderStrong;
        const size = isCurrent ? CURRENT_DOT_SIZE : DOT_SIZE;
        return (
          <View key={step} style={styles.segment}>
            <View
              style={[
                styles.dot,
                {
                  width: size,
                  height: size,
                  borderRadius: radius.full,
                  backgroundColor: dotColor,
                },
              ]}
            />
            {/* 마지막 dot 뒤에는 선을 그리지 않는다. */}
            {index < STEP_COUNT - 1 ? (
              <View
                style={[
                  styles.line,
                  { backgroundColor: level > step ? reachedColor : colors.border },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dot: {
    // 크기·색은 인라인(상태 의존).
  },
  line: {
    flex: 1,
    height: 2,
    marginHorizontal: spacing.xs,
    borderRadius: radius.full,
  },
});
