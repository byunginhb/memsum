package expo.modules.photolibrarywatcher

import android.content.ContentResolver
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.os.Bundle
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

  // checkNow(캐치업) 전용 마커. lastSeenId와 분리한 이유: 옵저버가 백그라운드에서
  // 발화하며 lastSeenId를 마킹한 직후 프로세스가 동결되면 JS 전달이 유실되는데,
  // 같은 마커를 쓰면 복귀 후 checkNow가 "이미 본 항목"으로 건너뛴다. checkNow는
  // 자체 마커로 1회 재발화하고, 중복 전달은 JS(processedIds)가 걸러낸다.
  private var lastCheckNowId: Long = 0L

  // 모듈 생성 시각(초). checkNow는 이 이후 추가된 항목만 회수한다(과거 재발화 방지).
  private val startTimeSec: Long = System.currentTimeMillis() / 1000L

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
      appContext.reactContext?.let { ctx ->
        ScreenshotAskJobService.resetBaseline(ctx, lastSeenId)
        ScreenshotAskJobService.schedule(ctx)
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

    OnDestroy {
      // 옵저버 해제 필수 (메모리 누수 방지).
      observer?.let {
        appContext.reactContext?.contentResolver?.unregisterContentObserver(it)
      }
      observer = null
    }
  }

  // 모듈 생성 시점의 최신 이미지 _ID를 기준점(lastSeenId)으로 잡는다(발화 없음).
  // 이후 옵저버/checkNow는 이 기준점과 다른 새 항목만 발화한다.
  private fun initLastSeen(resolver: ContentResolver) {
    val projection = arrayOf(MediaStore.Images.Media._ID)
    val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val queryArgs = Bundle().apply {
        putStringArray(
          ContentResolver.QUERY_ARG_SORT_COLUMNS,
          arrayOf(MediaStore.Images.Media.DATE_ADDED)
        )
        putInt(
          ContentResolver.QUERY_ARG_SORT_DIRECTION,
          ContentResolver.QUERY_SORT_DIRECTION_DESCENDING
        )
        putInt(ContentResolver.QUERY_ARG_LIMIT, 1)
      }
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, queryArgs, null
      )
    } else {
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        projection, null, null,
        "${MediaStore.Images.Media.DATE_ADDED} DESC"
      )
    }

    cursor?.use { c ->
      if (c.moveToFirst()) {
        lastSeenId = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
      }
    }
  }

  // 캐치업 조회(checkNow 전용): 최신 이미지 1건이 (1) 스크린샷이고 (2) 앱 시작 이후
  // 추가됐고 (3) checkNow로 아직 재발화하지 않았다면 발화한다. lastSeenId(옵저버 마커)와
  // 독립적으로 동작해, 옵저버 발화 직후 동결로 JS 전달이 유실된 항목도 복귀 시 회수된다.
  // (옵저버가 정상 전달한 항목을 한 번 더 보낼 수 있으나 JS processedIds가 걸러낸다.)
  private fun queryForCatchUp(resolver: ContentResolver) {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.DATE_ADDED
    )

    val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val queryArgs = Bundle().apply {
        putStringArray(
          ContentResolver.QUERY_ARG_SORT_COLUMNS,
          arrayOf(MediaStore.Images.Media.DATE_ADDED)
        )
        putInt(
          ContentResolver.QUERY_ARG_SORT_DIRECTION,
          ContentResolver.QUERY_SORT_DIRECTION_DESCENDING
        )
        putInt(ContentResolver.QUERY_ARG_LIMIT, 1)
      }
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, queryArgs, null
      )
    } else {
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        projection, null, null,
        "${MediaStore.Images.Media.DATE_ADDED} DESC"
      )
    }

    cursor?.use { c ->
      if (!c.moveToFirst()) return
      val id = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
      val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)) ?: ""
      val path = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)) ?: ""
      val dateAdded = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED))

      if (id == lastCheckNowId) return
      if (dateAdded < startTimeSec) return
      val isScreenshot = path.contains("Screenshots", true) ||
        name.contains("Screenshot", true)
      if (!isScreenshot) return

      lastCheckNowId = id
      // 옵저버의 후속 중복 발화도 줄인다(JS 중복 가드가 있지만 이벤트 수 자체를 절약).
      lastSeenId = id

      val contentUri = Uri.withAppendedPath(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString()
      )
      sendEvent(
        "onScreenshot",
        mapOf(
          "uri" to contentUri.toString(),
          "displayName" to name,
          "createdAt" to dateAdded
        )
      )
    }
  }

  // 최신 이미지 1건을 조회해 스크린샷이면 onScreenshot 이벤트를 보낸다.
  //
  // NOTE: Android 11+(API 30)부터는 sortOrder 문자열에 "LIMIT"를 넣으면 거부되어
  // 예외가 발생한다(과거 SQLite 꼼수가 막힘). 따라서 API 30+에서는 Bundle 기반
  // QUERY_ARG_LIMIT를 사용하고, 그 미만에서는 LIMIT 없이 정렬 후 moveToFirst로 처리한다.
  private fun queryLatestScreenshot(resolver: ContentResolver) {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH,
      MediaStore.Images.Media.DATE_ADDED
    )

    val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val queryArgs = Bundle().apply {
        putStringArray(
          ContentResolver.QUERY_ARG_SORT_COLUMNS,
          arrayOf(MediaStore.Images.Media.DATE_ADDED)
        )
        putInt(
          ContentResolver.QUERY_ARG_SORT_DIRECTION,
          ContentResolver.QUERY_SORT_DIRECTION_DESCENDING
        )
        putInt(ContentResolver.QUERY_ARG_LIMIT, 1)
      }
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, queryArgs, null
      )
    } else {
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
        projection, null, null,
        "${MediaStore.Images.Media.DATE_ADDED} DESC"
      )
    }

    cursor?.use { c ->
      if (!c.moveToFirst()) return
      val id = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
      val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)) ?: ""
      val path = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)) ?: ""
      val dateAdded = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED))

      // 동일 항목 중복 발화 방지.
      if (id == lastSeenId) return
      val isScreenshot = path.contains("Screenshots", true) ||
        name.contains("Screenshot", true)
      if (!isScreenshot) return
      lastSeenId = id

      val contentUri = Uri.withAppendedPath(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString()
      )
      sendEvent(
        "onScreenshot",
        mapOf(
          "uri" to contentUri.toString(),
          "displayName" to name,
          "createdAt" to dateAdded
        )
      )
    }
  }
}
