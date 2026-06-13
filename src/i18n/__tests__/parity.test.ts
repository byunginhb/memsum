import en from '../en.json';
import ko from '../ko.json';

// i18n 회귀 방지: 이번 작업 내내 수동으로 점검하던 ko/en 패리티를 테스트로 고정한다.
// (키 누락·미번역 잔존·플레이스홀더 불일치는 출시 후 "문구가 안 뜸/깨짐"으로 이어진다.)

const koMap = ko as Record<string, string>;
const enMap = en as Record<string, string>;
const koKeys = Object.keys(koMap);
const enKeys = Object.keys(enMap);

// "{name}", "{total}" 같은 플레이스홀더만 추출(정렬해 순서 무관 비교).
function placeholders(value: string): string[] {
  return (value.match(/\{[a-zA-Z]+\}/g) ?? []).sort();
}

describe('i18n ko/en parity', () => {
  it('키 집합이 정확히 일치한다 (ko에만/en에만 없음)', () => {
    expect(koKeys.filter((k) => !(k in enMap))).toEqual([]);
    expect(enKeys.filter((k) => !(k in koMap))).toEqual([]);
  });

  it('en 값에 한글이 남아 있지 않다 (미번역 방지)', () => {
    const hangul = /[가-힣]/;
    expect(enKeys.filter((k) => hangul.test(enMap[k]))).toEqual([]);
  });

  it('키별 플레이스홀더가 ko/en 간 일치한다', () => {
    const mismatches = koKeys.filter(
      (k) =>
        JSON.stringify(placeholders(koMap[k])) !==
        JSON.stringify(placeholders(enMap[k] ?? '')),
    );
    expect(mismatches).toEqual([]);
  });

  it('빈 문자열 값이 없다', () => {
    expect(koKeys.filter((k) => koMap[k].trim() === '')).toEqual([]);
    expect(enKeys.filter((k) => enMap[k].trim() === '')).toEqual([]);
  });
});
