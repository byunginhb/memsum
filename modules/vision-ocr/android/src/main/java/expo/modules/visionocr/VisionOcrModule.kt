package expo.modules.visionocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.Text
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.korean.KoreanTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 온디바이스 OCR 모듈 (Android).
// ML Kit Text Recognition v2 한국어 인식기를 사용한다. 한국어 모델은 라틴 문자도
// 함께 인식하므로 영어까지 커버된다. content:// 와 file:// URI 모두 지원한다.
// iOS 측 Vision 구현과 동일한 OcrResult({ text, confidence? }) 계약을 따른다.
class VisionOcrModule : Module() {
  // 인식기는 모델 로드 비용이 크므로 모듈 수명 동안 1개만 유지하고
  // OnDestroy에서 close()한다(매 호출 생성/닫기 시 모델 재로드 오버헤드 발생).
  private val recognizer: TextRecognizer by lazy {
    TextRecognition.getClient(KoreanTextRecognizerOptions.Builder().build())
  }

  override fun definition() = ModuleDefinition {
    Name("VisionOcr")

    // Android에는 assetId 개념이 약하므로 동일한 URI 기반 경로로 처리한다.
    AsyncFunction("recognizeTextFromAsset") { assetId: String, promise: Promise ->
      recognize(assetId, promise)
    }

    AsyncFunction("recognizeTextFromUri") { uri: String, promise: Promise ->
      recognize(uri, promise)
    }

    OnDestroy {
      // 인식기 해제 필수 (네이티브 리소스 누수 방지).
      recognizer.close()
    }
  }

  // content:// 또는 file:// URI 로 이미지를 로드해 OCR을 수행한다.
  // 비동기 결과는 ML Kit 리스너에서 promise로 전달한다.
  private fun recognize(uri: String, promise: Promise) {
    val context = appContext.reactContext ?: run {
      promise.reject("OCR_ERROR", "reactContext 가 없습니다.", null)
      return
    }

    val image = try {
      InputImage.fromFilePath(context, Uri.parse(uri))
    } catch (e: Exception) {
      // 이미지 로드 실패(잘못된 URI/권한 없음/파일 없음 등).
      promise.reject("OCR_ERROR", "이미지 로드 실패: ${e.message}", e)
      return
    }

    recognizer.process(image)
      .addOnSuccessListener { visionText ->
        // ML Kit은 라인 단위 confidence를 제공하지 않으므로 omit한다.
        promise.resolve(
          mapOf("text" to visionText.text, "lines" to normalizedLines(visionText, image))
        )
      }
      .addOnFailureListener { e ->
        promise.reject("OCR_ERROR", "텍스트 인식 실패: ${e.message}", e)
      }
  }

  // 줄 단위 위치를 이미지 크기로 나눠 0~1로 정규화한다(좌상단 원점 — iOS와 같은 계약).
  // why 정규화: JS는 원본 해상도를 모른 채 미리보기 크기에 맞춰 그리므로 비율이어야 한다.
  private fun normalizedLines(visionText: Text, image: InputImage): List<Map<String, Any>> {
    val w = image.width.toDouble()
    val h = image.height.toDouble()
    if (w <= 0.0 || h <= 0.0) return emptyList()
    return visionText.textBlocks.flatMap { it.lines }.mapNotNull { line ->
      val box = line.boundingBox ?: return@mapNotNull null
      val x = (box.left / w).coerceIn(0.0, 1.0)
      val y = (box.top / h).coerceIn(0.0, 1.0)
      mapOf(
        "text" to line.text,
        "x" to x,
        "y" to y,
        "width" to (box.right / w).coerceIn(0.0, 1.0) - x,
        "height" to (box.bottom / h).coerceIn(0.0, 1.0) - y
      )
    }
  }
}
