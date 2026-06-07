// src/features/report/types.ts
//
// Memsum — 주간 5줄 리포트(Hero Moment) 도메인 타입.
// Edge Function(weekly-report)의 snake_case 응답을 클라이언트 camelCase 계약으로
// 정규화한 형태다(lib/weekly-report.ts가 변환·서명 URL 채움 담당).

/** 리포트 항목에 대한 사용자 피드백. 미선택은 null. */
export type ReportFeedback = 'up' | 'down' | null;

/**
 * 리포트 5줄 중 한 항목.
 * imagePath는 captures-raw 버킷 상대 경로(서명 전), thumbnailUrl은 서명된 표시용 URL.
 * thumbnailUrl은 서명 실패·경로 없음 시 null(graceful — 화면은 placeholder 표시).
 */
export type WeeklyReportItem = {
  captureId: string;
  /** 1(=Hero) ~ 5. 1번이 가장 중요. */
  rank: number;
  title: string;
  summary: string;
  imagePath: string | null;
  thumbnailUrl: string | null;
  feedback: ReportFeedback;
};

/**
 * 한 주(weekStart ~ weekEnd, KST 날짜)의 주간 리포트.
 * items가 비어 있으면(캡처 < 5건) 화면은 빈 상태를 표시한다.
 */
export type WeeklyReport = {
  /** "YYYY-MM-DD" (KST 월요일). */
  weekStart: string;
  /** "YYYY-MM-DD" (KST 일요일). */
  weekEnd: string;
  /** 그 주 전체 캡처 수(서브타이틀 "{total}개 중" 표시용). */
  totalCaptures: number;
  items: WeeklyReportItem[];
};
