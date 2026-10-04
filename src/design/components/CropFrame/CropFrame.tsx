import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import type { SemanticColorName } from '@/design/tokens';

export type CropFrameProps = {
  /** 너비. 생략하면 부모/children 크기를 따른다. */
  width?: DimensionValue;
  /** 높이. 생략하면 부모/children 크기를 따른다. */
  height?: DimensionValue;
  /** L자 한 변 길이(px). 기본 16. */
  cornerLength?: number;
  /** 선 두께(px). 기본 2. */
  strokeWidth?: number;
  /** 모서리 색(의미 토큰). 기본 textPrimary. */
  color?: SemanticColorName;
  /** 모서리를 바깥으로 밀어내는 거리(px). 썸네일 바깥에 두를 때 사용. 기본 0. */
  outset?: number;
  style?: StyleProp<ViewStyle>;
  /** 프레임 안 내용(썸네일 등). 없으면 빈 프레임(빈 상태 장식). */
  children?: ReactNode;
};

const DEFAULT_CORNER = 16;
const DEFAULT_STROKE = 2;

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: readonly Corner[] = ['tl', 'tr', 'bl', 'br'];

/**
 * CropFrame — 스크린샷 크롭 모서리 4개(L자). 브랜드 장치.
 *
 * children을 감싸 썸네일 위에 모서리를 두르거나, children 없이 빈 프레임으로 쓴다.
 * 순수 장식이라 모서리는 스크린리더에서 숨긴다.
 */
export function CropFrame({
  width,
  height,
  cornerLength = DEFAULT_CORNER,
  strokeWidth = DEFAULT_STROKE,
  color = 'textPrimary',
  outset = 0,
  style,
  children,
}: CropFrameProps): ReactNode {
  const { colors } = useTheme();
  const stroke = colors[color];

  return (
    <View style={[{ width, height }, style]}>
      {children}
      {CORNERS.map((corner) => {
        const isTop = corner === 'tl' || corner === 'tr';
        const isLeft = corner === 'tl' || corner === 'bl';
        return (
          <View
            key={corner}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={[
              styles.corner,
              {
                width: cornerLength,
                height: cornerLength,
                borderColor: stroke,
                [isTop ? 'top' : 'bottom']: -outset,
                [isLeft ? 'left' : 'right']: -outset,
                [isTop ? 'borderTopWidth' : 'borderBottomWidth']: strokeWidth,
                [isLeft ? 'borderLeftWidth' : 'borderRightWidth']: strokeWidth,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
  },
});
