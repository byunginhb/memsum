import type { CSSProperties } from 'react';

import { RevealText } from '@/components/brand/RevealText';
import type { Lang, LandingCopy } from '@/lib/landing-copy';
import {
  homeScanBoxes,
  SCENE_CARD_IMG,
  SCENE_CARD_RATIO,
  SCENE_PIECE,
  SCENE_SHEET,
  SCREEN_SIZE,
  sceneCardMarks,
  screenSrc,
} from '@/lib/screens';

/** 홈 화면 "놓치면 안 돼요" 목록에서 결혼식 줄(D-6)의 순서 — 떨어져 나온 일정이 내려앉는 자리. */
const WEDDING_ROW = 2;

/**
 * 모바일·모션 줄이기용 단계별 화면이 보여줄 장면 구간(전체 진행도 0~1 중).
 * 데스크톱 고정 화면은 이 구간들을 스크롤 하나로 이어 재생한다. 기본값(SSR)은 구간의 끝 = 그 단계의 완성 장면.
 */
const STAGE_RANGES: readonly (readonly [number, number])[] = [
  [0, 0.12],
  [0.25, 0.5],
  [0.5, 0.72],
  [0.75, 0.88],
];

type FrameProps = {
  lang: Lang;
  /** 각 화면 대체 텍스트. 단계별 사본에서는 비우고 틀 전체에 라벨 하나만 단다. */
  alts?: { card: string; result: string; home: string; report: string };
  label?: string;
  range?: readonly [number, number];
  className?: string;
};

/**
 * 장면 무대 — 스크린샷 카드 → 스캔·형광펜 → 결과 시트 → 일정 줄이 홈 목록으로 → 5줄 리포트.
 * 모든 층의 움직임은 CSS(globals.css `.sf`)가 진행도 변수 `--p` 하나로 계산한다. 여기선 층만 쌓는다.
 */
