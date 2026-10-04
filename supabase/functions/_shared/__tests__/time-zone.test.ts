// process-capture 시간대 처리 회귀 테스트.
// 버그: 서버가 Asia/Seoul(+09:00)로 고정돼 해외 사용자의 "내일 3시"가 KST로 등록됨.

import {
  DEFAULT_TIME_ZONE,
  localIsoWithOffset,
  resolveTimeZone,
  utcOffset,
} from '../time-zone';

describe('resolveTimeZone', () => {
  it('유효한 IANA 시간대는 그대로', () => {
    expect(resolveTimeZone('America/New_York')).toBe('America/New_York');
  });

  it('없거나 잘못된 값은 기본값(Asia/Seoul)', () => {
    expect(resolveTimeZone(undefined)).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone('')).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone('Mars/Olympus')).toBe(DEFAULT_TIME_ZONE);
    expect(resolveTimeZone(42)).toBe(DEFAULT_TIME_ZONE);
  });
});

describe('utcOffset / localIsoWithOffset', () => {
  const instant = new Date('2026-07-01T03:30:00Z');

  it('서울은 +09:00', () => {
    expect(utcOffset(instant, 'Asia/Seoul')).toBe('+09:00');
    expect(localIsoWithOffset(instant, 'Asia/Seoul')).toBe('2026-07-01T12:30:00+09:00');
  });

  it('뉴욕 여름(서머타임)은 -04:00, 날짜도 현지 기준', () => {
    expect(utcOffset(instant, 'America/New_York')).toBe('-04:00');
    expect(localIsoWithOffset(instant, 'America/New_York')).toBe('2026-06-30T23:30:00-04:00');
  });

  it('30분 단위 오프셋(인도 +05:30)', () => {
    expect(utcOffset(instant, 'Asia/Kolkata')).toBe('+05:30');
  });
});
