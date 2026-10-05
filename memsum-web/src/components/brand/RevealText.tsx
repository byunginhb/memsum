import { Fragment, type ReactNode } from 'react';

function words(text: string, keyBase: string): ReactNode[] {
  // 공백 그대로 두고 단어만 감싼다 — 보이는 문장·복사되는 글자·줄바꿈 위치가 원문과 같다.
  return text.split(/(\s+)/).map((part, i) =>
    part.trim() === '' ? (
      <Fragment key={`${keyBase}${i}`}>{part}</Fragment>
    ) : (
      <span key={`${keyBase}${i}`} className="rv-w">
        <span>{part}</span>
      </span>
    ),
  );
}

type RevealTextProps = {
  /** 문장 전체(카피 원문 그대로). */
  text: string;
  /** 형광펜을 칠할 구절(스크롤에 맞춰 그어진다). 없거나 못 찾으면 문장만. */
  mark?: string;
  /**
   * marker: 글자 뒤 형광 배경(종이 위). underline: 형광 밑줄(잉크 면 위) — 형광 배경은 글자 아래쪽만 덮어
   * 잉크 면에서는 잉크색 글자 윗부분이 바탕에 묻히므로, 잉크 위에선 글자는 종이색 그대로 두고 밑줄로 긋는다.
   */
  markStyle?: 'marker' | 'underline';
};

/**
 * 제목 줄 단위 등장 — 단어를 마스크 안에 넣어 두고, ScrollFx 가 실제 줄바꿈을 재서 줄마다 조금씩 늦게
 * 아래→위(살짝 흐림→선명)로 올린다. 부모 요소에 `data-rv="title"` 을 달아 쓴다.
 * 형광펜 구절은 그 단어들을 감싼 바깥 span 이라 글자 등장과 별개로 스크롤 진행에 맞춰 그어진다.
 */
export function RevealText({ text, mark, markStyle = 'marker' }: RevealTextProps): ReactNode {
  const at = mark ? text.indexOf(mark) : -1;
  if (!mark || at < 0) return words(text, 'w');
  return (
    <>
      {words(text.slice(0, at), 'a')}
      <span
        className={markStyle === 'underline' ? 'marked-line' : 'marked'}
        data-fx="range" data-fx-start="0.86" data-fx-end="0.5" data-fx-tau="160">
        {words(mark, 'm')}
      </span>
      {words(text.slice(at + mark.length), 'b')}
    </>
  );
}
