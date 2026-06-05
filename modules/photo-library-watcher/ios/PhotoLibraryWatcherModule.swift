import ExpoModulesCore
import Photos

// 스크린샷 자동 감지 모듈 (iOS).
//
// Expo의 `Module` 클래스는 NSObject를 상속하지 않는다. 반면
// `PHPhotoLibraryChangeObserver`는 NSObjectProtocol 기반(Objective-C 프로토콜)이라
// Module 서브클래스가 직접 conform 할 수 없다(Swift 컴파일 에러).
// 따라서 옵저버를 별도 NSObject 서브클래스(ScreenshotChangeObserver)로 분리하고
// 모듈이 이를 보유·등록·해제한다.
public class PhotoLibraryWatcherModule: Module {
  private var observer: ScreenshotChangeObserver?

  public func definition() -> ModuleDefinition {
    Name("PhotoLibraryWatcher")
    Events("onScreenshot")

    OnCreate {
      self.requestAuthorization { granted in
        guard granted else { return }
        self.startObserving()
      }
    }

    OnDestroy {
      // 옵저버 해제 필수 (메모리 누수 방지).
      if let observer = self.observer {
        PHPhotoLibrary.shared().unregisterChangeObserver(observer)
      }
      self.observer = nil
    }
  }

  // 권한 요청은 별도 함수로 분리.
  private func requestAuthorization(_ completion: @escaping (Bool) -> Void) {
    PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
      completion(status == .authorized || status == .limited)
    }
  }

  // 스크린샷 서브타입 predicate로 초기 fetch 후 라이브러리 변경 구독을 시작한다.
  private func startObserving() {
    let options = PHFetchOptions()
    options.predicate = NSPredicate(
      format: "(mediaSubtype & %d) != 0",
      PHAssetMediaSubtype.photoScreenshot.rawValue
    )
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    let initialFetch = PHAsset.fetchAssets(with: .image, options: options)

    let observer = ScreenshotChangeObserver(initialFetch: initialFetch) { [weak self] payloads in
      // PhotoKit 콜백은 임의 큐에서 온다. 이벤트 전송은 메인 큐로 보낸다.
      DispatchQueue.main.async {
        for payload in payloads {
          self?.sendEvent("onScreenshot", payload)
        }
      }
    }
    self.observer = observer
    PHPhotoLibrary.shared().register(observer)
  }
}

// PHPhotoLibraryChangeObserver는 NSObjectProtocol 기반이므로 NSObject를 상속한
// 별도 클래스로 구현한다. 새로 추가된 스크린샷만 필터해 콜백으로 넘긴다.
final class ScreenshotChangeObserver: NSObject, PHPhotoLibraryChangeObserver {
  // 직전 fetch 결과를 보관해 changeDetails 비교 기준으로 사용한다.
  private var lastFetchResult: PHFetchResult<PHAsset>
  private let onScreenshots: ([[String: Any]]) -> Void

  init(
    initialFetch: PHFetchResult<PHAsset>,
    onScreenshots: @escaping ([[String: Any]]) -> Void
  ) {
    self.lastFetchResult = initialFetch
    self.onScreenshots = onScreenshots
    super.init()
  }

  func photoLibraryDidChange(_ changeInstance: PHChange) {
    guard let changes = changeInstance.changeDetails(for: lastFetchResult) else { return }
    lastFetchResult = changes.fetchResultAfterChanges

    let payloads: [[String: Any]] = changes.insertedObjects
      .filter { $0.mediaSubtypes.contains(.photoScreenshot) }
      .map { asset in
        [
          "assetId": asset.localIdentifier,
          "createdAt": asset.creationDate?.timeIntervalSince1970 ?? 0,
        ]
      }

    guard !payloads.isEmpty else { return }
    onScreenshots(payloads)
  }
}
