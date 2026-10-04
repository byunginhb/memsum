import { countSince, pickHeadline, weekLabelParts, weekStartMs } from '../home-summary';

describe('weekLabelParts', () => {
  it('달을 걸치는 주는 목요일이 속한 달의 주로 센다', () => {
    // 2026-09-28(월) ~ 10-04(일): 목요일 10/1 → 10월 1주.
    expect(weekLabelParts('2026-09-28', 'ko')).toEqual({ month: '10', week: 1 });
    expect(weekLabelParts('2026-09-28', 'en')).toEqual({ month: 'Oct', week: 1 });
  });

  it('달 안쪽 주는 그 달의 몇째 주', () => {
    // 2026-10-12(월): 목요일 10/15 → 3주.
    expect(weekLabelParts('2026-10-12', 'ko')).toEqual({ month: '10', week: 3 });
  });

  it('잘못된 날짜면 null', () => {
    expect(weekLabelParts('not-a-date', 'ko')).toBeNull();
  });
});

describe('countSince', () => {
  it('기준 시각 이후 항목만 센다', () => {
    const from = weekStartMs('2026-09-28');
    expect(from).not.toBeNull();
    const items = ['2026-09-27T23:00:00+09:00', '2026-09-28T00:00:00+09:00', '2026-10-02T10:00:00Z', 'bad'];
    expect(countSince(items, from as number)).toBe(2);
  });
});

describe('pickHeadline', () => {
  it('일정 > 택배 > 캡처 순으로 고른다', () => {
    expect(pickHeadline({ events: 2, parcels: 1, captures: 9, hasAny: true })).toEqual({ kind: 'events', count: 2 });
    expect(pickHeadline({ events: 0, parcels: 1, captures: 9, hasAny: true })).toEqual({ kind: 'parcels', count: 1 });
    expect(pickHeadline({ events: 0, parcels: 0, captures: 9, hasAny: true })).toEqual({ kind: 'captures', count: 9 });
  });

  it('이번 주가 비었으면 quietWeek, 캡처가 없으면 empty', () => {
    expect(pickHeadline({ events: 0, parcels: 0, captures: 0, hasAny: true }).kind).toBe('quietWeek');
    expect(pickHeadline({ events: 3, parcels: 0, captures: 3, hasAny: false }).kind).toBe('empty');
  });
});
