package expo.modules.photolibrarywatcher

import android.app.ActivityManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.job.JobInfo
import android.app.job.JobParameters
import android.app.job.JobScheduler
import android.app.job.JobService
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Process
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

// 백그라운드 스크린샷 질문 알림 잡.
//
// why JobScheduler: Android 12+ cached-app freezer는 백그라운드 앱 프로세스를 동결해
// 인프로세스 ContentObserver 콜백 자체가 전달되지 않는다(라이브 진단으로 확인).
// JobScheduler의 TriggerContentUri는 MediaStore 변경 시 OS가 프로세스를 깨워 잡을
// 실행해 주는 표준 메커니즘이라, 다른 앱 사용 중에도 "찍는 순간" 질문 알림을 띄울 수 있다.
//
// 흐름: MediaStore 변경 → onStartJob → (포그라운드면 skip — 인프로세스 옵저버가 처리)
// → 새 스크린샷이면 헤드업 알림 "Memsum에 저장할까요?" [저장]/[무시] 게시 → 재스케줄.
// [저장]/본문 탭 → 앱 launch 인텐트(data: memsum://?autoSaveUri=...) → JS Linking 핸들러가
// 파이프라인 실행. [무시] → AskDismissReceiver가 알림만 제거.
class ScreenshotAskJobService : JobService() {

  override fun onStartJob(params: JobParameters?): Boolean {
    try {
      handleTrigger()
    } catch (e: Exception) {
      Log.e(TAG, "잡 처리 실패", e)
    } finally {
      // TriggerContentUri 잡은 1회성 — 다음 변경을 위해 항상 재스케줄한다.
      schedule(applicationContext)
      jobFinished(params, false)
    }
    return false
  }

  override fun onStopJob(params: JobParameters?): Boolean = false

  private fun handleTrigger() {
    // 포그라운드면 인프로세스 옵저버 경로(즉시 처리 + 토스트)가 담당 — 중복 알림 방지.
    if (isAppForeground()) return

    val prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val lastAskedId = prefs.getLong(KEY_LAST_ASKED, 0L)

    val latest = queryLatestScreenshot(contentResolver) ?: return
    if (latest.id <= lastAskedId) return

    prefs.edit().putLong(KEY_LAST_ASKED, latest.id).apply()
    postAskNotification(latest)
  }

  private fun isAppForeground(): Boolean {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val myPid = Process.myPid()
    return am.runningAppProcesses?.any {
      it.pid == myPid &&
        it.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    } == true
  }

  private data class Latest(val id: Long, val name: String, val contentUri: String)

