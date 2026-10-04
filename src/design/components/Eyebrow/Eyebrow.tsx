import type { ReactNode } from 'react';

import { Text } from '@/design/components/Text/Text';
import type { TextProps } from '@/design/components/Text/Text';

export type EyebrowProps = Omit<TextProps, 'variant'> & {
  /** mono 12 대신 mono 15(monoLg)를 쓸 때. */
  large?: boolean;
};

/**
 * Eyebrow(머리표) — 섹션 라벨 통일 장치. 예: `10월 1주 · 38장`, `09:41 · 택배`.
 *
 * mono + textSecondary. 한글 구간은 Text가 Wanted Sans로 자동 전환한다.
 * 회색 작은 한글 라벨 반복 대신 이것으로 섹션을 연다.
 */
export function Eyebrow({
  large = false,
  color = 'textSecondary',
  numberOfLines = 1,
  ...rest
}: EyebrowProps): ReactNode {
  return (
    <Text
      variant={large ? 'monoLg' : 'mono'}
      color={color}
      numberOfLines={numberOfLines}
      {...rest}
    />
  );
}
