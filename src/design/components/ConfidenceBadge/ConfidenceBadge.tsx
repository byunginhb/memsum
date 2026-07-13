import type { ReactNode } from 'react';

import { Badge } from '@/design/components/Badge/Badge';
import { Icon } from '@/design/icons/Icon';
import { t } from '@/i18n';

type Props = {
  /** 'high' = 확실(success), 'low' = 확인 요망(warning). */
  level: 'high' | 'low';
};

/**
 * ConfidenceBadge — 이슈 #5 확신도 시각 구분.
 * Badge 래퍼. level에 따라 tone/아이콘/라벨을 결정한다.
 * high: success + check 아이콘, low: warning + help-circle 아이콘.
 * 이모지 없음, lucide 아이콘만 사용(CLAUDE.md §5).
 */
export function ConfidenceBadge({ level }: Props): ReactNode {
  if (level === 'high') {
    return (
      <Badge
        tone="success"
        variant="subtle"
        leftIcon={<Icon name="check" size={16} color="success" />}
      >
        {t('confidence.badge.high')}
      </Badge>
    );
  }

  return (
    <Badge
      tone="warning"
      variant="subtle"
      leftIcon={<Icon name="help-circle" size={16} color="warning" />}
    >
      {t('confidence.badge.low')}
    </Badge>
  );
}
