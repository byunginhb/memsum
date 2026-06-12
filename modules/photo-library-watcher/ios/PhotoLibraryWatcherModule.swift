import ExpoModulesCore
import Photos

// 스크린샷 자동 감지 모듈 (iOS).
//
// Expo의 `Module` 클래스는 NSObject를 상속하지 않는다. 반면
// `PHPhotoLibraryChangeObserver`는 NSObjectProtocol 기반(Objective-C 프로토콜)이라
// Module 서브클래스가 직접 conform 할 수 없다(Swift 컴파일 에러).
// 따라서 옵저버를 별도 NSObject 서브클래스(ScreenshotChangeObserver)로 분리하고
// 모듈이 이를 보유·등록·해제한다.
//
// 이벤트 페이로드: { assetId, createdAt, uri? }
// - uri: 에셋 원본 데이터를 임시 파일로 내보낸 file:// 경로. JS 파이프라인이
//   업로드(Storage)에 사용한다. assetId만으로는 업로드가 불가능해(W3 storage 계약이
//   파일 uri 기반) 네이티브에서 내보낸다. 내보내기 실패 시 uri 없이 보내고
//   JS가 해당 이벤트를 건너뛴다(오탐 토스트 방지).
public class PhotoLibraryWatcherModule: Module {
  private var observer: ScreenshotChangeObserver?
  // 이미 이벤트로 보낸 에셋 id(중복 발화 방지 — 옵저버/checkNow 경로 공용).
  private var sentIds = Set<String>()
  // 모듈 생성 시각. checkNow 캐치업은 이 이후 생성된 에셋만 회수한다
  // (앱 시작 때마다 과거 스크린샷을 재발화하는 것을 방지).
  private let startDate = Date()
  // 사진 권한 결과. startWatching이 권한 확정 전에 불리면 보류했다가 권한 후 시작한다.
  private var authorized = false
  private var startRequested = false

