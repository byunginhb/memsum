'use client';

import { useState } from 'react';

type Props = {
  name: string;
  photoAlt: string;
  src?: string;
};

/**
 * 파운더 아바타.
 * /founder.png가 존재하면 실제 사진을, 없거나 로드 실패 시 이름 이니셜로 폴백한다.
 * 가짜 사진 커밋 없이 레이아웃이 깨지지 않는 것을 보장한다.
 */
export function FounderAvatar({ name, photoAlt, src = '/founder.png' }: Props) {
  const [failed, setFailed] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (failed) {
    return (
      <div
        role="img"
        aria-label={photoAlt}
        className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-(--color-primary-soft) text-2xl font-bold text-(--color-primary) sm:h-24 sm:w-24"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={photoAlt}
      onError={() => setFailed(true)}
      className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24"
    />
  );
}
