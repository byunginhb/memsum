// 주간 리포트 캐시 재사용 판단 회귀 테스트.
// 버그: 진행 중인 주의 리포트가 첫 생성본으로 영구 고정됨(주중 캡처가 늘어도 그대로).

import { canReuseCachedReport } from '../report-cache';

const generatedAt = '2026-10-01T10:00:00.000Z';
const cached = { locale: 'ko', total_captures: 3, generated_at: generatedAt };

describe('canReuseCachedReport', () => {
  it('지난 주는 언어만 맞으면 캐시를 그대로 쓴다', () => {
    expect(canReuseCachedReport(cached, 'ko', false, null)).toBe(true);
  });

  it('언어가 바뀌면 지난 주라도 다시 만든다(legacy null은 ko)', () => {
    expect(canReuseCachedReport(cached, 'en', false, null)).toBe(false);
    expect(canReuseCachedReport({ ...cached, locale: null }, 'ko', false, null)).toBe(true);
  });

  it('진행 중인 주: 캡처 수가 늘었으면 다시 만든다', () => {
    expect(
      canReuseCachedReport(cached, 'ko', true, {
        weekCount: 7,
        latestCaptureAt: '2026-10-01T09:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('진행 중인 주: 수가 같아도 생성 이후 새 캡처가 있으면(삭제+추가) 다시 만든다', () => {
    expect(
      canReuseCachedReport(cached, 'ko', true, {
        weekCount: 3,
        latestCaptureAt: '2026-10-02T09:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('진행 중인 주: 변화가 없으면 캐시를 쓴다', () => {
    expect(
      canReuseCachedReport(cached, 'ko', true, {
        weekCount: 3,
        latestCaptureAt: '2026-10-01T09:59:59.000Z',
      }),
    ).toBe(true);
  });

  it('진행 중인 주: 현재 상태를 모르면 안전하게 다시 만든다', () => {
    expect(canReuseCachedReport(cached, 'ko', true, null)).toBe(false);
  });
});
