import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { CaptureCard } from '@/features/captures/CaptureCard';
import { spacing } from '@/design/tokens';

import type { CaptureListItem } from '@/features/captures/types';

/** 기본 열 수(홈 최근 캡처 그리드) — design.md §26. */
const DEFAULT_COLUMNS = 3;

/** 셀 사이 가로/세로 간격 — spacing.md(12). */
const GAP = spacing.md;

type RecentCapturesGridProps = {
  /** 표시할 캡처 항목들. 빈 배열이면 null(상위가 EmptyState 처리). */
  items: CaptureListItem[];
  /** 항목 탭 시 상세 라우팅(상위에 위임). */
  onPressItem: (id: string) => void;
  /** 열 수. 기본 3. */
  columns?: number;
};

/**
 * RecentCapturesGrid — 홈 "최근 캡처" N열 그리드(기본 3열, design.md §26).
 *
 * 정확히 columns개가 한 줄에 들어가도록 onLayout으로 컨테이너 폭을 측정한 뒤
 * 셀 폭 = (폭 - gap*(열-1)) / 열 로 계산해 고정 px 폭을 준다.
 * (flexBasis %는 gap과 합쳐져 100%를 넘어 줄넘침하므로 측정 방식을 쓴다.)
 * CaptureCard는 폭 100%를 차지하므로 셀 View가 카드 폭을 결정한다.
 * 빈 배열이면 null(빈 상태 UI는 상위 화면 책임).
 */
export function RecentCapturesGrid({
  items,
  onPressItem,
  columns = DEFAULT_COLUMNS,
}: RecentCapturesGridProps): ReactNode {
  // 컨테이너 측정 폭. 0이면 아직 레이아웃 전(첫 프레임에만 빈 채로 둔다).
  const [width, setWidth] = useState(0);

  if (items.length === 0) return null;

  const safeColumns = columns >= 1 ? columns : 1;
  // 측정 전(width=0)에는 셀을 그리지 않아 잘못된 폭으로 깜빡이지 않게 한다.
  // floor로 1px 미만 여유를 둬, 셀 합+gap이 컨테이너 폭과 같아질 때 반올림 오차로
  // 마지막 열이 줄바꿈되는 것을 막는다(정확히 columns개가 한 줄에 들어가게).
  const cellWidth =
    width > 0
      ? Math.floor((width - GAP * (safeColumns - 1)) / safeColumns)
      : undefined;

  const handleLayout = (event: LayoutChangeEvent): void => {
    const next = event.nativeEvent.layout.width;
    // 같은 값 재설정으로 인한 불필요 렌더 방지.
    setWidth((prev) => (prev === next ? prev : next));
  };

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {cellWidth
        ? items.map((item) => (
            <View key={item.id} style={{ width: cellWidth }}>
              <CaptureCard item={item} onPress={onPressItem} />
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
