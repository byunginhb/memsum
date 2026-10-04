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
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Process
import android.provider.MediaStore
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import java.util.UUID

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
// 파이프라인 실행. [무시] → AskDismissReceiver가 알림 제거 + "결정된 최대 id" 기록
// (앱 복귀 시 캐치업·옵저버가 무시한 스크린샷을 다시 보내 업로드하지 않도록).
class ScreenshotAskJobService : JobService() {

  override fun onStartJob(params: JobParameters?): Boolean {
    // 사용자가 자동 감지를 껐으면(stopWatching) 알림도, 재스케줄도 하지 않는다.
    // why 여기서도 확인: cancel 전에 이미 OS 큐에 들어간 실행이 올 수 있다.
    val enabled = isEnabled(applicationContext)
    try {
      if (enabled) handleTrigger()
    } catch (e: Exception) {
      Log.e(TAG, "잡 처리 실패", e)
    } finally {
      // TriggerContentUri 잡은 1회성 — 다음 변경을 위해 재스케줄한다(켜져 있을 때만).
      if (enabled) schedule(applicationContext)
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

    val latest = MediaStoreQuery.latest(contentResolver, 1).firstOrNull() ?: return
    if (!latest.isScreenshot) return
    if (latest.id <= lastAskedId) return

    // 딥링크 위조 방지용 1회용 토큰(알림 본문 탭 → JS가 consumeAskToken으로 대조).
    val token = UUID.randomUUID().toString()
    prefs.edit().putLong(KEY_LAST_ASKED, latest.id).putString(KEY_ASK_TOKEN, token).apply()
    postAskNotification(latest, token)
  }

  private fun isAppForeground(): Boolean {
    val am = getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val myPid = Process.myPid()
    return am.runningAppProcesses?.any {
      it.pid == myPid &&
        it.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
    } == true
  }

  private fun postAskNotification(latest: MediaItem, token: String) {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    // HIGH 채널이어야 상단 헤드업으로 뜬다. expo-notifications가 같은 id로 먼저 만들었어도
    // 동일 설정이라 무해(이미 있으면 시스템이 기존 설정 유지).
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ASK,
          getString(R.string.memsum_ask_channel_name),
          NotificationManager.IMPORTANCE_HIGH
        )
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
        "memsum://?autoSaveUri=${Uri.encode(latest.contentUri)}" +
          "&autoSaveToken=${Uri.encode(token)}&autoSaveNotifId=$notifId"
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

    // [무시]: 앱을 열지 않고 알림을 제거하고, 이 항목을 "결정됨"으로 기록한다.
    val dismissIntent = Intent(this, AskDismissReceiver::class.java).apply {
      putExtra(EXTRA_NOTIF_ID, notifId)
      putExtra(EXTRA_MEDIA_ID, latest.id)
    }
    val dismissPending = PendingIntent.getBroadcast(
      this, notifId * 10 + 2, dismissIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    // 문구는 strings.xml(values=en, values-ko=ko) — JS i18n 밖에서 뜨는 시스템 표면이라
    // 기기 언어를 OS 리소스 해석에 맡긴다.
    // 작은 아이콘은 단색 벡터: 상태바는 알파 채널만 쓰므로 컬러 런처 아이콘은 흰 네모로 뭉개진다.
    // why 버전 분기: Builder(context, channelId)는 API 26+ 전용이라 minSdk 24 기기에서
    // NoSuchMethodError로 잡이 죽는다. 26 미만은 채널 대신 우선순위로 헤드업을 요청한다.
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      android.app.Notification.Builder(this, CHANNEL_ASK)
    } else {
      @Suppress("DEPRECATION")
      android.app.Notification.Builder(this)
        .setPriority(android.app.Notification.PRIORITY_HIGH)
        .setDefaults(android.app.Notification.DEFAULT_ALL)
    }
    val notification = builder
      .setSmallIcon(R.drawable.ic_memsum_notification)
      .setContentTitle(getString(R.string.memsum_ask_title))
      .setContentText(getString(R.string.memsum_ask_body))
      .setAutoCancel(true)
      .setContentIntent(openPending)
      .addAction(
        android.app.Notification.Action.Builder(
          null, getString(R.string.memsum_ask_action_save), savePending
        ).build()
      )
      .addAction(
        android.app.Notification.Action.Builder(
          null, getString(R.string.memsum_ask_action_dismiss), dismissPending
        ).build()
      )
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
    /** 자동 감지 사용 여부(stopWatching/startWatching이 기록, 잡이 매 실행마다 확인). */
    private const val KEY_ENABLED = "enabled"
    /**
     * 사용자가 질문 알림에서 결정한([무시]/[저장]) 가장 큰 MediaStore id.
     * 캐치업·옵저버는 이 값 이하를 건너뛴다. why 최대값: 질문 알림은 최신 1건만 교체 게시하므로
     * 결정은 "그 시점까지 쌓인 스크린샷 전체"에 대한 응답으로 본다.
     */
    private const val KEY_DECIDED_MAX = "decided_max_id"
    /** 마지막 질문 알림의 1회용 딥링크 토큰. */
    private const val KEY_ASK_TOKEN = "ask_token"
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

    // 감지 켜기: 플래그 기록 + 잡 등록(startWatching).
    fun enable(context: Context) {
      prefs(context).edit().putBoolean(KEY_ENABLED, true).apply()
      schedule(context)
    }

    // 감지 끄기: 플래그 내림 + 예약 잡 취소 + 떠 있는 질문 알림/토큰 제거(stopWatching).
    // commit(동기): 직후 도착하는 잡 실행이 반드시 꺼진 값을 읽게 한다.
    fun disable(context: Context) {
      prefs(context).edit().putBoolean(KEY_ENABLED, false).remove(KEY_ASK_TOKEN).commit()
      try {
        val scheduler =
          context.getSystemService(Context.JOB_SCHEDULER_SERVICE) as JobScheduler
        scheduler.cancel(JOB_ID)
      } catch (e: Exception) {
        Log.e(TAG, "잡 취소 실패", e)
      }
      val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      nm.cancel(ASK_NOTIF_ID)
    }

    // 기본 false: 플래그가 없으면(구버전에서 등록된 잡 등) 앱이 다시 켤 때까지 묻지 않는다.
    fun isEnabled(context: Context): Boolean =
      prefs(context).getBoolean(KEY_ENABLED, false)

    // 딥링크 토큰 대조 — 일치하면 폐기(1회용)하고 true.
    fun consumeToken(context: Context, token: String): Boolean {
      val p = prefs(context)
      val expected = p.getString(KEY_ASK_TOKEN, null) ?: return false
      if (token.isEmpty() || token != expected) return false
      p.edit().remove(KEY_ASK_TOKEN).apply()
      return true
    }

    private fun prefs(context: Context) =
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    // 질문 기준점 동기화: 이 id 이하 항목엔 묻지 않는다(과거 스크린샷 오발화 방지 —
    // 인프로세스 baseline과 동일 정책). why max: startWatching은 앱 복귀마다 불리는데,
    // 동결 중엔 인프로세스 lastSeenId가 갱신되지 않아 잡이 이미 물은 id보다 작을 수 있다 —
    // 그대로 덮으면 기준점이 내려가 같은 스크린샷을 다시 묻는다. 기준점은 전진만 한다.
    fun resetBaseline(context: Context, latestId: Long) {
      val p = prefs(context)
      val current = p.getLong(KEY_LAST_ASKED, 0L)
      if (latestId > current) p.edit().putLong(KEY_LAST_ASKED, latestId).apply()
    }

    // 사용자가 질문 알림에서 결정한 항목 기록(최대값만 유지). commit(동기): 수신기 직후
    // 앱 복귀 캐치업이 바로 읽으므로 반영이 보장돼야 한다.
    fun markDecided(context: Context, mediaId: Long) {
      if (mediaId <= 0L) return
      val p = prefs(context)
      if (mediaId > p.getLong(KEY_DECIDED_MAX, 0L)) {
        p.edit().putLong(KEY_DECIDED_MAX, mediaId).commit()
      }
    }

    fun decidedMaxId(context: Context): Long = prefs(context).getLong(KEY_DECIDED_MAX, 0L)
  }
}

/** [무시] 액션 — 앱을 열지 않고 질문 알림을 제거하고, 그 항목을 "결정됨"으로 기록한다. */
class AskDismissReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    // 기록이 없으면 앱 복귀 시 캐치업(checkNow)이 무시한 스크린샷을 그대로 업로드한다.
    ScreenshotAskJobService.markDecided(
      context, intent.getLongExtra(ScreenshotAskJobService.EXTRA_MEDIA_ID, -1L)
    )
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
    // 헤드리스 저장이 맡았으므로 캐치업·옵저버가 같은 항목을 다시 보내지 않게 기록한다
    // (JS markHandled는 같은 프로세스의 모듈 인스턴스에만 반영되고 재시작 시 사라진다).
    ScreenshotAskJobService.markDecided(
      context, intent.getLongExtra(ScreenshotAskJobService.EXTRA_MEDIA_ID, -1L)
    )
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