  public func definition() -> ModuleDefinition {
    Name("PhotoLibraryWatcher")
    Events("onScreenshot")

    OnCreate {
      // 권한만 확보한다. 옵저버 등록은 JS가 준비된 뒤 startWatching()에서 —
      // JS 로딩 중 발화된 이벤트가 sentIds만 채우고 유실되는 것을 막는다(checkNow 회수 보장).
      self.requestAuthorization { granted in
        DispatchQueue.main.async {
          self.authorized = granted
          if granted && self.startRequested {
            self.startObservingIfNeeded()
          }
        }
      }
    }

    // JS 리스너 등록 후 호출 — 이 시점부터 라이브 감지를 시작한다(멱등).
    Function("startWatching") {
      DispatchQueue.main.async {
        self.startRequested = true
        if self.authorized {
          self.startObservingIfNeeded()
        }
      }
    }

    // 캐치업: JS 리스너 등록 직후·포그라운드 복귀 시 호출해, 리스너가 없던 동안
    // (JS 번들 로딩 중·앱 서스펜드 중) 추가된 스크린샷을 회수한다.
    Function("checkNow") {
      self.emitRecentAssets()
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

  // 감지 대상 predicate.
  // 실기기: 스크린샷 서브타입만. 시뮬레이터: 모든 새 이미지 —
  // 시뮬레이터의 Cmd+S 스크린샷은 호스트(맥)에 저장되어 사진 보관함에 들어오지 않으므로,
  // simctl addmedia/드래그로 추가한 일반 사진으로 파이프라인을 테스트할 수 있게 한다.
  private func eligibilityPredicate() -> NSPredicate? {
    #if targetEnvironment(simulator)
      return nil
    #else
      return NSPredicate(
        format: "(mediaSubtype & %d) != 0",
        PHAssetMediaSubtype.photoScreenshot.rawValue
      )
    #endif
  }

  // 초기 fetch 후 라이브러리 변경 구독을 시작한다(멱등 — 이미 시작했으면 무시).
  private func startObservingIfNeeded() {
    guard observer == nil else { return }
    startObserving()
  }

  // 초기 fetch 후 라이브러리 변경 구독을 시작한다.
  private func startObserving() {
    let options = PHFetchOptions()
    options.predicate = eligibilityPredicate()
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
    let initialFetch = PHAsset.fetchAssets(with: .image, options: options)

    let observer = ScreenshotChangeObserver(initialFetch: initialFetch) { [weak self] assets in
      // PhotoKit 콜백은 임의 큐에서 온다. 상태(sentIds) 접근·이벤트 전송은 메인 큐로 직렬화.
      DispatchQueue.main.async {
        self?.emitAssets(assets)
      }
    }
    self.observer = observer
    PHPhotoLibrary.shared().register(observer)
  }

  // startDate 이후 생성된 감지 대상 에셋을 조회해 미발화분만 발화한다(checkNow 경로).
  private func emitRecentAssets() {
    let options = PHFetchOptions()
    let datePredicate = NSPredicate(format: "creationDate > %@", startDate as NSDate)
    if let eligibility = eligibilityPredicate() {
      options.predicate = NSCompoundPredicate(andPredicateWithSubpredicates: [
        eligibility, datePredicate,
      ])
    } else {
      options.predicate = datePredicate
    }
    options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
    // 연속 캡처 후 복귀 시 일괄 회수 상한(Android catchUpLimit와 동일 기준).
    // sentIds 가드가 있어 반복 호출에도 중복 발화는 없다.
    options.fetchLimit = 20

    let fetch = PHAsset.fetchAssets(with: .image, options: options)
    var assets: [PHAsset] = []
    fetch.enumerateObjects { asset, _, _ in assets.append(asset) }

    DispatchQueue.main.async {
      self.emitAssets(assets)
    }
  }

  // 미발화 에셋만 임시 파일로 내보낸 뒤 onScreenshot 이벤트를 보낸다. 메인 큐에서 호출.
  private func emitAssets(_ assets: [PHAsset]) {
    for asset in assets {
      let id = asset.localIdentifier
      guard !sentIds.contains(id) else { continue }
      sentIds.insert(id)

      exportToTempFile(asset) { [weak self] uri in
        var payload: [String: Any] = [
          "assetId": id,
          "createdAt": asset.creationDate?.timeIntervalSince1970 ?? 0,
        ]
        if let uri {
          payload["uri"] = uri
        }
        DispatchQueue.main.async {
          self?.sendEvent("onScreenshot", payload)
        }
      }
    }
  }

  // 에셋 원본 데이터를 임시 파일로 내보낸다(업로드용 file:// uri). 실패 시 nil.
  private func exportToTempFile(_ asset: PHAsset, completion: @escaping (String?) -> Void) {
    let options = PHImageRequestOptions()
    options.isNetworkAccessAllowed = true
    options.deliveryMode = .highQualityFormat
    options.version = .current

    PHImageManager.default().requestImageDataAndOrientation(for: asset, options: options) {
      data, dataUTI, _, _ in
      guard let data else {
        completion(nil)
        return
      }
      do {
        let dir = FileManager.default.temporaryDirectory
          .appendingPathComponent("memsum-screenshots", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let ext = Self.fileExtension(for: dataUTI)
        let fileURL = dir.appendingPathComponent(UUID().uuidString + "." + ext)
        try data.write(to: fileURL)
        completion(fileURL.absoluteString)
      } catch {
        completion(nil)
      }
    }
  }

  // dataUTI → 파일 확장자(이미지 디코더가 포맷을 인식하도록). 미상이면 jpg.
  private static func fileExtension(for dataUTI: String?) -> String {
    guard let uti = dataUTI?.lowercased() else { return "jpg" }
    if uti.contains("png") { return "png" }
    if uti.contains("heic") || uti.contains("heif") { return "heic" }
    return "jpg"
  }
}

// PHPhotoLibraryChangeObserver는 NSObjectProtocol 기반이므로 NSObject를 상속한
// 별도 클래스로 구현한다. fetch 결과(감지 대상 predicate 적용됨)에 새로 삽입된
// 에셋만 콜백으로 넘긴다(서브타입 필터는 fetch predicate가 담당 — 시뮬레이터 완화 포함).
final class ScreenshotChangeObserver: NSObject, PHPhotoLibraryChangeObserver {
  // 직전 fetch 결과를 보관해 changeDetails 비교 기준으로 사용한다.
  private var lastFetchResult: PHFetchResult<PHAsset>
  private let onInserted: ([PHAsset]) -> Void

  init(
    initialFetch: PHFetchResult<PHAsset>,
    onInserted: @escaping ([PHAsset]) -> Void
  ) {
    self.lastFetchResult = initialFetch
    self.onInserted = onInserted
    super.init()
  }

  func photoLibraryDidChange(_ changeInstance: PHChange) {
    guard let changes = changeInstance.changeDetails(for: lastFetchResult) else { return }
    lastFetchResult = changes.fetchResultAfterChanges

    let inserted = changes.insertedObjects
    guard !inserted.isEmpty else { return }
    onInserted(inserted)
  }
}
