// src/lib/notifications.ts
//
// 로컬 알림 래퍼 (expo-notifications).
// 1) 질문 알림: 다른 앱 사용 중 스크린샷이 감지되면 상단 헤드업으로
//    "Memsum에 저장할까요?" [저장]/[무시] 를 묻는다(자동 캡처의 핵심 UX).
// 2) 결과 알림: 백그라운드에서 정리가 완료되면 결과를 알린다.
// 푸시(APNs/FCM) 자격증명은 필요 없다 — 전부 로컬 알림이다.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { t } from '@/i18n';

// Android 알림 채널. 8.0+ 필수. 한 번 만든 채널은 중요도 변경이 불가하므로 용도별 분리.
// - 질문 채널: HIGH — 상단 헤드업 배너로 떠야 바로 응답할 수 있다.
// - 결과 채널: DEFAULT — 조용한 보조 알림.
const CHANNEL_ASK = 'capture-ask';
const CHANNEL_RESULT = 'captures';

/** 질문 알림 카테고리(액션 버튼 묶음) id. 응답 리스너가 이 값으로 필터한다. */
export const CAPTURE_ASK_CATEGORY = 'capture-ask';
/** [저장] 액션 id. */
export const CAPTURE_ASK_ACTION_SAVE = 'save';
/** [무시] 액션 id. */
export const CAPTURE_ASK_ACTION_DISMISS = 'dismiss';

/** 질문 알림 data에 싣는 페이로드(응답 시 파이프라인 입력 복원용). */
export type CaptureAskPayload = {
  assetId?: string;
  uri?: string;
};

// 포그라운드 수신 시 표시 정책: 배너·목록 표시, 소리·배지는 끔(조용한 보조 알림).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// 채널·카테고리 생성은 1회면 충분. 멱등이지만 호출 횟수를 줄이기 위해 플래그로 가드.
let channelReady = false;
let categoryReady = false;

async function ensureChannels(): Promise<void> {
  if (channelReady || Platform.OS !== 'android') {
    channelReady = true;
    return;
  }
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ASK, {
      name: '캡처 확인',
      // HIGH여야 상단 헤드업(배너)으로 뜬다 — 질문 알림의 핵심.
      importance: Notifications.AndroidImportance.HIGH,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_RESULT, {
      name: '캡처 알림',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    channelReady = true;
  } catch (error) {
    console.error('[notifications] 채널 생성 실패:', error);
  }
}

async function ensureAskCategory(): Promise<void> {
  if (categoryReady) return;
  try {
    await Notifications.setNotificationCategoryAsync(CAPTURE_ASK_CATEGORY, [
      {
        identifier: CAPTURE_ASK_ACTION_SAVE,
        buttonTitle: t('autoCapture.action.save'),
        options: { opensAppToForeground: true },
      },
      {
        identifier: CAPTURE_ASK_ACTION_DISMISS,
        buttonTitle: t('autoCapture.action.dismiss'),
        // 무시는 앱을 열 필요가 없다(iOS에서만 적용 — Android는 액션 탭 시 응답 전달 후 처리).
        options: { opensAppToForeground: false, isDestructive: true },
      },
    ]);
    categoryReady = true;
  } catch (error) {
    console.error('[notifications] 카테고리 등록 실패:', error);
  }
}

/**
 * 알림 권한을 보장한다(미요청이면 요청). 거부돼도 throw하지 않고 false.
 * Android 13+의 POST_NOTIFICATIONS, iOS의 알림 권한을 모두 이 한 줄로 처리한다.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // 한 번도 묻지 않았거나 재요청 가능하면 요청한다.
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  } catch (error) {
    console.error('[notifications] 권한 확인/요청 실패:', error);
    return false;
  }
}

/** Android는 채널 지정 즉시 트리거, iOS는 즉시(null). */
function immediateTrigger(
  channelId: string,
): Notifications.NotificationTriggerInput {
  return Platform.OS === 'android' ? { channelId } : null;
}

/**
 * 질문 알림: "Memsum에 저장할까요?" [저장]/[무시] 를 상단 헤드업으로 띄운다.
 * 스크린샷 페이로드를 data로 실어, 응답 시 파이프라인 입력을 복원한다.
 *
 * @returns 게시 성공 여부. 실패(권한 거부 등) 시 false — 호출 측이 "묻지 못한" 항목을
 * 처리됨으로 마킹하지 않고 남겨, 앱 복귀 시 캐치업으로 회수되게 한다.
 */
export async function notifyCaptureAsk(
  payload: CaptureAskPayload,
): Promise<boolean> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;
    await ensureChannels();
    await ensureAskCategory();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('autoCapture.ask.title'),
        body: t('autoCapture.ask.body'),
        data: payload,
        categoryIdentifier: CAPTURE_ASK_CATEGORY,
      },
      trigger: immediateTrigger(CHANNEL_ASK),
    });
    return true;
  } catch (error) {
    console.error('[notifications] 질문 알림 실패:', error);
    return false;
  }
}

/**
 * 즉시 결과 알림을 띄운다(best-effort — 실패해도 캡처 저장 자체에는 영향 없음).
 * 권한이 없으면 조용히 무시한다(호출 측 분기 단순화).
 */
export async function notifyLocal(title: string, body?: string): Promise<void> {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: { title, body: body ?? undefined },
      trigger: immediateTrigger(CHANNEL_RESULT),
    });
  } catch (error) {
    console.error('[notifications] 로컬 알림 실패:', error);
  }
}
