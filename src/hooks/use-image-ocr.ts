import { useCallback, useState } from 'react';
import { Asset } from 'expo-asset';

import { recognizeText } from '../../modules/vision-ocr';

export type ImageOcrStatus = 'idle' | 'pending' | 'done' | 'error';

export type ImageOcrState = {
  status: ImageOcrStatus;
  text?: string;
  error?: string;
};

// 번들된 샘플 이미지. require는 Metro asset 핸들을 반환한다(Asset.fromModule 입력).
const SAMPLE_KO = require('../../assets/ocr-test/sample-ko.png');

const INITIAL_STATE: ImageOcrState = { status: 'idle' };

/**
 * 번들 샘플 이미지(sample-ko.png) OCR 테스트 훅.
 *
 * 스크린샷 워처가 뜨지 않는 시뮬레이터에서도 OCR을 결정적으로 검증하기 위함이다.
 * expo-asset으로 번들 모듈을 file:// 경로(localUri)로 내려받은 뒤 recognizeText({ uri })에 넘긴다.
 */
export function useImageOcr(): { state: ImageOcrState; run: () => Promise<void> } {
  const [state, setState] = useState<ImageOcrState>(INITIAL_STATE);

  const run = useCallback(async (): Promise<void> => {
    setState({ status: 'pending' });
    try {
      const asset = Asset.fromModule(SAMPLE_KO);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) {
        throw new Error('샘플 이미지 경로를 확인할 수 없습니다.');
      }
      const result = await recognizeText({ uri });
      console.log('[OCR] 샘플 이미지:', result.text);
      setState({ status: 'done', text: result.text });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[OCR] 샘플 이미지 실패:', message);
      setState({ status: 'error', error: message });
    }
  }, []);

  return { state, run };
}
