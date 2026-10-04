import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { CaptureCard } from '@/features/captures/CaptureCard';
import { GRID_COLUMNS, GRID_GAP, GRID_ROW_GAP } from '@/features/captures/grid';
import type { CaptureListItem } from '@/features/captures/types';

type CaptureGridProps = {
  items: readonly CaptureListItem[];
  onPressItem: (id: string) => void;
};

/**
 * CaptureGrid — 홈 "최근 캡처" 3열 그리드.
 *
 * 타일은 자료실과 같은 CaptureCard, 간격도 같은 상수(features/captures/grid)라 두 화면이 똑같이 보인다.
 * 자료실은 무한스크롤 때문에 FlatList를 쓰고, 홈은 몇 장뿐이라 ScrollView 안에서 그냥 감싼다.
 * 폭은 onLayout으로 재서 정확히 3칸이 한 줄에 들어가게 한다(% + gap은 반올림으로 줄넘침).
 */
export function CaptureGrid({ items, onPressItem }: CaptureGridProps): ReactNode {
  const [width, setWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent): void => {
    const next = e.nativeEvent.layout.width;
    setWidth((prev) => (prev === next ? prev : next));
  };

  const cellWidth =
    width > 0 ? Math.floor((width - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS) : 0;

  return (
    <View style={styles.grid} onLayout={handleLayout}>
      {cellWidth > 0
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
    columnGap: GRID_GAP,
    rowGap: GRID_ROW_GAP,
  },
});
