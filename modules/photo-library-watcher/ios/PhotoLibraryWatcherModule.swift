import ExpoModulesCore
import Photos

// 스크린샷 자동 감지 모듈 (iOS).
// PHPhotoLibraryChangeObserver로 사진 라이브러리 변경을 구독하고,
// 새로 추가된 에셋 중 스크린샷 서브타입만 필터해 RN으로 onScreenshot 이벤트를 보낸다.
public class PhotoLibraryWatcherModule: Module, PHPhotoLibraryChangeObserver {
  // 직전 fetch 결과를 보관해 changeDetails 비교 기준으로 사용한다.
  private var lastFetchResult: PHFetchResult<PHAsset>?

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
      PHPhotoLibrary.shared().unregisterChangeObserver(self)
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
    self.lastFetchResult = PHAsset.fetchAssets(with: .image, options: options)
    PHPhotoLibrary.shared().register(self)
  }

  public func photoLibraryDidChange(_ changeInstance: PHChange) {
    guard let last = lastFetchResult,
          let changes = changeInstance.changeDetails(for: last) else { return }
    self.lastFetchResult = changes.fetchResultAfterChanges

    for asset in changes.insertedObjects {
      guard asset.mediaSubtypes.contains(.photoScreenshot) else { continue }
      sendEvent("onScreenshot", [
        "assetId": asset.localIdentifier,
        "createdAt": asset.creationDate?.timeIntervalSince1970 ?? 0
      ])
    }
  }
}
