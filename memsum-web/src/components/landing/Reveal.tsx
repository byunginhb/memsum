'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  type CSSProperties,
  type ElementType,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';

import { useReveal } from '@/hooks/use-reveal';

type RevealVariant = 'fade-up' | 'fade' | 'scale-in' | 'blur-in';

type RevealProps = {
  as?: ElementType;
  variant?: RevealVariant;
  /** 단발 지연(ms). 스태거 인덱스 대신 직접 딜레이를 줄 때. */
  delay?: number;
  /** reveal 트리거 비율. 기본 0.15. */
  threshold?: number;
  rootMargin?: string;
  /** 부모 RevealGroup이 주입하는 스태거 인덱스. */
  index?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** id 등 추가 HTML 속성 패스스루(예: aria-labelledby 대상 id). */
  id?: string;
};

/**
 * reveal 래퍼. data-reveal/variant·data-revealed·--i 를 DOM에 주입한다.
 * 콘텐츠 자체는 SSR로 렌더되고, JS는 표시 트리거만 담당(본문은 JS 없이도 보임 —
 * reduced-motion·no-JS 환경에서는 CSS가 opacity:1 폴백을 보장).
 */
export function Reveal({
  as,
  variant = 'fade-up',
  delay,
  threshold,
  rootMargin,
  index,
  className,
  style,
  children,
  id,
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const { ref, revealed } = useReveal<HTMLElement>({ threshold, rootMargin });

  const mergedStyle: CSSProperties = {
    ...style,
    ...(index !== undefined
      ? ({ ['--i' as string]: index } as CSSProperties)
      : {}),
    ...(delay !== undefined
      ? { transitionDelay: `${delay}ms` }
      : {}),
  };

  return (
    <Tag
      ref={ref}
      id={id}
      data-reveal={variant}
      data-revealed={revealed ? 'true' : 'false'}
      className={className}
      style={mergedStyle}
    >
      {children}
    </Tag>
  );
}

type RevealGroupProps = {
  as?: ElementType;
  /** 스태거 간격(ms). 기본 80(앱 5줄 리포트 카드와 동일). */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** 그룹 컨테이너 ref(스크롤 트리거 동기화용). React 19 ref-as-prop. */
  ref?: Ref<HTMLElement>;
};

/**
 * 자식 Reveal에 순차 index를 자동 부여해 스태거를 만든다.
 * 자식은 Reveal 컴포넌트여야 index prop을 받는다.
 */
export function RevealGroup({
  as,
  stagger = 80,
  className,
  style,
  children,
  ref,
}: RevealGroupProps) {
  const Tag = (as ?? 'div') as ElementType;
  const groupStyle: CSSProperties = {
    ...style,
    ['--stagger' as string]: `${stagger}ms`,
  } as CSSProperties;

  return (
    <Tag ref={ref} className={className} style={groupStyle}>
      {Children.map(children, (child, i) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<{ index?: number }>, {
              index: i,
            })
          : child,
      )}
    </Tag>
  );
}
