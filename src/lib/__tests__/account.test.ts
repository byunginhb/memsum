// src/lib/__tests__/account.test.ts
//
// deleteAllUserData 페이지네이션 회귀 테스트 — 이슈 #6 수락 기준.
// Supabase 클라이언트를 목킹해 Storage list 응답을 페이지 단위로 시뮬레이트하고,
// 경계값(99/100/101/250)에서 모든 객체가 삭제되는지, DB 삭제 순서(자식→부모)가
// 지켜지는지, 부분 실패 후 재호출이 멱등하게 완료되는지 검증한다.

import { deleteAllUserData } from '../account';
import { getSupabase } from '../supabase';

jest.mock('../supabase', () => ({
  getSupabase: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

// deleteAllUserData 내부 console.error가 테스트 출력을 오염시키지 않도록 suppress.
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());

/** Storage list 응답을 totalObjects 수 기준으로 오프셋 페이지네이션 시뮬레이션. */
function makeListFn(totalObjects: number): jest.Mock {
  const allObjects = Array.from({ length: totalObjects }, (_, i) => ({
    name: `cap_${String(i).padStart(4, '0')}.jpg`,
  }));
  return jest.fn(
    (_prefix: string, { limit, offset }: { limit: number; offset: number }) =>
      Promise.resolve({ data: allObjects.slice(offset, offset + limit), error: null }),
  );
}

type MockedSupabase = ReturnType<typeof getSupabase>;

function createMockSupabase(totalObjects: number): {
  mockSupabase: MockedSupabase;
  removeMock: jest.Mock;
  listMock: jest.Mock;
  fromDbMock: jest.Mock;
  eqMock: jest.Mock;
} {
  const removeMock = jest.fn().mockResolvedValue({ error: null });
  const listMock = makeListFn(totalObjects);
  const eqMock = jest.fn().mockResolvedValue({ error: null });
  const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
  const fromDbMock = jest.fn().mockReturnValue({ delete: deleteMock });

  const mockSupabase = {
    storage: {
      from: jest.fn().mockReturnValue({
        list: listMock,
        remove: removeMock,
      }),
    },
    from: fromDbMock,
  } as unknown as MockedSupabase;

  return { mockSupabase, removeMock, listMock, fromDbMock, eqMock };
}

const USER_ID = 'test-user-uuid-1234';
/** 실제 TABLES_TO_CLEAR 상수와 동일 순서 — 변경 시 양쪽 동기화 필요. */
const DB_TABLES = ['report_feedback', 'weekly_reports', 'captures'] as const;

// ── 페이지네이션 경계값 ───────────────────────────────────────────────────────

describe('deleteAllUserData — Storage 페이지네이션 경계값', () => {
  it('99개(한 페이지 미만): list 1회 + remove 1 batch로 모두 삭제한다', async () => {
    const { mockSupabase, removeMock, listMock } = createMockSupabase(99);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    // 99 < 100 → 첫 페이지에서 루프 종료, list 1회.
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ limit: 100, offset: 0 }),
    );

    // 99개를 1 batch(≤100)로 remove.
    expect(removeMock).toHaveBeenCalledTimes(1);
    const removed = removeMock.mock.calls[0][0] as string[];
    expect(removed).toHaveLength(99);
    expect(removed[0]).toBe(`${USER_ID}/cap_0000.jpg`);
    expect(removed[98]).toBe(`${USER_ID}/cap_0098.jpg`);
  });

  it('정확히 100개(경계): list 2회(두 번째 0개) + 100개 모두 삭제한다', async () => {
    const { mockSupabase, removeMock, listMock } = createMockSupabase(100);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    // 100 === 100(STORAGE_LIST_PAGE) → 다음 페이지 시도. 두 번째 0개 → 종료.
    expect(listMock).toHaveBeenCalledTimes(2);
    expect(listMock).toHaveBeenNthCalledWith(
      2,
      USER_ID,
      expect.objectContaining({ limit: 100, offset: 100 }),
    );

    const allRemoved = removeMock.mock.calls.flatMap((c) => c[0] as string[]);
    expect(allRemoved).toHaveLength(100);
    expect(new Set(allRemoved).size).toBe(100); // 중복 없음
  });

  it('101개(2페이지: 100+1): list 2회 + 101개 빠짐없이 삭제한다', async () => {
    const { mockSupabase, removeMock, listMock } = createMockSupabase(101);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    // 첫 100개 + 두 번째 1개.
    expect(listMock).toHaveBeenCalledTimes(2);

    const allRemoved = removeMock.mock.calls.flatMap((c) => c[0] as string[]);
    expect(allRemoved).toHaveLength(101);
    expect(new Set(allRemoved).size).toBe(101); // 중복 없음
  });

  it('250개(3페이지: 100+100+50): list 3회 + 250개 모두 누락·중복 없이 삭제한다', async () => {
    const { mockSupabase, removeMock, listMock } = createMockSupabase(250);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    // 100→100→50: 세 번째 50 < 100 → 종료.
    expect(listMock).toHaveBeenCalledTimes(3);
    expect(listMock).toHaveBeenNthCalledWith(
      3,
      USER_ID,
      expect.objectContaining({ limit: 100, offset: 200 }),
    );

    const allRemoved = removeMock.mock.calls.flatMap((c) => c[0] as string[]);
    expect(allRemoved).toHaveLength(250);
    expect(new Set(allRemoved).size).toBe(250);
  });
});

