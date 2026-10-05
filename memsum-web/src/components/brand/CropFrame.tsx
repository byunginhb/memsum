import type { CSSProperties, ElementType, ReactNode } from 'react';

type CropFrameProps = {
  children?: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/**
 * 크롭 모서리 4개(L자) — 스크린샷 썸네일·빈 프레임에 두르는 브랜드 장치.
 * 모서리 길이·두께·바깥 거리·색은 CSS 변수(--crop-len/--crop-w/--crop-out/--crop-color)로 조절한다.
 */
export function CropFrame({ children, as, className, style }: CropFrameProps) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag className={`crop ${className ?? ''}`} style={style}>
      {children}
      <span aria-hidden="true" className="crop-c crop-tl" />
      <span aria-hidden="true" className="crop-c crop-tr" />
      <span aria-hidden="true" className="crop-c crop-bl" />
      <span aria-hidden="true" className="crop-c crop-br" />
    </Tag>
  );
}
