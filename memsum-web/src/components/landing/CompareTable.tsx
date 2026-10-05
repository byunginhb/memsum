import { RevealText } from '@/components/brand/RevealText';
import type { LandingCopy } from '@/lib/landing-copy';

/** 제목에서 형광펜을 그을 구절(카피 원문의 일부). */
const TITLE_MARK = { ko: '“정리하지 마세요”', en: '“Don’t sort”' } as const;

/**
 * 비교 — 진짜 표. 굵은 잉크 윗선과 머리카락 행 구분선만, Memsum 열은 코발트 머리와 잉크 본문으로 앞세운다.
 * 360px에서도 세 열이 들어가도록 항목 열을 좁게 두고, 좁으면 표 안에서만 가로로 밀린다.
 */
export function CompareTable({ copy }: { copy: LandingCopy }) {
  const c = copy.compare;
  const lang = copy.isKorean ? 'ko' : 'en';

  return (
    <section aria-labelledby="compare-title" className="wrap py-24 sm:py-32">
      <h2 id="compare-title" data-rv="title" className="t-title max-w-3xl text-[clamp(1.875rem,4.4vw,3rem)]">
        <RevealText text={c.title} mark={TITLE_MARK[lang]} />
      </h2>

      <div data-rv="rows" className="mt-12 overflow-x-auto lg:mt-16">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-ink">
              <td className="w-[24%] pb-3" />
              <th scope="col" className="w-[36%] pr-3 pb-3 text-[13px] font-semibold text-ink-2 sm:text-[14px]">
                {c.otherHeader}
              </th>
              <th scope="col" lang="en" className="w-[40%] pb-3 text-[14px] font-black tracking-[-0.02em] text-cobalt sm:text-[16px]">
                {c.memsumHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => (
              <tr key={row.label} className="border-b border-rule align-top">
                <th scope="row" className="py-5 pr-3 text-[13px] font-semibold text-ink-2 sm:text-[15px]">
                  {row.label}
                </th>
                <td className="py-5 pr-3 text-[14px] leading-[1.5] text-ink-2 sm:text-[17px]">{row.other}</td>
                <td className="py-5 text-[14px] leading-[1.5] font-bold tracking-[-0.01em] sm:text-[17px]">
                  {row.memsum}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
