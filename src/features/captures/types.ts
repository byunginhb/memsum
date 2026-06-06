// 캡처 리스트·검색·상세 공유 계약 (Week 4).
// 데이터 레이어(W4-A)·홈 리스트(W4-B)·검색/상세(W4-C)가 단일 진실로 사용한다.

import type { CaptureEvent } from '@/features/capture/types';

/**
 * 화면 표시용 캡처 항목.
 * captures 테이블 row를 UI가 바로 소비할 수 있는 형태로 정규화한 것.
 * (image_url 경로 → 썸네일 서명 URL은 데이터 레이어가 채운다.)
 */
export type CaptureListItem = {
  /** captures.id (서버 uuid). 상세 화면 라우팅 키. */
  id: string;
  /** parsed_event.title (없으면 ocr_text 첫 줄 폴백). */
  title: string;
  /** parsed_event.summary. 없을 수 있음. */
  summary: string;
  /** OCR 전체 텍스트(상세·검색 하이라이트용). */
  ocrText: string;
  /** 캡처 생성 시각(ISO8601). */
  createdAt: string;
  /** 비공개 버킷 썸네일 서명 URL(만료). 로드 실패/미생성 시 null. */
  thumbnailUrl: string | null;
  /** captures.image_url 의 버킷-상대 경로({uid}/{capId}.jpg). */
  imagePath: string | null;
  /** 이벤트 감지 여부(배지 표시용). */
  hasEvent: boolean;
  /** 감지된 이벤트(있으면). */
  event: CaptureEvent | null;
  /** 'pending' | 'ocr_done' | 'calendar_added' | 'failed'. */
  status: string;
};

/** 목록 페이지네이션 결과. */
export type CaptureListPage = {
  items: CaptureListItem[];
  /** 다음 페이지 커서(마지막 created_at). 없으면 끝. */
  nextCursor: string | null;
};

// ── 데이터 레이어 계약 (W4-A: src/lib/captures.ts) ────────────────────────────
export type ListCapturesArgs = {
  /** created_at desc 커서(이 값보다 과거). */
  cursor?: string | null;
  limit?: number;
};
export type SearchCapturesArgs = {
  query: string;
  limit?: number;
};

// ── CaptureCard 계약 (W4-B 소유, W4-C 재사용) ─────────────────────────────────
export type CaptureCardProps = {
  item: CaptureListItem;
  /** 탭 시 상세로 이동(라우팅은 상위에서). */
  onPress: (id: string) => void;
};
