import type { ReactNode } from 'react';

import { Badge } from '@/design/components/Badge/Badge';
import type { BadgeTone } from '@/design/components/Badge/Badge';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import type { ParcelLevel } from '@/features/parcel/types';
import { levelToStatusKey } from '@/lib/parcel';
import { t } from '@/i18n';

type ParcelStatusBadgeProps = {
  level: ParcelLevel;
};

/** level → 배지 톤·아이콘 매핑. design.md §7 상태별 명세를 따른다. */
function levelVisual(level: ParcelLevel): { tone: BadgeTone; icon: IconName } {
  if (level >= 6) return { tone: 'success', icon: 'check-circle' };
  if (level === 5) return { tone: 'accent', icon: 'truck' };
  if (level === 3 || level === 4) return { tone: 'primary', icon: 'package' };
  // level 0~2(미조회·준비·집화): 중립.
  return { tone: 'neutral', icon: 'package' };
}

/**
 * ParcelStatusBadge — level을 아이콘+색 배지로 표현(subtle 변형).
 * 문구는 levelToStatusKey로 i18n에서 가져온다(단정형 금지 카피는 i18n에 고정).
 */
export function ParcelStatusBadge({ level }: ParcelStatusBadgeProps): ReactNode {
  const { tone, icon } = levelVisual(level);
  // 아이콘 색은 배지 톤과 시각적으로 묶이도록 톤에 맞춘 의미 색을 쓴다.
  const iconColor =
    tone === 'success'
      ? 'success'
      : tone === 'accent'
        ? 'accent'
        : tone === 'primary'
          ? 'primary'
          : 'textSecondary';

  return (
    <Badge tone={tone} variant="subtle" leftIcon={<Icon name={icon} size={16} color={iconColor} />}>
      {t(levelToStatusKey(level))}
    </Badge>
  );
}
