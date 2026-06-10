// src/lib/account.ts
//
// Memsum — 사용자 데이터 삭제(자기 데이터 영구 삭제) 데이터 레이어.
// 설정 → 데이터 → "내 데이터 삭제"에서 호출한다. 스토어 제출(개인정보처리방침·
// Data safety/App Privacy)에서 약속하는 "앱 내 직접 삭제"의 실제 구현부다.
//
// 삭제 대상(모두 본인 것만 — RLS + 명시 user_id 필터로 이중 보장):
//   - Storage: captures-raw/{userId}/ 아래 모든 이미지 객체
//   - DB: report_feedback → weekly_reports → captures (FK on delete cascade가 있으나
//         순서 의존을 없애기 위해 명시적으로 자식부터 지운다)
//
// 익명 인증이라 auth.users 행 자체는 클라이언트에서 지울 수 없다(관리자 권한 필요).
// 데이터는 모두 비워지고, 세션(빈 익명 계정)은 유지된다.

import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 캡처 원본 버킷 id (0002_storage.sql). storage.ts와 동일. */
const BUCKET = 'captures-raw';

/** storage.list 1회 페이지 크기. 페르소나는 1,800여 장이라 페이지네이션이 필요하다. */
const STORAGE_LIST_PAGE = 100;

/** storage.remove 1회 batch 크기(과도한 URL 길이/요청 크기 방지). */
const STORAGE_REMOVE_BATCH = 100;

/**
 * 삭제 대상 테이블. 자식(피드백) → 부모(리포트·캡처) 순.
 * 모두 user_id 컬럼을 가지며 RLS(auth.uid() = user_id)로 본인 행만 노출된다.
 */
const TABLES_TO_CLEAR = ['report_feedback', 'weekly_reports', 'captures'] as const;

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * captures-raw/{userId}/ 아래 모든 객체 경로를 페이지네이션으로 수집한다.
 * 레이아웃은 평면({uid}/{capId}.jpg)이라 한 단계만 순회한다.
 * Supabase가 빈 폴더에 넣는 '.emptyFolderPlaceholder'(이름이 '.'로 시작)는 제외한다.
 */
async function listAllStoragePaths(userId: string): Promise<string[]> {
  const supabase = getSupabase();
  const paths: string[] = [];
  let offset = 0;

  // 페이지가 가득 차면 다음 페이지가 있을 수 있다(미만이면 마지막).
  for (;;) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(userId, { limit: STORAGE_LIST_PAGE, offset });

    if (error) {
      throw new Error(`이미지 목록 조회 실패: ${error.message}`);
    }

    const batch = data ?? [];
    for (const obj of batch) {
      if (obj.name && !obj.name.startsWith('.')) {
        paths.push(`${userId}/${obj.name}`);
      }
    }

    if (batch.length < STORAGE_LIST_PAGE) break;
    offset += STORAGE_LIST_PAGE;
  }

  return paths;
}

/** 수집한 경로들을 batch로 나눠 삭제한다. */
async function removeStorageObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = getSupabase();

  for (let i = 0; i < paths.length; i += STORAGE_REMOVE_BATCH) {
    const chunk = paths.slice(i, i + STORAGE_REMOVE_BATCH);
    const { error } = await supabase.storage.from(BUCKET).remove(chunk);
    if (error) {
      throw new Error(`이미지 삭제 실패: ${error.message}`);
    }
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 사용자의 모든 캡처 데이터(이미지·캡처·리포트·피드백)를 영구 삭제한다.
 *
 * Storage 객체를 먼저 지워 DB 행이 남아도 고아 이미지를 남기지 않는다.
 * 이어서 DB 행을 자식→부모 순으로 지운다. 각 delete는 user_id로 본인 한정한다
 * (PostgREST는 무필터 delete를 막으므로 명시 필터가 필요하고, RLS가 추가 안전망이다).
 *
 * @throws 단계 중 하나라도 실패하면 사용자 친화 메시지로 throw(부분 삭제 가능성 안내는 호출 측).
 */
export async function deleteAllUserData(userId: string): Promise<void> {
  if (!userId) {
    throw new Error('삭제할 사용자 세션이 없습니다. 잠시 후 다시 시도해주세요.');
  }

  const supabase = getSupabase();

  try {
    // 1) Storage 이미지 객체 삭제(먼저).
    const paths = await listAllStoragePaths(userId);
    await removeStorageObjects(paths);

    // 2) DB 행 삭제(자식 → 부모 순). 모두 본인(user_id) 한정.
    for (const table of TABLES_TO_CLEAR) {
      const { error } = await supabase.from(table).delete().eq('user_id', userId);
      if (error) {
        throw new Error(`${table} 삭제 실패: ${error.message}`);
      }
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '데이터 삭제 중 알 수 없는 오류가 발생했습니다.';
    console.error('[account] deleteAllUserData 실패:', message);
    throw new Error(message);
  }
}
