// 웹 미리보기(개발 전용) 예시 데이터 계약.
// 실제 데이터는 preview.web.ts에만 있고, 네이티브·출시 번들은 preview.ts(null)만 포함한다.

import type { CaptureListItem } from '@/features/captures/types';
import type { CategoryGroup } from '@/features/home/types';
import type { ParcelTrack } from '@/features/parcel/types';
import type { WeeklyReport } from '@/features/report/types';
import type { CaptureDraftWithBoxes } from '@/stores/capture-store';

export type PreviewSource = {
  /** 최신순 캡처 전체. 목록·검색·상세가 여기서 고른다. */
  captures: readonly CaptureListItem[];
  categoryGroups: readonly CategoryGroup[];
  /** 이번 주 캡처 수(홈 머리표). 최근 목록보다 많을 수 있다(오래된 것은 예시에서 생략). */
  weekCount: number;
  report: WeeklyReport;
  parcels: readonly ParcelTrack[];
  /** 연결된 것처럼 보일 구글 계정. null이면 미연결(`?calendar=0`). */
  calendarEmail: string | null;
  /** `?sheet=` 로 고른 캡처 시트 상태. 없으면 null. */
  sheetDraft: CaptureDraftWithBoxes | null;
  /** `?aha=` 로 고른 온보딩 체험 스텝 상태(scan·result·error). 없으면 null. */
  ahaDraft: CaptureDraftWithBoxes | null;
};
