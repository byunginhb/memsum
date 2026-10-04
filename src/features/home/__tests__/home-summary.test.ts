import { pickHeadline, weekLabelParts } from '../home-summary';

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

describe('pickHeadline', () => {
  it('다가오는 일정 > 오는 중인 택배 > 이번 주 캡처 순으로 고른다', () => {
    expect(pickHeadline({ upcomingEvents: 2, activeParcels: 1, captures: 9, hasAny: true })).toEqual({ kind: 'events', count: 2 });
    expect(pickHeadline({ upcomingEvents: 0, activeParcels: 1, captures: 9, hasAny: true })).toEqual({ kind: 'parcels', count: 1 });
    expect(pickHeadline({ upcomingEvents: 0, activeParcels: 0, captures: 9, hasAny: true })).toEqual({ kind: 'captures', count: 9 });
  });

  it('챙길 게 없으면 quietWeek, 캡처가 없으면 empty', () => {
    expect(pickHeadline({ upcomingEvents: 0, activeParcels: 0, captures: 0, hasAny: true }).kind).toBe('quietWeek');
    expect(pickHeadline({ upcomingEvents: 3, activeParcels: 0, captures: 3, hasAny: false }).kind).toBe('empty');
  });
});