  // 최신 이미지 1건 조회 — 스크린샷(경로/이름)일 때만 반환.
  private fun queryLatestScreenshot(resolver: ContentResolver): Latest? {
    val projection = arrayOf(
      MediaStore.Images.Media._ID,
      MediaStore.Images.Media.DISPLAY_NAME,
      MediaStore.Images.Media.RELATIVE_PATH
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
        putInt(ContentResolver.QUERY_ARG_LIMIT, 1)
      }
      resolver.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, args, null)
    } else {
      resolver.query(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null,
        "${MediaStore.Images.Media.DATE_ADDED} DESC"
      )
    }

    cursor?.use { c ->
      if (!c.moveToFirst()) return null
      val id = c.getLong(c.getColumnIndexOrThrow(MediaStore.Images.Media._ID))
      val name = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.DISPLAY_NAME)) ?: ""
      val path = c.getString(c.getColumnIndexOrThrow(MediaStore.Images.Media.RELATIVE_PATH)) ?: ""
      val isScreenshot = path.contains("Screenshots", true) || name.contains("Screenshot", true)
      if (!isScreenshot) return null
      val uri = Uri.withAppendedPath(
        MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id.toString()
      ).toString()
      return Latest(id, name, uri)
    }
    return null
  }

  private fun postAskNotification(latest: Latest) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    // HIGH 채널이어야 상단 헤드업으로 뜬다. expo-notifications가 같은 id로 먼저 만들었어도
    // 동일 설정이라 무해(이미 있으면 시스템이 기존 설정 유지).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL_ASK, "캡처 확인", NotificationManager.IMPORTANCE_HIGH)
      )
    }

    // 질문 알림은 항상 최신 1건만 유지(고정 id → 새 질문이 이전 질문을 교체).
    // why: mediaId 기반 가변 id로 누적되면 OS가 자동 그룹으로 묶어 [저장]/[무시]
    // 액션 버튼이 가려진다. 응답 없는 옛 질문은 앱 복귀 시 캐치업(checkNow)이
    // 회수하므로 교체로 잃는 것이 없다. PendingIntent도 고정 requestCode +
    // FLAG_UPDATE_CURRENT라 extras(uri·media_id)가 최신 항목으로 갱신된다.
    val notifId = ASK_NOTIF_ID

    // 본문 탭 = "열어서 보기": 앱을 열며 딥링크로 저장까지 잇는다(보고 싶은 사용자용).
    val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
      data = Uri.parse(
        "memsum://?autoSaveUri=${Uri.encode(latest.contentUri)}&autoSaveNotifId=$notifId"
      )
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    } ?: return
    val openPending = PendingIntent.getActivity(
      this, notifId, openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // [저장] = 백그라운드 저장: 앱을 열지 않는다(다른 작업 방해 금지 — 사용자 요구).
    // 브로드캐스트 → Headless JS 서비스가 화면 없이 파이프라인을 실행한다.
    val saveIntent = Intent(this, SaveCaptureReceiver::class.java).apply {
      putExtra(EXTRA_NOTIF_ID, notifId)
      putExtra(EXTRA_URI, latest.contentUri)
      putExtra(EXTRA_MEDIA_ID, latest.id)
    }
    val savePending = PendingIntent.getBroadcast(
      this, notifId * 10 + 1, saveIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // [무시]: 앱을 열지 않고 알림만 제거한다.
    val dismissIntent = Intent(this, AskDismissReceiver::class.java).apply {
      putExtra(EXTRA_NOTIF_ID, notifId)
    }
    val dismissPending = PendingIntent.getBroadcast(
      this, notifId * 10 + 2, dismissIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // 네이티브 알림 문구는 ko 고정(JS i18n 밖에서 떠야 하는 시스템 표면 — 출시 ko 우선,
    // 추후 strings.xml 다국어화 TODO).
    val notification = android.app.Notification.Builder(this, CHANNEL_ASK)
      .setSmallIcon(applicationInfo.icon)
      .setContentTitle("Memsum에 저장할까요?")
      .setContentText("방금 캡처한 화면을 정리해 둘게요")
      .setAutoCancel(true)
      .setContentIntent(openPending)
      .addAction(android.app.Notification.Action.Builder(null, "저장", savePending).build())
      .addAction(android.app.Notification.Action.Builder(null, "무시", dismissPending).build())
      .build()

    nm.notify(notifId, notification)
  }

  companion object {
    private const val TAG = "PhotoLibraryWatcher"
    private const val JOB_ID = 1011
    /** 질문 알림 고정 id — 최신 질문 1건만 유지(교체 게시). JOB_ID와 겹치지 않게. */
    private const val ASK_NOTIF_ID = 1012
    const val PREFS = "photo_watcher"
    const val KEY_LAST_ASKED = "last_asked_id"
    const val CHANNEL_ASK = "capture-ask"
    const val EXTRA_NOTIF_ID = "notif_id"
    const val EXTRA_URI = "uri"
    const val EXTRA_MEDIA_ID = "media_id"
    /** JS AppRegistry.registerHeadlessTask와 일치해야 하는 태스크 이름. */
    const val HEADLESS_TASK = "MemsumSaveCapture"

    // MediaStore 이미지 변경을 트리거로 하는 1회성 잡 등록(실행 후 매번 재스케줄).
    fun schedule(context: Context) {
      try {
        val scheduler =
          context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        val job = JobInfo.Builder(
          JOB_ID,
          ComponentName(context, ScreenshotAskJobService::class.java)
        )
          .addTriggerContentUri(
            JobInfo.TriggerContentUri(
              MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
              JobInfo.TriggerContentUri.FLAG_NOTIFY_FOR_DESCENDANTS
            )
          )
          // 변경 후 빠르게(0.1s~1.5s) 깨워 "찍는 순간" 체감을 만든다.
          .setTriggerContentUpdateDelay(100)
          .setTriggerContentMaxDelay(1500)
          .build()
        scheduler.schedule(job)
      } catch (e: Exception) {
        Log.e(TAG, "잡 스케줄 실패", e)
      }
    }

    // 앱(프로세스) 시작 시 기준점: 현재 최신 id 이전 항목엔 묻지 않는다
    // (앱이 꺼져 있던 동안의 과거 스크린샷 오발화 방지 — 인프로세스 baseline과 동일 정책).
    fun resetBaseline(context: Context, latestId: Long) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit().putLong(KEY_LAST_ASKED, latestId).apply()
    }
  }
}

/** [무시] 액션 — 앱을 열지 않고 질문 알림만 제거한다. */
class AskDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val id = intent.getIntExtra(ScreenshotAskJobService.EXTRA_NOTIF_ID, -1)
    if (id >= 0) {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(id)
    }
  }
}

/**
 * [저장] 액션 — 앱을 열지 않고 백그라운드에서 저장 파이프라인을 시작한다.
 * 알림 액션 탭은 사용자 상호작용이라 이 짧은 윈도우 안에서 서비스 시작이 허용된다.
 */
class SaveCaptureReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val notifId = intent.getIntExtra(ScreenshotAskJobService.EXTRA_NOTIF_ID, -1)
    if (notifId >= 0) {
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(notifId)
    }

    try {
      val service = Intent(context, SaveCaptureService::class.java).apply {
        putExtras(intent)
      }
      // Headless JS 동안 도즈로 잠들지 않도록 웨이크락 확보(RN 권장 패턴).
      HeadlessJsTaskService.acquireWakeLockNow(context)
      context.startService(service)
      Log.i("PhotoLibraryWatcher", "[저장] 백그라운드 처리 시작 (notifId=$notifId)")
    } catch (e: Exception) {
      Log.e("PhotoLibraryWatcher", "백그라운드 저장 시작 실패", e)
    }
  }
}

/**
 * 백그라운드 저장 실행기 — 화면 없이 JS 파이프라인(업로드→OCR→GPT→저장)을 돌린다.
 * JS 번들이 안 떠 있으면(RN Headless) 런타임을 헤드리스로 부팅해 실행한다.
 * 태스크 구현: src/tasks/save-capture-task.ts (AppRegistry 'MemsumSaveCapture').
 */
class SaveCaptureService : HeadlessJsTaskService() {
  override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
    val extras = intent?.extras ?: return null
    Log.i("PhotoLibraryWatcher", "헤드리스 저장 태스크 구성 (uri=${extras.getString(ScreenshotAskJobService.EXTRA_URI)})")
    return HeadlessJsTaskConfig(
      ScreenshotAskJobService.HEADLESS_TASK,
      Arguments.fromBundle(extras),
      // 업로드+OCR+GPT 왕복 여유. 초과 시 태스크 강제 종료(무한 점유 방지).
      90_000,
      // 앱이 포그라운드여도 실행 허용(드물지만 전환 직후 탭하는 경우).
      true
    )
  }
}