function SceneFrame({ lang, alts, label, range, className }: FrameProps) {
  const marks = sceneCardMarks(lang);
  const row = homeScanBoxes(lang)[WEDDING_ROW];
  const img = (key: 'home' | 'result' | 'report' | 'search', alt: string) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={screenSrc(lang, key)}
      alt={alt}
      width={SCREEN_SIZE.width}
      height={SCREEN_SIZE.height}
      loading="lazy"
      decoding="async"
    />
  );

  const rangeAttrs = range
    ? {
        'data-fx': 'range',
        'data-fx-start': '0.95',
        'data-fx-end': '0.3',
        'data-fx-from': String(range[0]),
        'data-fx-to': String(range[1]),
        style: { ['--p' as string]: String(range[1]) } as CSSProperties,
      }
    : {};

  return (
    <div
      className={`sf ${className ?? ''}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      {...rangeAttrs}
    >
      <div className="sf-base">
        <div className="sf-layer">{img('home', alts?.home ?? '')}</div>
        <span
          aria-hidden="true"
          className="sf-rowmark"
          style={{ left: row.left, top: row.top, width: row.width, height: row.height }}
        />
        <span aria-hidden="true" className="sf-dim" />

        <div className="sf-sheet" style={{ top: SCENE_SHEET.top }}>
          <div className="sf-sheet-img" style={{ top: SCENE_SHEET.imgTop }}>
            {img('result', alts?.result ?? '')}
          </div>
        </div>

        <div className="sf-card" style={{ aspectRatio: SCENE_CARD_RATIO }}>
          <div className="sf-card-clip">
            <div
              className="sf-card-img"
              style={{ width: SCENE_CARD_IMG.width, left: SCENE_CARD_IMG.left, top: SCENE_CARD_IMG.top }}
            >
              {img('search', alts?.card ?? '')}
            </div>
            {marks.map((m, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="sf-mark"
                style={{
                  left: m.left,
                  top: m.top,
                  width: m.width,
                  height: m.height,
                  ['--y' as string]: m.y,
                }}
              />
            ))}
            <span aria-hidden="true" className="sf-scan" />
          </div>
          <span aria-hidden="true" className="sf-corner sf-corner-tl" />
          <span aria-hidden="true" className="sf-corner sf-corner-tr" />
          <span aria-hidden="true" className="sf-corner sf-corner-bl" />
          <span aria-hidden="true" className="sf-corner sf-corner-br" />
        </div>

        <div aria-hidden="true" className="sf-piece" style={{ top: SCENE_PIECE.top, height: SCENE_PIECE.height }}>
          <div className="sf-piece-img" style={{ top: SCENE_PIECE.imgTop }}>
            {img('result', '')}
          </div>
        </div>
      </div>

      <span aria-hidden="true" className="sf-shade" />
      <div className="sf-report">{img('report', alts?.report ?? '')}</div>
    </div>
  );
}

type StageCopy = { title: string; body: string };

function Feature({ item }: { item: StageCopy }) {
  return (
    <div className="border-t border-rule pt-5">
      <h3 className="text-[clamp(1.125rem,1.7vw,1.3125rem)] leading-[1.35] font-bold tracking-[-0.02em]">
        {item.title}
      </h3>
      <p className="mt-2 text-[15.5px] leading-[1.75] text-ink-2">{item.body}</p>
    </div>
  );
}

function Caption({ text }: { text: string }) {
  return (
    <p className="mt-7 flex items-center gap-3 text-[13px] font-semibold text-ink-2">
      <span aria-hidden="true" className="h-px w-6 bg-ink" />
      {text}
    </p>
  );
}

/**
 * 작동 순서 — 페이지의 중심 장면(스크롤텔링).
 * 데스크톱: 오른쪽 앱 화면이 고정된 채 왼쪽 단계 글이 지나가고, 지나는 정도에 따라 장면이 이어 바뀐다.
 * 모바일·모션 줄이기·JS 없음: 단계마다 자기 화면을 글 아래(넓은 화면에선 옆)에 두고, 화면에 들어올 때 그 단계만 재생한다.
 * 옛 '작동 순서'·'기능'·'앱 화면' 섹션 문구를 단계 글로 그대로 옮겼다(문구 무변경).
 */
export function HowItWorks({ copy }: { copy: LandingCopy }) {
  const lang: Lang = copy.isKorean ? 'ko' : 'en';
  const steps = copy.steps.items;
  const features = copy.features.items;
  const screens = copy.appScreens;

  const alts = {
    card: copy.features.phoneAlt,
    result: screens.items[1].alt,
    home: screens.items[0].alt,
    report: screens.items[2].alt,
  };
  const stageLabels = [alts.card, alts.result, alts.home, alts.report];

  const stages = [
    {
      num: '01',
      step: steps[0],
      features: [] as StageCopy[],
      caption: undefined as string | undefined,
    },
    { num: '02', step: steps[1], features: [features[0], features[1]], caption: screens.items[1].caption },
    { num: '03', step: steps[2], features: [features[2]], caption: screens.items[0].caption },
    { num: undefined, step: undefined, features: [features[3], features[4]], caption: screens.items[2].caption },
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="steps-title"
      className="scene pt-16 pb-12 sm:pt-24"
      data-fx="scene"
      data-fx-tau="140"
    >
      <div className="wrap scene-grid">
        <div className="scene-steps">
          <h2 id="steps-title" data-rv="title" className="t-title text-[clamp(2.125rem,5vw,3.5rem)]">
            <RevealText text={copy.steps.title} />
          </h2>

          <div role="group" aria-label={copy.features.sectionAria}>
          {stages.map((s, i) => (
            <div key={i} className="scene-stage" data-stage={i}>
              <div className="scene-copy" data-rv="">
                {s.num ? <span className="t-mono block text-[13px] text-cobalt">{s.num}</span> : null}
                {s.step ? (
                  <>
                    <h3 className="mt-4 text-[clamp(1.625rem,3vw,2.25rem)] leading-[1.2] font-black tracking-[-0.035em]">
                      {s.step.title}
                    </h3>
                    <p className="mt-3 max-w-[30rem] text-[17px] leading-[1.7] text-ink-2">{s.step.body}</p>
                  </>
                ) : null}
                {s.features.length ? (
                  <div className={`grid max-w-[32rem] gap-6 ${s.step ? 'mt-9' : ''}`}>
                    {s.features.map((f) => (
                      <Feature key={f.title} item={f} />
                    ))}
                  </div>
                ) : null}
                {i === stages.length - 1 ? (
                  <div className="mt-12 border-t-2 border-ink pt-5">
                    <p className="text-[clamp(1.25rem,2.2vw,1.625rem)] leading-[1.3] font-black tracking-[-0.03em]">
                      {screens.title}
                    </p>
                    <p className="mt-2 text-[16px] leading-[1.7] text-ink-2">{screens.subtitle}</p>
                  </div>
                ) : null}
                {s.caption ? <Caption text={s.caption} /> : null}
              </div>

              <div className="scene-inline">
                <SceneFrame lang={lang} label={stageLabels[i]} range={STAGE_RANGES[i]} />
              </div>
            </div>
          ))}
          </div>
        </div>

        <div className="scene-pinwrap">
          <div className="scene-pin">
            <SceneFrame lang={lang} alts={alts} />
          </div>
        </div>
      </div>
    </section>
  );
}
