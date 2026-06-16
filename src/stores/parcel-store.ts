import { create } from 'zustand';

import type { ParcelTrack } from '@/features/parcel/types';
import { ParcelNotConfiguredError, listParcelTracks } from '@/lib/parcel-api';

/**
 * 택배 추적 목록 store — 홈 섹션·상세·폴링 훅이 공유하는 단일 진실.
 *
 * listParcelTracks(중단 제외, 완료 포함)를 기반으로 한다. 화면별로 따로 조회하면
 * 폴링 결과·수동 새로고침 결과가 화면 간 어긋나므로, 한 곳에 모아 구독하게 한다.
 * Edge Function 키 미설정(ParcelNotConfiguredError)은 조용히 비활성으로 처리한다.
 */
type ParcelStore = {
  /** 활성/최근(완료 포함, 중단 제외) 추적 목록. created_at desc. */
  tracks: ParcelTrack[];
  /** 최초 로드 진행 여부(빈 상태 깜빡임 방지용). */
  isLoading: boolean;
  /** 키 미설정 등으로 기능이 비활성인지(조용한 안내). */
  notConfigured: boolean;
  /** 목록을 다시 불러온다. 실패해도 throw하지 않고 빈 목록을 유지한다. */
  refresh: () => Promise<void>;
  /** 단일 행을 불변 교체(폴링/수동 새로고침 결과 반영). null이면 무동작. */
  upsert: (track: ParcelTrack | null) => void;
  /** id로 행 제거(추적 삭제 후). */
  remove: (id: string) => void;
};

export const useParcelStore = create<ParcelStore>((set, get) => ({
  tracks: [],
  isLoading: false,
  notConfigured: false,

  refresh: async (): Promise<void> => {
    set({ isLoading: true });
    try {
      const tracks = await listParcelTracks();
      set({ tracks, isLoading: false, notConfigured: false });
    } catch (error) {
      if (error instanceof ParcelNotConfiguredError) {
        set({ tracks: [], isLoading: false, notConfigured: true });
        return;
      }
      console.error('[parcel-store] 목록 새로고침 실패:', error);
      set({ isLoading: false });
    }
  },

  upsert: (track: ParcelTrack | null): void => {
    if (!track) return;
    const tracks = get().tracks;
    const index = tracks.findIndex((t) => t.id === track.id);
    // 불변 교체: 존재하면 해당 위치만 교체, 없으면 앞에 추가.
    const next =
      index >= 0
        ? tracks.map((t) => (t.id === track.id ? track : t))
        : [track, ...tracks];
    set({ tracks: next });
  },

  remove: (id: string): void => {
    set({ tracks: get().tracks.filter((t) => t.id !== id) });
  },
}));
