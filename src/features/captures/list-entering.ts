import { Platform } from 'react-native';
import { FadeInUp, ReduceMotion } from 'react-native-reanimated';

import { motion, staggerDelay } from '@/design/tokens';

/**
 * 목록 첫 진입 등장(명세 §5 공통 규칙): 아래→위 8px + 페이드, 40ms 간격, 앞 6개까지만.
 *
 * 그 뒤 항목(스크롤로 새로 마운트되는 셀 포함)은 연출 없이 바로 그린다 — 스크롤 중
 * 셀이 하나씩 떠오르면 시선이 흔들린다. reduced: useReducedMotion() 결과를 넘기면 끈다
 * (빌더 자체도 시스템 설정을 따르지만, 호출부의 판단과 맞춰 명시적으로 생략한다).
 */
export function listEntering(index: number, reduced: boolean): FadeInUp | undefined {
  // 웹(개발용 미리보기)에서는 entering 레이아웃 애니메이션이 셀을 position:absolute로 남겨
  // 3열 그리드 줄이 겹친다(reanimated 웹 구현 한계) — 웹은 연출 없이 그린다.
  if (Platform.OS === 'web') return undefined;
  if (reduced || index >= motion.staggerMax) return undefined;
  return FadeInUp.duration(motion.duration.slow)
    .delay(staggerDelay(index))
    .easing(motion.easing.decel)
    .withInitialValues({ opacity: 0, transform: [{ translateY: motion.enterOffset }] })
    .reduceMotion(ReduceMotion.System);
}
