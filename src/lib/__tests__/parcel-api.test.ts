// src/lib/__tests__/parcel-api.test.ts
//
// 택배 기능 스위치(PARCEL_ENABLED=false) 회귀 테스트.
// 2026-10-05 유료 API라 택배 조회를 뺐고 운영의 track-parcel 함수도 지웠으므로,
// 스위치가 꺼져 있는 동안 어떤 진입로로도 Edge Function·parcel_tracks 쓰기가 일어나지 않아야 한다.

import { PARCEL_ENABLED } from '../features';
import {
  ParcelNotConfiguredError,
  createParcelTrack,
  listParcelTracks,
  recommendCarrier,
  trackParcel,
} from '../parcel-api';
import { getSupabase } from '../supabase';

jest.mock('../supabase', () => ({
  getSupabase: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

describe('택배 기능 스위치 off', () => {
  const invoke = jest.fn();
  const from = jest.fn();

  beforeEach(() => {
    invoke.mockReset();
    from.mockReset();
    mockGetSupabase.mockReturnValue({
      functions: { invoke },
      from,
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-1' } } },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getSupabase>);
  });

  it('스위치 기본값은 꺼짐이다', () => {
    expect(PARCEL_ENABLED).toBe(false);
  });

  it('track-parcel 함수를 부르지 않고 "준비 중" 오류로 막는다', async () => {
    await expect(recommendCarrier('651234789012')).rejects.toBeInstanceOf(
      ParcelNotConfiguredError,
    );
    await expect(trackParcel('04', '651234789012')).rejects.toBeInstanceOf(
      ParcelNotConfiguredError,
    );
    await expect(
      createParcelTrack({ carrierCode: '04', invoiceNo: '651234789012' }),
    ).rejects.toBeInstanceOf(ParcelNotConfiguredError);
    await expect(listParcelTracks()).resolves.toEqual([]);

    expect(invoke).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
