import type { ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';

/** Card 시각 변형 — design.md §15. 배경/보더/elevation이 달라진다. */
export type CardVariant = 'flat' | 'elevated' | 'outlined' | 'highlight';

/**
 * 내부 여백 단계 — design.md §15.
 * compact→spacing.md(12), normal→spacing.lg(16), spacious→spacing['2xl'](24).
 */
export type CardPadding = 'compact' | 'normal' | 'spacious';

export type CardProps = {
  variant?: CardVariant;
  /** 내부 여백 단계. 주어지면 최우선 적용된다(compact prop보다 우선). */
  padding?: CardPadding;
  /**
   * @deprecated padding="compact"를 사용하라. 하위호환을 위해 유지한다.
   * padding이 없을 때만 해석되며, true면 'compact'(12)로 동작한다.
   */
  compact?: boolean;
  /** 주어지면 Pressable로 감싸 탭 가능해진다. 없으면 비대화형 View로 렌더. */
  onPress?: () => void;
  /** onPress가 있을 때 접근성 역할 재정의. 기본 'button'. */
  accessibilityRole?: AccessibilityRole;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};
