'use client';

import { useEffect, useRef, useState } from 'react';

import { CropFrame } from '@/components/brand/CropFrame';

type Props = {
  name: string;
  photoAlt: string;
  src?: string;
};

/**
 * 파운더 아바타 — 크롭 모서리 안의 정사각형.
 * /founder.png가 있으면 실제 사진, 없거나 로드 실패 시 이름 이니셜로 폴백한다
 * (가짜 사진 커밋 없이 레이아웃이 깨지지 않게).
 */
export function FounderAvatar({ name, photoAlt, src = '/founder.png' }: Props) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // 하이드레이션 전에 로드가 이미 실패했으면 onError가 불리지 않으므로 마운트 때 한 번 확인한다.
  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <CropFrame className="size-20 shrink-0 [--crop-len:12px] [--crop-out:6px] sm:size-24">
      {failed ? (
        <div
          role="img"
          aria-label={photoAlt}
          className="t-mono flex size-full items-center justify-center rounded-[6px] bg-cobalt text-[26px] text-white"
        >
          {initials}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={photoAlt}
          onError={() => setFailed(true)}
          className="size-full rounded-[6px] bg-muted object-cover"
        />
      )}
    </CropFrame>
  );
}
