import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/design/components/Avatar/Avatar';
import { useBottomBarClearance } from '@/design/components/BottomBar/BottomBar';
import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Header } from '@/design/components/Header/Header';
import { ListItem } from '@/design/components/ListItem/ListItem';
import { Switch } from '@/design/components/Switch/Switch';
import { Text } from '@/design/components/Text/Text';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useThemeStore } from '@/design/theme/theme-store';
import type { ThemeMode } from '@/design/theme/theme-store';
import { useTheme } from '@/design/theme/useTheme';
import { spacing } from '@/design/tokens';
import { ParcelOnboardingSheet } from '@/features/parcel/components/ParcelOnboardingSheet';
import { getLocale, t } from '@/i18n';
import { deleteAllUserData } from '@/lib/account';
import { PARCEL_ENABLED } from '@/lib/features';
import { useAuthStore } from '@/stores/auth-store';
import { useCaptureStore } from '@/stores/capture-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { ToneStyle } from '@/stores/settings-store';

import { getPermissionStatus } from '../../../modules/photo-library-watcher';
import type { PermissionStatus } from '../../../modules/photo-library-watcher';
import { GoogleCalendarRow } from './GoogleCalendarRow';
import { NicknameEditSheet } from './NicknameEditSheet';
import { SettingsSegmented } from './SettingsSegmented';
import type { SegmentOption } from './SettingsSegmented';

/** 테마 3택. */
const THEME_MODE_OPTIONS: readonly SegmentOption<ThemeMode>[] = [
  { value: 'system', labelKey: 'settings.theme.system' },
  { value: 'light', labelKey: 'settings.theme.light' },
  { value: 'dark', labelKey: 'settings.theme.dark' },
];

/** 말투 2택. */
const TONE_OPTIONS: readonly SegmentOption<ToneStyle>[] = [
  { value: 'friendly', labelKey: 'settings.tone.friendly' },
  { value: 'formal', labelKey: 'settings.tone.formal' },
];

/** 일정 전날 리마인드 시각(저녁 7~10시, 기기 시간). 값은 시(hour) 문자열. */
const EVENT_REMINDER_HOUR_OPTIONS: readonly SegmentOption<string>[] = [
  { value: '19', labelKey: 'settings.eventReminder.hour19' },
  { value: '20', labelKey: 'settings.eventReminder.hour20' },
  { value: '21', labelKey: 'settings.eventReminder.hour21' },
  { value: '22', labelKey: 'settings.eventReminder.hour22' },
];

/**
 * 설정 탭.
 *
 * 탭 화면이라 뒤로가기 없이 공용 Header(큰 제목). 섹션은 카드 대신 mono 머리표 + 구분선 행으로 묶는다.
 * 자동화 토글·호칭·말투는 settings-store, 테마는 theme-store(단일 진실)에서 읽고 쓴다.
 * 자동 감지를 켰는데 사진 권한이 거부돼 있으면, 설정 앱으로 보내는 안내를 띄우고 행에도 표시한다.
 */
