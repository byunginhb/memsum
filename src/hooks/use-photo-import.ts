import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AnalyticsEvent, track } from '@/lib/analytics';
import { useCaptureStore } from '@/stores/capture-store';

/**
 * 사진첩 반입 캡처 훅 — 하단바 캡처+ 버튼과 홈 빈 상태 CTA가 공유한다.
 *
 * 시스템 사진 선택기(PHPicker/Photo Picker)에서 이미지를 고르면 캡처 파이프라인
 * (업로드→OCR→GPT→저장)을 시작하고 확인 Sheet를 연다. 자동 감지가 놓친 옛
 * 스크린샷·일반 사진을 수동으로 정리하는 경로다.
 *
 * why 시스템 선택기: 미디어 권한 없이 동작하고(OS가 선택 항목만 넘겨줌),
 * 실제 file:// 사본 uri를 받아 release 빌드에서도 업로드·OCR이 안전하다
 * (구 샘플 캡처는 번들 리소스 이름이라 release에서 압축 실패 — 교체 사유).
 */
export function usePhotoImport(): { onImport: () => void; isImporting: boolean } {
  const startCapture = useCaptureStore((state) => state.startCapture);
  const [isImporting, setIsImporting] = useState(false);
  // 언마운트 후 setState 경고 방지.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onImport = useCallback((): void => {
    void (async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
        });
        if (result.canceled || result.assets.length === 0) return;
        const uri = result.assets[0]?.uri;
        if (!uri) return;

        if (mounted.current) setIsImporting(true);
        // OCR·업로드 모두 선택기가 내려준 로컬 사본 uri 경로를 쓴다(iOS 포함).
        const sourcePlatform = Platform.OS === 'ios' ? 'ios' : 'android';
        // 분석(비차단): 수동 반입 시작 — 자동 감지가 놓친 옛 스크린샷 정리 경로 사용량.
        track(AnalyticsEvent.PhotoImported, { source: sourcePlatform });
        await startCapture({ imageUri: uri, sourcePlatform, uri });
      } catch (error) {
        console.error('[capture] 사진 반입 실패:', error);
      } finally {
        if (mounted.current) setIsImporting(false);
      }
    })();
  }, [startCapture]);

  return { onImport, isImporting };
}
