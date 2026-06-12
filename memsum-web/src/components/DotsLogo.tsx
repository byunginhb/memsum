/**
 * 브랜드 9닷 마크 — 앱 아이콘과 동일한 모티프(라벤더 타일 + 흰 점 8 + 우하단 코랄).
 * 크기는 px 단위 size 하나로 제어한다.
 */
export function DotsLogo({ size = 40 }: { size?: number }) {
  const pad = size * 0.22;
  const gap = (size - pad * 2) / 2;
  const r = size * 0.09;
  const dots = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      cx: pad + col * gap,
      cy: pad + row * gap,
      accent: index === 8,
    };
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Memsum 로고"
    >
      <rect width={size} height={size} rx={size * 0.24} fill="#7C6FE8" />
      {dots.map((dot) => (
        <circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r={r}
          fill={dot.accent ? '#F2A65A' : '#FFFFFF'}
        />
      ))}
    </svg>
  );
}
