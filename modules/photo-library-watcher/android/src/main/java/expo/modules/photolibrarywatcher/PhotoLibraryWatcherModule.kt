package expo.modules.photolibrarywatcher

import android.content.ContentResolver
import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// 스크린샷 자동 감지 모듈 (Android).
// MediaStore.Images를 ContentObserver로 감시하고, Screenshots 경로/이름으로 필터링한다.
// lastSeenId 캐시로 ContentObserver의 과다 트리거(초당 수십회)를 방지한다.
class PhotoLibraryWatcherModule : Module() {
  private var observer: ContentObserver? = null
  private var lastSeenId: Long = 0L

  // 캐치업 1회당 회수 상한. 리스너 부재 동안 쌓일 수 있는 현실적 최대치보다 넉넉하게.
  private val catchUpLimit = 20

  // checkNow(캐치업) 전용 마커. lastSeenId와 분리한 이유: 옵저버가 백그라운드에서
  // 발화하며 lastSeenId를 마킹한 직후 프로세스가 동결되면 JS 전달이 유실되는데,
  // 같은 마커를 쓰면 복귀 후 checkNow가 "이미 본 항목"으로 건너뛴다. checkNow는
  // 자체 마커로 1회 재발화하고, 중복 전달은 JS(processedIds)가 걸러낸다.
  private var lastCheckNowId: Long = 0L

  // 모듈 생성 시각(초). checkNow는 이 이후 추가된 항목만 회수한다(과거 재발화 방지).
  private val startTimeSec: Long = System.currentTimeMillis() / 1000L

  // stopWatching 이후 재시작인지(재시작 시 꺼져 있던 동안의 항목을 캐치업에서 제외).
  private var stoppedByUser = false

  override fun definition() = ModuleDefinition {
    Name("PhotoLibraryWatcher")
    Events("onScreenshot")

    OnCreate {
      val ctx = appContext.reactContext ?: return@OnCreate

      // 기준점만 잡는다: 모듈 생성 시점의 최신 이미지 id. 이 이전 항목은 "과거"로 보고
      // 발화하지 않는다(checkNow가 앱 시작 때마다 옛 스크린샷을 재발화하는 것을 방지).
      //
      // why 옵저버 미등록: 여기서 옵저버를 등록하면 JS 번들 로딩 중 찍힌 스크린샷이
      // "리스너 없는 이벤트"로 발화되며 lastSeenId만 갱신돼, 이후 checkNow가 회수하지
      // 못한다(본 것으로 오인). 옵저버는 JS가 준비된 뒤 startWatching()에서 등록한다.
      try {
        initLastSeen(ctx.contentResolver)
      } catch (e: Exception) {
        Log.e("PhotoLibraryWatcher", "initLastSeen 실패", e)
      }
    }

    // JS 리스너 등록 후 호출 — 이 시점부터 라이브 감지를 시작한다(멱등).
    Function("startWatching") {
      val resolver = appContext.reactContext?.contentResolver
      if (resolver != null && observer == null) {
        // 기준점 재설정: OnCreate 시점엔 사진 권한이 없었을 수 있어(첫 실행 — 온보딩 후
        // 권한 허용) 기준점이 0이면 첫 MediaStore 변경에 옛 스크린샷을 발화한다.
        try {
          initLastSeen(resolver)
        } catch (e: Exception) {
          Log.e("PhotoLibraryWatcher", "initLastSeen 실패", e)
        }
        // 사용자가 껐다 켠 경우: 꺼져 있던 동안의 스크린샷은 캐치업으로도 회수하지 않는다.
        if (stoppedByUser) {
          lastCheckNowId = maxOf(lastCheckNowId, lastSeenId)
          stoppedByUser = false
        }
        val obs = object : ContentObserver(Handler(Looper.getMainLooper())) {
          override fun onChange(selfChange: Boolean, uri: Uri?) {
            super.onChange(selfChange, uri)
            // 옵저버 콜백에서 예외가 나도 앱이 죽지 않도록 방어한다.
            try {
              queryLatestScreenshot(resolver)
            } catch (e: Exception) {
              Log.e("PhotoLibraryWatcher", "onChange query 실패", e)
            }
          }
        }
        observer = obs
        resolver.registerContentObserver(
          MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, obs
        )
      }

      // 백그라운드(동결) 감지용 잡 등록 + 질문 기준점 동기화.
      // 인프로세스 옵저버는 동결 중 콜백을 받지 못하므로(freezer), MediaStore 변경 시
      // OS가 깨워주는 TriggerContentUri 잡이 질문 알림을 담당한다(중복은 잡의
      // 포그라운드-skip과 lastAsked 기준점으로 방지).
      // 기준점은 전진만 한다(resetBaseline이 max 처리) — 앱 복귀마다 불려도 이미 물은
      // 항목을 다시 묻지 않는다. 순서: JS는 startWatching → checkNow 순으로 부르며, 이
      // 기준점은 잡(질문 알림) 전용이라 checkNow 캐치업 마커(lastCheckNowId)와 독립이다.
      appContext.reactContext?.let { ctx ->
        ScreenshotAskJobService.resetBaseline(ctx, lastSeenId)
        ScreenshotAskJobService.enable(ctx)
      }
      null
    }

    // 캐치업: JS 리스너 등록 직후 호출해 "JS 번들 로딩 중에 찍힌" 스크린샷을 회수한다.
    // (네이티브 이벤트는 리스너가 없으면 유실되므로, 구독 후 최신 1건을 재확인한다.
    //  lastSeenId 기준점·중복 가드가 있어 과거 항목이나 중복은 발화하지 않는다.)
    Function("checkNow") {
      // Expo Function 람다는 Any? 반환을 요구한다 — 마지막 식으로 null을 돌려준다.
      val resolver = appContext.reactContext?.contentResolver
      if (resolver != null) {
        try {
          queryForCatchUp(resolver)
        } catch (e: Exception) {
          Log.e("PhotoLibraryWatcher", "checkNow query 실패", e)
        }
      }
      null
    }

    // 외부 경로(헤드리스 [저장] 등)가 항목을 처리했음을 알린다 — 옵저버/캐치업이
    // 같은 항목을 다시 발화해 중복 저장하는 것을 막는다(마커 전진).
    Function("markHandled") { mediaId: Double ->
      val id = mediaId.toLong()
      if (id > lastSeenId) lastSeenId = id
      if (id > lastCheckNowId) lastCheckNowId = id
      null
    }

    // 감지 중지(설정 OFF·권한 회수): 옵저버 해제 + 백그라운드 잡 취소 + 질문 알림 제거.
    // why 플래그도 내림: 이미 OS 큐에 들어간 잡 실행이나 다음 프로세스 기동 전 트리거가
    // 와도 잡이 SharedPreferences를 보고 스스로 멈추게 한다(설정 OFF인데 알림이 뜨던 버그).
    Function("stopWatching") {
      unregisterObserver()
      stoppedByUser = true
      appContext.reactContext?.let { ScreenshotAskJobService.disable(it) }
      null
    }

    // 딥링크(memsum://?autoSaveUri=...&autoSaveToken=...) 검증 — 질문 알림이 만든
    // 1회용 토큰과 일치할 때만 true(일치하면 즉시 폐기). 외부 앱이 임의 사진 uri로
    // 딥링크를 쏴 업로드시키는 것을 막는다.
    Function("consumeAskToken") { token: String ->
      val ctx = appContext.reactContext
      ctx != null && ScreenshotAskJobService.consumeToken(ctx, token)
    }

    OnDestroy {
      // 옵저버 해제 필수 (메모리 누수 방지). 잡은 남긴다 — 앱 종료 후에도 질문 알림을
      // 띄우는 것이 잡의 역할이고, 끄는 것은 stopWatching(사용자 설정)만 담당한다.
      unregisterObserver()
    }
  }

