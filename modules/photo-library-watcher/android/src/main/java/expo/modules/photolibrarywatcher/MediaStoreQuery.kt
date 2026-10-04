package expo.modules.photolibrarywatcher

import android.content.ContentResolver
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore

/** MediaStore 최신 이미지 1행. path는 API 29+면 RELATIVE_PATH, 그 미만이면 DATA(절대 경로). */
internal data class MediaItem(
  val id: Long,
  val name: String,
  val path: String,
  val dateAdded: Long
) {
  val isScreenshot: Boolean
    get() = path.contains("Screenshots", true) || name.contains("Screenshot", true)

  val contentUri: String
    get() = Uri.withAppendedPath(
      MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString()
    ).toString()
}

/**
 * 모듈(옵저버·캐치업)과 잡(질문 알림)이 공유하는 MediaStore 조회.
 *
 * why 한 곳: 같은 쿼리가 세 군데 복제돼 있어 OS 버전 분기(LIMIT·경로 컬럼)를
 * 한쪽만 고치는 회귀가 반복됐다.
 * - API 30+: sortOrder에 "LIMIT"를 넣으면 거부되므로 Bundle QUERY_ARG_LIMIT를 쓴다.
 * - API 29 미만: RELATIVE_PATH 컬럼이 없어 프로젝션에 넣으면 쿼리 자체가 실패한다 →
 *   DATA(절대 경로, 예 /storage/emulated/0/Pictures/Screenshots/x.png)로 대체 판별.
 */
internal object MediaStoreQuery {
  private val pathColumn: String
    get() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      MediaStore.Images.Media.RELATIVE_PATH
    } else {
      @Suppress("DEPRECATION")
      MediaStore.Images.Media.DATA
    }

  /** DATE_ADDED 내림차순 최신 limit건. 실패 시 빈 목록이 아니라 예외를 던진다(호출 측 로깅). */
  fun latest(resolver: ContentResolver, limit: Int): List<MediaItem> {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      pathColumn,
      MediaStore.Images.Media.DATE_ADDED
    )

    val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val args = Bundle().apply {
        putStringArray(
          ContentResolver.QUERY_ARG_SORT_COLUMNS,
          arrayOf(MediaStore.Images.Media.DATE_ADDED)
        )
        putInt(
          ContentResolver.QUERY_ARG_SORT_DIRECTION,
          ContentResolver.QUERY_SORT_DIRECTION_DESCENDING
        )
        putInt(ContentResolver.QUERY_ARG_LIMIT, limit)
      }
      resolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, args, null)
    } else {
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null,
        "${MediaStore.Images.Media.DATE_ADDED} DESC"
      )
    }

    val items = mutableListOf<MediaItem>()
    cursor?.use { c ->
      val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
      val nameCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)
      val pathCol = c.getColumnIndexOrThrow(pathColumn)
      val dateCol = c.getColumnIndexOrThrow(MediaStore.Images.Media.DATE_ADDED)
      while (items.size < limit && c.moveToNext()) {
        items.add(
          MediaItem(
            id = c.getLong(idCol),
            name = c.getString(nameCol) ?: "",
            path = c.getString(pathCol) ?: "",
            dateAdded = c.getLong(dateCol)
          )
        )
      }
    }
    return items
  }
}
