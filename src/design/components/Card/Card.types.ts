import type { ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, ViewStyle } from 'react-native';

/**
 * Card 시각 변형. 그림자는 쓰지 않는다(명세 §2: 그림자는 시트·탭바·토스트만).
 * - flat(기본): 테두리 없는 면(bgSurface).
 * - outline: 바탕색 그대로 + 1px rule 테두리.
 * - elevated: 한 단계 밝은 면(bgElevated). 그림자 없음.
 * - highlight: 면 + 왼쪽 형광펜 막대(재발견 표시).
 * - outlined: @deprecated outline과 같다.
 */
export type CardVariant = 'flat' | 'outline' | 'elevated' | 'highlight' | 'outlined';

/** 내부 여백 단계. compact 12 / normal 16 / spacious 24. */
export type CardPadding = 'compact' | 'normal' | 'spacious';

export type CardProps = {
  variant?: CardVariant;
  /** 내부 여백 단계. 주어지면 최우선 적용된다(compact prop보다 우선). */
  padding?: CardPadding;
  /**
   * @deprecated padding="compact"를 사용하라. 하위호환을 위해 유지한다.
   */
  compact?: boolean;
  /** 주어지면 눌림(PressableScale) 가능. 없으면 비대화형 View. */
  onPress?: () => void;
  /** onPress가 있을 때 접근성 역할 재정의. 기본 'button'. */
  accessibilityRole?: AccessibilityRole;
  /** onPress가 있을 때 스크린리더 라벨. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
};
