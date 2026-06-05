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

  override fun definition() = ModuleDefinition {
    Name("PhotoLibraryWatcher")
    Events("onScreenshot")

    OnCreate {
      val ctx = appContext.reactContext ?: return@OnCreate
      val resolver = ctx.contentResolver

      observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
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
      resolver.registerContentObserver(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, true, observer!!
      )
    }

    OnDestroy {
      // 옵저버 해제 필수 (메모리 누수 방지).
      observer?.let {
        appContext.reactContext?.contentResolver?.unregisterContentObserver(it)
      }
      observer = null
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
