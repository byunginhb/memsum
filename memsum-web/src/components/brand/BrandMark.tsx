/**
 * 브랜드 마크 — 크롭 모서리 4개 + 가로지르는 기울어진 형광펜 막대.
 * 앱 src/design/components/BrandMark 와 같은 기하(BRAND_MARK_GEOMETRY)를 쓴다.
 * 9점 로고(DotsLogo)를 대체한다. scripts/gen-brand-assets.mjs 도 같은 값을 쓴다 — 바꾸면 함께 바꿀 것.
 */
export const BRAND_MARK_GEOMETRY = {
  tileRadius: 0.22,
  frame: 0.62,
  corner: 0.2,
  stroke: 0.065,
  barWidth: 0.5,
  barHeight: 0.15,
  barRadius: 0.12,
  barRotate: -8,
} as const;

/** 한 변이 100인 캔버스 기준 모서리 경로. */
function cornersPath(): string {
  const g = BRAND_MARK_GEOMETRY;
  const half = (100 * g.frame) / 2;
  const l = 100 * g.corner;
  const a = 50 - half;
  const b = 50 + half;
  return [
    `M ${a} ${a + l} L ${a} ${a} L ${a + l} ${a}`,
    `M ${b - l} ${a} L ${b} ${a} L ${b} ${a + l}`,
    `M ${b} ${b - l} L ${b} ${b} L ${b - l} ${b}`,
    `M ${a + l} ${b} L ${a} ${b} L ${a} ${b - l}`,
  ].join(' ');
}

type BrandMarkProps = {
  size?: number;
  /** plain: 투명 바탕 + 잉크 모서리. tile: 코발트 바탕 + 종이색 모서리(앱 아이콘 모양). */
  variant?: 'plain' | 'tile';
  /** 잉크 바탕 위에서 plain을 쓸 때 모서리를 종이색으로. */
  onInk?: boolean;
  className?: string;
};

export function BrandMark({
  size = 28,
  variant = 'plain',
  onInk = false,
  className,
}: BrandMarkProps) {
  const g = BRAND_MARK_GEOMETRY;
  const bw = 100 * g.barWidth;
  const bh = 100 * g.barHeight;
  const isTile = variant === 'tile';
  const cornerColor = isTile || onInk ? '#F2F3F0' : '#0D0E12';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {isTile ? (
        <rect width="100" height="100" rx={100 * g.tileRadius} fill="#1530FF" />
      ) : null}
      <rect
        x={50 - bw / 2}
        y={50 - bh / 2}
        width={bw}
        height={bh}
        rx={bh * g.barRadius}
        fill="#E8FF3A"
        transform={`rotate(${g.barRotate} 50 50)`}
      />
      <path
        d={cornersPath()}
        stroke={cornerColor}
        strokeWidth={100 * g.stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
