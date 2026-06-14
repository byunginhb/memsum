'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 여러 섹션 중 뷰포트 가운데 라인을 통과한 활성 인덱스를 추적한다.
 * Features 스티키 핀에서 좌측 폰 목업 강조를 동기화할 때 사용.
 */
export function useActiveSection(count: number): {
  setRef: (index: number) => (node: HTMLElement | null) => void;
  active: number;
} {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLElement | null)[]>([]);

  const setRef = (index: number) => (node: HTMLElement | null) => {
    refs.current[index] = node;
  };

  useEffect(() => {
    const nodes = refs.current.filter(Boolean) as HTMLElement[];
    if (nodes.length === 0 || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = refs.current.indexOf(entry.target as HTMLElement);
            if (idx >= 0) setActive(idx);
          }
        }
      },
      // 가운데 라인 근처(상하 45%)를 통과할 때만 활성.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [count]);

  return { setRef, active };
}