// ── DB 삭제 순서 ──────────────────────────────────────────────────────────────

describe('deleteAllUserData — DB 삭제 순서', () => {
  it('자식 → 부모 순(report_feedback → weekly_reports → captures)으로 delete를 호출한다', async () => {
    const { mockSupabase, fromDbMock } = createMockSupabase(0);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    const callOrder = fromDbMock.mock.calls.map((c) => c[0] as string);
    expect(callOrder).toEqual([...DB_TABLES]);
  });

  it('각 테이블 delete는 .eq("user_id", USER_ID)로 본인 행만 한정한다(over-delete 방지)', async () => {
    const { mockSupabase, eqMock } = createMockSupabase(0);
    mockGetSupabase.mockReturnValue(mockSupabase);

    await deleteAllUserData(USER_ID);

    expect(eqMock).toHaveBeenCalledTimes(DB_TABLES.length);
    eqMock.mock.calls.forEach((call) => {
      expect(call).toEqual(['user_id', USER_ID]);
    });
  });
});

// ── 멱등성 ───────────────────────────────────────────────────────────────────

describe('deleteAllUserData — 멱등성', () => {
  it('Storage remove 실패 후 재호출 시 나머지를 정상 삭제하고 DB도 완료한다', async () => {
    const listMock = makeListFn(5);
    const removeMock = jest
      .fn()
      .mockResolvedValueOnce({ error: { message: '네트워크 오류' } }) // 1차: 실패
      .mockResolvedValue({ error: null }); // 2차~: 성공
    const eqMock = jest.fn().mockResolvedValue({ error: null });
    const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
    const fromDbMock = jest.fn().mockReturnValue({ delete: deleteMock });

    const mockSupabase = {
      storage: {
        from: jest.fn().mockReturnValue({ list: listMock, remove: removeMock }),
      },
      from: fromDbMock,
    } as unknown as MockedSupabase;

    mockGetSupabase.mockReturnValue(mockSupabase);

    // 1차 호출: remove 실패 → throw. DB 삭제는 도달하지 않는다.
    await expect(deleteAllUserData(USER_ID)).rejects.toThrow();
    expect(fromDbMock).toHaveBeenCalledTimes(0);

    // 2차 호출: remove 성공 → DB 삭제까지 완료.
    await expect(deleteAllUserData(USER_ID)).resolves.toBeUndefined();
    expect(fromDbMock).toHaveBeenCalledTimes(DB_TABLES.length);
    expect(eqMock).toHaveBeenCalledTimes(DB_TABLES.length);
  });
});