export function SettingsScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomBarClearance();
  const toast = useToast();

  const nickname = useSettingsStore((state) => state.nickname);
  const autoCapture = useSettingsStore((state) => state.autoCapture);
  const autoCalendar = useSettingsStore((state) => state.autoCalendar);
  const weeklyReport = useSettingsStore((state) => state.weeklyReport);
  const tone = useSettingsStore((state) => state.tone);
  const parcelTracking = useSettingsStore((state) => state.parcelTracking);
  const parcelOnboarded = useSettingsStore((state) => state.parcelOnboarded);
  const setAutoCapture = useSettingsStore((state) => state.setAutoCapture);
  const setAutoCalendar = useSettingsStore((state) => state.setAutoCalendar);
  const setWeeklyReport = useSettingsStore((state) => state.setWeeklyReport);
  const setTone = useSettingsStore((state) => state.setTone);
  const setParcelTracking = useSettingsStore((state) => state.setParcelTracking);
  const setParcelOnboarded = useSettingsStore((state) => state.setParcelOnboarded);
  const eventReminder = useSettingsStore((state) => state.eventReminder);
  const eventReminderHour = useSettingsStore((state) => state.eventReminderHour);
  const setEventReminder = useSettingsStore((state) => state.setEventReminder);
  const setEventReminderHour = useSettingsStore((state) => state.setEventReminderHour);

  // 테마는 theme-store가 단일 진실(설정 스토어에 중복 저장하지 않는다).
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);

  const [isNicknameSheetOpen, setNicknameSheetOpen] = useState(false);
  const [isParcelOnboardingOpen, setParcelOnboardingOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const photoPermission = usePhotoPermission();

  // 택배 토글은 기능 스위치가 켜져 있고 한국(ko) 로케일일 때만 노출한다.
  const showParcelSection = PARCEL_ENABLED && getLocale() === 'ko';

  // 자동 감지가 켜져 있지만 권한이 막혀 실제로는 동작하지 않는 상태.
  const autoCaptureBlocked = autoCapture && photoPermission === 'denied';

  const openSystemSettings = useCallback((): void => {
    void Linking.openSettings();
  }, []);

  // 자동 감지 토글. 켜는 순간 권한이 이미 거부돼 있으면(OS가 다시 묻지 않음) 설정 앱으로 안내한다.
  // 아직 묻지 않은 상태라면 use-auto-capture 훅이 시스템 팝업을 띄우므로 여기선 켜기만 한다.
  const handleAutoCaptureToggle = useCallback(
    (next: boolean): void => {
      setAutoCapture(next);
      if (!next || photoPermission !== 'denied') return;
      Alert.alert(t('settings.autoCapture.permissionTitle'), t('settings.autoCapture.permissionBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.openSettings'), onPress: openSystemSettings },
      ]);
    },
    [photoPermission, setAutoCapture, openSystemSettings],
  );

  // 택배 토글. 최초 ON(미온보딩)이면 한계 고지 시트를 먼저 띄우고, 시트에서 확정될 때만
  // 유지한다(시트가 "나중에"면 원복). OFF는 즉시 반영.
  const handleParcelToggle = useCallback(
    (next: boolean): void => {
      if (next && !parcelOnboarded) {
        setParcelTracking(true);
        setParcelOnboardingOpen(true);
        return;
      }
      setParcelTracking(next);
    },
    [parcelOnboarded, setParcelTracking],
  );

  const handleParcelConfirm = useCallback((): void => {
    setParcelOnboarded(true);
    setParcelOnboardingOpen(false);
  }, [setParcelOnboarded]);

  const handleParcelCancel = useCallback((): void => {
    setParcelTracking(false);
    setParcelOnboardingOpen(false);
  }, [setParcelTracking]);

  // 데이터 삭제에 필요한 본인 식별자 + 삭제 후 목록 새로고침 신호.
  const userId = useAuthStore((state) => state.userId);
  const notifyDataChanged = useCaptureStore((state) => state.notifyDataChanged);

  // 실제 삭제 수행(확인 후). 본인 캡처·이미지·리포트·택배 기록을 영구 삭제하고 목록을 비운다.
  const runDeleteAllData = useCallback(async (): Promise<void> => {
    if (!userId) {
      toast.show({ tone: 'danger', title: t('settings.data.deleteError') });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAllUserData(userId);
      notifyDataChanged();
      toast.show({ tone: 'success', title: t('settings.data.deleteSuccess') });
    } catch (error) {
      console.error('[settings] 데이터 삭제 실패:', error);
      // 삭제는 단계별이라 중간 실패 시 일부만 지워졌을 수 있다. 삭제는 멱등하므로 재시도로 끝난다.
      // 목록도 새로고침해 부분 삭제분을 바로 반영하고, 정확한 문구로 재시도를 유도한다.
      notifyDataChanged();
      toast.show({ tone: 'danger', title: t('settings.data.deletePartialError') });
    } finally {
      setIsDeleting(false);
    }
  }, [userId, notifyDataChanged, toast]);

  // 되돌릴 수 없는 작업이라 무엇이 지워지고 무엇이 남는지 적은 확인을 한 번 더 받는다.
  const handleDeleteData = useCallback((): void => {
    if (isDeleting) return;
    Alert.alert(t('settings.data.deleteConfirm.title'), t('settings.data.deleteConfirm.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.data.deleteConfirm.confirm'),
        style: 'destructive',
        onPress: () => {
          void runDeleteAllData();
        },
      },
    ]);
  }, [isDeleting, runDeleteAllData]);

  const hasNickname = nickname.length > 0;

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header large title={t('settings.title')} topInset={insets.top} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: bottomClearance }]}
      >
        <Section label={t('settings.section.account')}>
          <ListItem
            leading={<Avatar fallback={hasNickname ? nickname : '?'} size="md" />}
            title={hasNickname ? nickname : t('settings.nickname.empty')}
            subtitle={t('settings.account.anonymous')}
            trailing={<Icon name="chevron-right" size={20} color="textSecondary" />}
            onPress={() => setNicknameSheetOpen(true)}
            accessibilityLabel={`${t('settings.nickname.title')}, ${hasNickname ? nickname : t('settings.nickname.empty')}`}
          />
        </Section>

        <Section label={t('settings.section.connections')}>
          <GoogleCalendarRow />
        </Section>

        <Section label={t('settings.section.permissions')}>
          <ListItem
            title={t('settings.autoCapture')}
            subtitle={autoCaptureBlocked ? t('settings.autoCapture.denied') : undefined}
            // 권한이 막힌 상태에선 행을 눌러 바로 설정 앱으로 갈 수 있게 한다(토글은 그대로 따로 동작).
            onPress={autoCaptureBlocked ? openSystemSettings : undefined}
            accessibilityLabel={
              autoCaptureBlocked
                ? `${t('settings.autoCapture')}, ${t('settings.autoCapture.denied')}`
                : undefined
            }
            trailing={
              <Switch
                // 권한이 막혀 실제로 동작하지 않으면 꺼짐으로 보인다("켜짐인데 안 됨" 같은 모순 상태 방지).
                // 이때 켜려고 하면 handleAutoCaptureToggle이 설정 앱 안내를 띄운다.
                value={autoCapture && !autoCaptureBlocked}
                onValueChange={handleAutoCaptureToggle}
                accessibilityLabel={t('settings.autoCapture')}
              />
            }
            showDivider
          />
          <ListItem
            title={t('settings.autoCalendar')}
            trailing={
              <Switch
                value={autoCalendar}
                onValueChange={setAutoCalendar}
                accessibilityLabel={t('settings.autoCalendar')}
              />
            }
            showDivider
          />
          <ListItem
            title={t('settings.weeklyReport')}
            subtitle={t('settings.weeklyReport.hint')}
            trailing={
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                accessibilityLabel={t('settings.weeklyReport')}
              />
            }
            showDivider
          />
          <ListItem
            title={t('settings.eventReminder.toggle')}
            subtitle={t('settings.eventReminder.toggleSubtitle')}
            trailing={
              <Switch
                value={eventReminder}
                onValueChange={setEventReminder}
                accessibilityLabel={t('settings.eventReminder.toggle')}
              />
            }
            showDivider={eventReminder}
          />
          {eventReminder ? (
            <SegmentRow label={t('settings.eventReminder.hour')}>
              <SettingsSegmented
                options={EVENT_REMINDER_HOUR_OPTIONS}
                value={String(eventReminderHour)}
                onChange={(v) => setEventReminderHour(Number.parseInt(v, 10))}
                label={t('settings.eventReminder.hour')}
              />
            </SegmentRow>
          ) : null}
        </Section>

        {showParcelSection ? (
          <Section label={t('settings.parcel.sectionTitle')}>
            <ListItem
              title={t('settings.parcel.toggleLabel')}
              subtitle={t('settings.parcel.toggleSubtitle')}
              trailing={
                <Switch
                  value={parcelTracking}
                  onValueChange={handleParcelToggle}
                  accessibilityLabel={t('settings.parcel.toggleLabel')}
                />
              }
            />
          </Section>
        ) : null}

        <Section label={t('settings.section.style')}>
          <SegmentRow label={t('settings.theme.title')} showDivider>
            <SettingsSegmented
              options={THEME_MODE_OPTIONS}
              value={themeMode}
              onChange={setThemeMode}
              label={t('settings.theme.title')}
            />
          </SegmentRow>
          <SegmentRow label={t('settings.tone')} hint={t('settings.tone.hint')}>
            <SettingsSegmented
              options={TONE_OPTIONS}
              value={tone}
              onChange={setTone}
              label={t('settings.tone')}
            />
          </SegmentRow>
        </Section>

        {/* 백업·내보내기는 미구현이라 노출하지 않는다(구현 시 이 섹션에 추가). */}
        <Section label={t('settings.section.data')}>
          <ListItem
            title={t('settings.data.delete')}
            subtitle={t('settings.data.deleteHint')}
            // 삭제는 다량 캡처면 수십 초 걸릴 수 있어 진행 중 스피너로 알린다.
            // onPress는 isDeleting 가드로 재진입을 막는다.
            trailing={
              isDeleting ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Icon name="trash-2" size={20} color="danger" />
              )
            }
            onPress={handleDeleteData}
          />
        </Section>
      </ScrollView>

      <NicknameEditSheet
        visible={isNicknameSheetOpen}
        onClose={() => setNicknameSheetOpen(false)}
      />

      {showParcelSection ? (
        <ParcelOnboardingSheet
          visible={isParcelOnboardingOpen}
          onCancel={handleParcelCancel}
          onConfirm={handleParcelConfirm}
        />
      ) : null}
    </View>
  );
}

