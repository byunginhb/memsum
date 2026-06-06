import ExpoModulesCore
import Vision
import Photos

// 온디바이스 한국어·영어 OCR 모듈 (iOS, Apple Vision Framework).
//
// 메인 경로는 PHAsset(스크린샷 localIdentifier) 입력이지만, 계약(index.ts)상
// file:// URI 입력도 함께 지원한다. PHImageManager의 이미지 요청은 비동기 콜백을
// 줄 수 있으므로 Expo의 `Promise` 파라미터로 결과를 넘겨 누수 없이 해소한다.
public class VisionOcrModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VisionOcr")

    // iOS: PHAsset localIdentifier 로 원본 이미지를 로드한 뒤 OCR.
    AsyncFunction("recognizeTextFromAsset") { (assetId: String, promise: Promise) in
      self.loadCGImage(fromAssetId: assetId) { result in
        switch result {
        case .success(let cgImage):
          do {
            promise.resolve(try self.recognize(cgImage: cgImage))
          } catch {
            promise.reject(error as? Exception ?? RecognitionFailedException())
          }
        case .failure(let exception):
          promise.reject(exception)
        }
      }
    }

    // file:// 또는 일반 파일 경로 URI 로 이미지를 로드한 뒤 OCR.
    AsyncFunction("recognizeTextFromUri") { (uri: String) -> [String: Any] in
      let cgImage = try self.loadCGImage(fromUri: uri)
      return try self.recognize(cgImage: cgImage)
    }
  }

  // MARK: - 이미지 로드

  // PHAsset → 최대 해상도 CGImage. 텍스트 선명도를 위해 원본 크기를 요청한다.
  // deliveryMode .highQualityFormat 은 저품질 중간 콜백 없이 최종 이미지 1회만 전달한다.
  private func loadCGImage(
    fromAssetId assetId: String,
    completion: @escaping (Result<CGImage, Exception>) -> Void
  ) {
    let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [assetId], options: nil)
    guard let asset = fetchResult.firstObject else {
      completion(.failure(AssetNotFoundException()))
      return
    }

    let options = PHImageRequestOptions()
    options.deliveryMode = .highQualityFormat
    options.resizeMode = .none
    options.isNetworkAccessAllowed = true
    options.isSynchronous = false

    PHImageManager.default().requestImage(
      for: asset,
      targetSize: PHImageManagerMaximumSize,
      contentMode: .aspectFit,
      options: options
    ) { image, _ in
      guard let cgImage = image?.cgImage else {
        completion(.failure(ImageLoadFailedException()))
        return
      }
      completion(.success(cgImage))
    }
  }

  // file:// 또는 일반 파일 경로 → CGImage.
  private func loadCGImage(fromUri uri: String) throws -> CGImage {
    let path = URL(string: uri)?.isFileURL == true
      ? URL(string: uri)!.path
      : uri
    guard let image = UIImage(contentsOfFile: path), let cgImage = image.cgImage else {
      throw ImageLoadFailedException()
    }
    return cgImage
  }

  // MARK: - OCR

  // 공통 OCR 로직. ko-KR·en-US, accurate, 언어 교정 사용.
  // topCandidates(1) 의 문자열을 줄바꿈으로 join 하고 평균 confidence 를 반환한다.
  private func recognize(cgImage: CGImage) throws -> [String: Any] {
    let request = VNRecognizeTextRequest()
    request.recognitionLanguages = ["ko-KR", "en-US"]
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
      try handler.perform([request])
    } catch {
      throw RecognitionFailedException()
    }

    let observations = request.results ?? []
    let candidates = observations.compactMap { $0.topCandidates(1).first }
    let text = candidates.map { $0.string }.joined(separator: "\n")
    let confidence = candidates.isEmpty
      ? 0
      : candidates.reduce(0) { $0 + Float($1.confidence) } / Float(candidates.count)

    return ["text": text, "confidence": Double(confidence)]
  }
}

// JS 로 전달되는 명확한 에러들. async 콜백 누수 없이 reject/throw 에 사용한다.
final class AssetNotFoundException: Exception {
  override var reason: String {
    "주어진 식별자에 해당하는 에셋을 찾을 수 없습니다."
  }
}

final class ImageLoadFailedException: Exception {
  override var reason: String {
    "이미지를 로드하지 못했습니다."
  }
}

final class RecognitionFailedException: Exception {
  override var reason: String {
    "Vision 텍스트 인식에 실패했습니다."
  }
}
