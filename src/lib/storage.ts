// src/lib/storage.ts
//
// Memsum — 캡처 원본 이미지 Storage 업로드 (Week 3, W3-B).
// 흐름: 로컬 스크린샷 uri → 리사이즈 + JPEG 압축 → ArrayBuffer 업로드 →
//        captures-raw 버킷에 {userId}/{captureId}.jpg 로 저장.
//
// 경로 규칙(0002_storage.sql): captures-raw/{user_id}/{capture_id}.jpg.
// 버킷 RLS가 첫 폴더 세그먼트 = auth.uid() 를 강제하므로 userId가 폴더여야 한다.
//
// captures.image_url 에는 "버킷 제외 상대 경로"({userId}/{captureId}.jpg)를 저장한다.
// 서명 URL은 비공개 버킷이라 조회 시점에 getSignedUrl()로 생성한다(영구 URL을 DB에 두지 않는다).

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type {
  UploadCaptureImageArgs,
  UploadCaptureImageResult,
} from '@/features/capture/types';
import { getSupabase } from '@/lib/supabase';

// ── 상수 ─────────────────────────────────────────────────────────────────────

/** 캡처 원본 버킷 id (0002_storage.sql). */
const BUCKET = 'captures-raw';

/** 업로드 MIME. JPEG로 압축하므로 image/jpeg 고정. */
const CONTENT_TYPE = 'image/jpeg';

/**
 * 리사이즈 최대 폭(px). OCR·미리보기에 충분하고 업로드 비용을 줄이는 균형값.
 * 원본이 이보다 좁으면 확대하지 않는다(원본 폭 유지).
 */
const MAX_WIDTH = 1080;

/** JPEG 압축 품질(0~1). 0.7은 텍스트 가독성과 용량의 절충. */
const COMPRESS_QUALITY = 0.7;

/** 서명 URL 기본 만료(초). 1시간. 미리보기 단발성 사용 기준. */
const SIGNED_URL_TTL_SEC = 60 * 60;

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

/**
 * 로컬 이미지를 리사이즈(최대 폭 MAX_WIDTH)하고 JPEG로 압축해
 * 캐시 디렉터리에 새 파일을 만든 뒤 그 로컬 uri를 반환한다.
 *
 * 왜 새 파일인가: image-manipulator는 매 변환마다 새 파일을 만들고
 * 원본을 덮어쓰지 않는다(원본 보존, 캐시 무효화 회피).
 */
async function compressToJpeg(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.manipulate(uri);
    // width만 지정하면 비율 유지로 height 자동 계산.
    context.resize({ width: MAX_WIDTH });
    const ref = await context.renderAsync();
    const result = await ref.saveAsync({
      format: SaveFormat.JPEG,
      compress: COMPRESS_QUALITY,
    });
    return result.uri;
  } catch (error) {
    console.error('[storage] 이미지 압축 실패:', error);
    throw new Error('이미지 압축에 실패했습니다.');
  }
}

/**
 * 로컬 파일 uri를 ArrayBuffer로 읽는다.
 *
 * 왜 ArrayBuffer인가: RN 환경에서 Supabase storage 업로드는 Blob보다
 * ArrayBuffer가 안정적이다(빈 파일 업로드/길이 0 버그 회피).
 * Expo SDK56 fetch는 file:// 스킴의 arrayBuffer()를 지원한다.
 */
async function readFileAsArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(localUri);
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      throw new Error('읽은 이미지 데이터가 비어 있습니다.');
    }
    return buffer;
  } catch (error) {
    console.error('[storage] 이미지 파일 읽기 실패:', error);
    throw new Error('이미지 파일을 읽지 못했습니다.');
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────────

/**
 * 캡처 이미지를 압축해 captures-raw 버킷에 업로드한다.
 *
 * @returns path: 버킷 제외 상대 경로({userId}/{captureId}.jpg). captures.image_url 에 그대로 저장한다.
 */
export async function uploadCaptureImage({
  uri,
  userId,
  captureId,
}: UploadCaptureImageArgs): Promise<UploadCaptureImageResult> {
  const supabase = getSupabase();

  // RLS 강제 규칙: 첫 폴더 세그먼트가 소유자 uid 여야 한다.
  const path = `${userId}/${captureId}.jpg`;

  try {
    const compressedUri = await compressToJpeg(uri);
    const arrayBuffer = await readFileAsArrayBuffer(compressedUri);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: CONTENT_TYPE,
        // 동일 capture를 재시도해도 멱등하게 덮어쓴다.
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage 업로드 실패: ${error.message}`);
    }

    return { path };
  } catch (error) {
    // 압축·읽기·업로드 단계의 오류를 호출 측에 일관된 메시지로 표면화.
    const message =
      error instanceof Error ? error.message : '이미지 업로드 중 알 수 없는 오류가 발생했습니다.';
    console.error('[storage] uploadCaptureImage 실패:', message);
    throw new Error(message);
  }
}

/**
 * 비공개 버킷 객체의 서명 URL을 생성한다(기본 1시간 만료). 미리보기에 사용.
 *
 * @param path uploadCaptureImage가 반환한 버킷 제외 상대 경로({userId}/{captureId}.jpg).
 */
export async function getSignedUrl(
  path: string,
  expiresInSec: number = SIGNED_URL_TTL_SEC,
): Promise<string> {
  const supabase = getSupabase();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, expiresInSec);

    if (error || !data) {
      throw new Error(`서명 URL 생성 실패: ${error?.message ?? '알 수 없는 오류'}`);
    }

    return data.signedUrl;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '서명 URL 생성 중 알 수 없는 오류가 발생했습니다.';
    console.error('[storage] getSignedUrl 실패:', message);
    throw new Error(message);
  }
}
