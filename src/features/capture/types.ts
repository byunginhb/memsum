// 캡처 파이프라인 공유 계약 (Week 3).
// 모든 에이전트(인증·스토리지/API·캡처플로우)가 이 타입을 단일 진실로 사용한다.

/** process-capture Edge Function 응답 (supabase/functions/process-capture/index.ts와 1:1). */
export type CaptureEvent = {
  title: string;
  starts_at: string; // ISO8601 (KST, +09:00)
  ends_at: string | null;
  location: string | null;
};

export type ProcessCaptureResult = {
  capture_id: string;
  clean_text: string;
  title: string;
  summary: string;
  event: CaptureEvent | null;
};

/** process-capture 호출 입력. */
export type ProcessCaptureInput = {
  ocrText: string;
  sourcePlatform: 'ios' | 'android';
  imageUrl?: string;
  captureId?: string;
};

/** 캡처 파이프라인 단계. */
export type CaptureStage =
  | 'idle'
  | 'uploading' // 이미지 Storage 업로드 중
  | 'ocr' // 온디바이스 OCR 중
  | 'processing' // process-capture(GPT) 호출 중
  | 'done'
  | 'error';

/** 진행 중/완료된 단일 캡처의 로컬 상태. */
export type CaptureDraft = {
  id: string; // 로컬 생성 id
  sourcePlatform: 'ios' | 'android';
  imageUri: string; // 미리보기용 로컬 uri
  stage: CaptureStage;
  storagePath?: string; // 업로드된 Storage 경로
  ocrText?: string;
  result?: ProcessCaptureResult;
  error?: string;
};

// ── 에이전트 간 인터페이스 계약 (구현은 각 에이전트) ──────────────────────────

/** W3-A 인증: src/stores/auth-store.ts 가 노출해야 하는 형태. */
export type AuthStatus = 'loading' | 'authenticated' | 'error';
export type AuthState = {
  status: AuthStatus;
  userId: string | null;
  accessToken: string | null;
  error?: string;
  /** 세션 없으면 익명 로그인으로 보장. 멱등. */
  ensureSession: () => Promise<void>;
};

/** W3-B 스토리지: src/lib/storage.ts */
export type UploadCaptureImageArgs = {
  uri: string; // 로컬 이미지 uri (content:// 또는 file://)
  userId: string;
  captureId: string;
};
export type UploadCaptureImageResult = {
  path: string; // captures-raw/{userId}/{captureId}.jpg
};
