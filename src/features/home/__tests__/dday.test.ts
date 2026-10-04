import { setLocale } from '@/i18n';

import { dDayBadge, localDayDiff } from '../dday';

describe('dday', () => {
  beforeAll(() => setLocale('ko'));

  // 기기 시간대와 무관하게 만들려고 로컬 시각 생성자로 기준을 잡는다.
  const now = new Date(2026, 9, 4, 22, 30).getTime();
  const at = (day: number, hour: number): string => new Date(2026, 9, day, hour, 0).toISOString();

  it('자정 기준으로 날짜 차이를 센다(밤 늦게도 내일은 1)', () => {
    expect(localDayDiff(at(4, 23), now)).toBe(0);
    expect(localDayDiff(at(5, 0), now)).toBe(1);
    expect(localDayDiff(at(8, 9), now)).toBe(4);
  });

  it('오늘/내일/D-N 배지', () => {
    expect(dDayBadge(at(4, 23), now)).toBe('오늘');
    expect(dDayBadge(at(5, 9), now)).toBe('내일');
    expect(dDayBadge(at(8, 9), now)).toBe('D-4');
  });

  it('파싱 실패면 폴백 문구', () => {
    expect(localDayDiff('nope', now)).toBeNull();
    expect(dDayBadge('nope', now)).toBe('날짜 미상');
  });
});
