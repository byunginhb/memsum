import type { ReactNode } from 'react';

import { Badge } from '@/design/components/Badge/Badge';
import { Icon } from '@/design/icons/Icon';
import { t } from '@/i18n';

/** 'high' = 날짜·시간이 글자에 명확히 적혀 있음, 'low' = 상대·모호·추론이라 확인 필요. */
export type ConfidenceLevel = 'high' | 'low';

export type ConfidenceBadgeProps = {
  level: ConfidenceLevel;
};

/**
 * ConfidenceBadge — 뽑힌 일정의 확신도 표시(원격 #5).
 *
 * 형광펜은 "핵심 강조" 한 곳 전용이라 여기선 쓰지 않는다. 테두리형 subtle 배지에
 * 상태색 글자(success/warning — 둘 다 글자색 AA)를 쓰고, 색만으로 구분하지 않도록 아이콘을 함께 둔다.
 */
export function ConfidenceBadge({ level }: ConfidenceBadgeProps): ReactNode {
  const high = level === 'high';
  return (
    <Badge
      tone={high ? 'success' : 'warning'}
      variant="subtle"
      leftIcon={<Icon name={high ? 'check' : 'help-circle'} size={16} color={high ? 'success' : 'warning'} />}
    >
      {t(high ? 'confidence.badge.high' : 'confidence.badge.low')}
    </Badge>
  );
}