  // 모듈 생성 시점의 최신 이미지 _ID를 기준점(lastSeenId)으로 잡는다(발화 없음).
  // 이후 옵저버/checkNow는 이 기준점과 다른 새 항목만 발화한다.
  private fun initLastSeen(resolver: ContentResolver) {
    MediaStoreQuery.latest(resolver, 1).firstOrNull()?.let { lastSeenId = it.id }
  }

  // 캐치업 조회(checkNow 전용): 리스너 부재 동안(JS 로딩·백그라운드 동결·서스펜드)
  // 쌓인 스크린샷을 전부 회수한다. lastSeenId(옵저버 마커)와 독립적으로 동작해,
  // 옵저버 발화 직후 동결로 JS 전달이 유실된 항목도 복귀 시 회수된다.
  // (옵저버가 정상 전달한 항목을 한 번 더 보낼 수 있으나 JS processedIds가 걸러낸다.)
  //
  // why 멀티 회수: 연속 캡처 후 복귀 시 LIMIT 1이면 마지막 1장만 처리되고 나머지는
  // 마커 전진으로 영구 유실된다(데모 시드 5건 중 1건만 저장되는 실측으로 확인).
  // 최신 catchUpLimit건 안에서 마커(lastCheckNowId)·시작시각 이후 스크린샷을
  // 오래된 순으로 모두 발화한다(상한 초과분은 과거 오발화 방지와의 트레이드오프).
  private fun queryForCatchUp(resolver: ContentResolver) {
    // 질문 알림에서 사용자가 이미 결정([무시]/[저장])한 항목 이하는 다시 보내지 않는다.
    val decidedMax = decidedMaxId()
    val items = MediaStoreQuery.latest(resolver, catchUpLimit).filter {
      it.id > lastCheckNowId && it.id > decidedMax &&
        it.dateAdded >= startTimeSec && it.isScreenshot
    }
    if (items.isEmpty()) return

    // 오래된 순으로 발화해 캡처 순서대로 처리되게 한다. 마커는 가장 새 항목까지 전진
    // (옵저버의 후속 중복 발화도 줄인다 — JS 중복 가드가 있지만 이벤트 수 자체를 절약).
    for (item in items.sortedBy { it.id }) {
      if (item.id > lastCheckNowId) lastCheckNowId = item.id
      if (item.id > lastSeenId) lastSeenId = item.id
      emit(item)
    }
  }

  // 최신 이미지 1건을 조회해 스크린샷이면 onScreenshot 이벤트를 보낸다.
  private fun queryLatestScreenshot(resolver: ContentResolver) {
    val item = MediaStoreQuery.latest(resolver, 1).firstOrNull() ?: return
    // 동일 항목 중복 발화 방지.
    if (item.id == lastSeenId) return
    if (!item.isScreenshot) return
    lastSeenId = item.id
    // 동결 해제 직후 밀린 onChange가 사용자가 [무시]한 항목을 다시 보낼 수 있다.
    if (item.id <= decidedMaxId()) return
    emit(item)
  }

  private fun decidedMaxId(): Long =
    appContext.reactContext?.let { ScreenshotAskJobService.decidedMaxId(it) } ?: 0L

  private fun emit(item: MediaItem) {
    sendEvent(
      "onScreenshot",
      mapOf(
        "uri" to item.contentUri,
        "displayName" to item.name,
        "createdAt" to item.dateAdded
      )
    )
  }

  private fun unregisterObserver() {
    observer?.let {
      appContext.reactContext?.contentResolver?.unregisterContentObserver(it)
    }
    observer = null
  }
}
