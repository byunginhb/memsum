import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing } from '@/design/tokens';
import type { ParcelCarrier } from '@/features/parcel/types';

type CarrierRadioListProps = {
  carriers: readonly ParcelCarrier[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
  /** 그룹 스크린리더 라벨. */
  label: string;
};

/** 행 높이 — 최소 터치 44보다 넉넉하게. */
const ROW_MIN_HEIGHT = 52;
/** 라디오 바깥 원·안쪽 점 지름. */
const RADIO_SIZE = 20;
const RADIO_DOT = 10;
const RADIO_STROKE = 2;
/** 행 전체가 눌리므로 버튼보다 약한 눌림 배율. */
const ROW_PRESS_SCALE = 0.985;

/**
 * 택배사 단일 선택 목록 — 카드 테두리 대신 머리카락 구분선 행 + 오른쪽 라디오.
 * 선택은 라디오 안쪽 점(채움)으로 보여 색에만 의존하지 않는다.
 * 수동 입력 시트와 택배사 선택 시트가 같은 모양을 쓴다.
 */
export function CarrierRadioList({
  carriers,
  selectedCode,
  onSelect,
  label,
}: CarrierRadioListProps): ReactNode {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label}>
      {carriers.map((carrier, index) => {
        const isSelected = carrier.code === selectedCode;
        return (
          <PressableScale
            key={carrier.code}
            onPress={() => onSelect(carrier.code)}
            scaleTo={ROW_PRESS_SCALE}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={carrier.name}
            style={[
              styles.row,
              index > 0
                ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }
                : null,
            ]}
          >
            <Text variant={isSelected ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.label}>
              {carrier.name}
            </Text>
            <View
              style={[
                styles.radio,
                { borderColor: isSelected ? colors.primary : colors.borderStrong },
              ]}
            >
              {isSelected ? (
                <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
              ) : null}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_MIN_HEIGHT,
    gap: spacing.md,
  },
  label: {
    flex: 1,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    borderRadius: radius.pill,
    borderWidth: RADIO_STROKE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: RADIO_DOT,
    height: RADIO_DOT,
    borderRadius: radius.pill,
  },
});
