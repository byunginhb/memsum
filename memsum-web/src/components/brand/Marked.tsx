import type { CSSProperties, ReactNode } from 'react';

type MarkedProps = {
  /** 문장 전체(카피 원문 그대로). */
  text: string;
  /** text 안에서 형광펜을 칠할 구절. 없거나 못 찾으면 문장만 그린다. */
  mark?: string;
  /** 지정하면 그 시점(ms)에 왼→오로 그어진다. 없으면 처음부터 칠해진 상태. */
  drawDelay?: number;
  /** 구절이 줄 사이에서 쪼개지지 않게(한 줄 통째로 칠하고 싶을 때). */
  nowrap?: boolean;
  /** 스크롤 진행에 맞춰 그어지게(ScrollFx). JS가 없거나 모션 줄이기면 처음부터 칠해진 상태. */
  scroll?: boolean;
};

/**
 * 형광펜 표시 — 문장 속 핵심 구절 하나에 형광 배경을 깐다(글자는 잉크색 유지).
 * 문구는 바꾸지 않고, 원문을 구절 기준으로 잘라 감쌀 뿐이다.
 */
export function Marked({ text, mark, drawDelay, nowrap = false, scroll = false }: MarkedProps): ReactNode {
  const at = mark ? text.indexOf(mark) : -1;
  if (!mark || at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span
        className={nowrap ? 'marked whitespace-nowrap' : 'marked'}
        data-draw={drawDelay !== undefined ? '' : undefined}
        {...(scroll
          ? { 'data-fx': 'range', 'data-fx-start': '0.86', 'data-fx-end': '0.5', 'data-fx-tau': '160' }
          : {})}
        style={
          drawDelay !== undefined
            ? ({ ['--draw-delay' as string]: `${drawDelay}ms` } as CSSProperties)
            : undefined
        }
      >
        {mark}
      </span>
      {text.slice(at + mark.length)}
    </>
  );
}
