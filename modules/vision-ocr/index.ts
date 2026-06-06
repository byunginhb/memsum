import { requireNativeModule } from 'expo';

// OCR 결과 (공유 계약).
// iOS: Vision VNRecognizeTextRequest, Android: ML Kit Korean TextRecognition.
export type OcrResult = {
  /** 인식된 전체 텍스트 (줄바꿈 포함). */
  text: string;
  /** 0~1 평균 신뢰도. 플랫폼이 제공하지 않으면 생략. */
  confidence?: number;
};

declare class VisionOcrModule {
  /** iOS: PHAsset localIdentifier 로 이미지 로드 후 OCR. */
  recognizeTextFromAsset(assetId: string): Promise<OcrResult>;
  /** Android: content:// 또는 file:// URI 로 이미지 로드 후 OCR. */
  recognizeTextFromUri(uri: string): Promise<OcrResult>;
}

const Native = requireNativeModule<VisionOcrModule>('VisionOcr');

/**
 * 스크린샷 식별자로 OCR 수행. 플랫폼에 맞는 네이티브 메서드로 위임한다.
 * - iOS: assetId(PHAsset localIdentifier)
 * - Android: uri(content:// 또는 file://)
 */
export async function recognizeText(source: {
  assetId?: string;
  uri?: string;
}): Promise<OcrResult> {
  if (source.assetId) {
    return Native.recognizeTextFromAsset(source.assetId);
  }
  if (source.uri) {
    return Native.recognizeTextFromUri(source.uri);
  }
  throw new Error('recognizeText: assetId 또는 uri 중 하나가 필요합니다.');
}

export default Native;