/**
 * 사진 권한 상태 — 화면 진입 시, 그리고 앱이 포그라운드로 돌아올 때(설정 앱에서 바꿨을 수 있음) 다시 읽는다.
 * 네이티브 모듈이 없는 환경(웹·테스트)에선 'undetermined'가 와서 안내가 뜨지 않는다.
 */
function usePhotoPermission(): PermissionStatus {
  const [status, setStatus] = useState<PermissionStatus>('undetermined');

  useEffect(() => {
    let cancelled = false;
    const read = async (): Promise<void> => {
      const next = await getPermissionStatus();
      if (!cancelled) setStatus(next);
    };
    void read();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void read();
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  return status;
}

type SectionProps = {
  label: string;
  children: ReactNode;
};

/** 섹션 — mono 머리표 + 구분선 행 묶음. 바탕 면·카드 없이 화면 바탕 위에 둔다. */
function Section({ label, children }: SectionProps): ReactNode {
  return (
    <View style={styles.section}>
      <Eyebrow accessibilityRole="header" style={styles.sectionLabel}>
        {label}
      </Eyebrow>
      <View>{children}</View>
    </View>
  );
}

type SegmentRowProps = {
  label: string;
  hint?: string;
  showDivider?: boolean;
  children: ReactNode;
};

/** 제목 아래 가로 꽉 찬 세그먼트를 두는 행(트레일링에 넣기엔 칸이 좁다). */
function SegmentRow({ label, hint, showDivider = false, children }: SegmentRowProps): ReactNode {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.segmentRow}>
        <View style={styles.segmentRowText}>
          <Text variant="body">{label}</Text>
          {hint ? (
            <Text variant="caption" color="textSecondary">
              {hint}
            </Text>
          ) : null}
        </View>
        {children}
      </View>
      {showDivider ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.sm,
    gap: spacing['2xl'],
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
  },
  segmentRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  segmentRowText: {
    gap: spacing.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: spacing.lg,
  },
});
