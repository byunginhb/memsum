package expo.modules.photolibrarywatcher

import android.database.ContentObserver
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
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
          val projection = arrayOf(
            MediaStore.Images.Media._ID,
            MediaStore.Images.Media.DISPLAY_NAME,
            MediaStore.Images.Media.RELATIVE_PATH,
            MediaStore.Images.Media.DATE_ADDED
          )
          resolver.query(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
            projection, null, null,
            "${MediaStore.Images.Media.DATE_ADDED} DESC LIMIT 1"
          )?.use { cursor ->
            if (cursor.moveToFirst()) {
              val id = cursor.getLong(0)
              val name = cursor.getString(1) ?: ""
              val path = cursor.getString(2) ?: ""
              if (id == lastSeenId) return@use
              val isScreenshot = path.contains("Screenshots", true) ||
                                 name.contains("Screenshot", true)
              if (!isScreenshot) return@use
              lastSeenId = id
              val contentUri = Uri.withAppendedPath(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString()
              )
              sendEvent("onScreenshot", mapOf(
                "uri" to contentUri.toString(),
                "displayName" to name,
                "createdAt" to cursor.getLong(3)
              ))
            }
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
    }
  }
}
