import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Avatar } from '@/design/components/Avatar/Avatar';
import { Header } from '@/design/components/Header/Header';
import { ListItem } from '@/design/components/ListItem/ListItem';
import { Switch } from '@/design/components/Switch/Switch';
import { useToast } from '@/design/components/Toast';
import { Icon } from '@/design/icons/Icon';
import { useThemeStore } from '@/design/theme/theme-store';
import type { ThemeMode } from '@/design/theme/theme-store';
import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, radius, spacing, typography } from '@/design/tokens';
import { ParcelOnboardingSheet } from '@/features/parcel/components/ParcelOnboardingSheet';
import { getLocale, t } from '@/i18n';
import { deleteAllUserData } from '@/lib/account';
import { useAuthStore } from '@/stores/auth-store';
import { useCaptureStore } from '@/stores/capture-store';
import { useSettingsStore } from '@/stores/settings-store';
import type { ToneStyle } from '@/stores/settings-store';

import { GoogleCalendarRow } from './GoogleCalendarRow';
import { NicknameEditSheet } from './NicknameEditSheet';

/** 인라인 세그먼트 토글 최소 탭 높이 — 디자인시스템.md §10: 44pt. */
const SEGMENT_MIN_HEIGHT = 44;

/** 세그먼트 탭 시 opacity(Button/ListItem 선례 0.7). */
const PRESSED_OPACITY = 0.7;

/** 테마 모드 3택 옵션 — demo.theme.* i18n 키 재사용. */
const THEME_MODE_OPTIONS: readonly { value: ThemeMode; labelKey: string }[] = [
  { value: 'system', labelKey: 'demo.theme.system' },
  { value: 'light', labelKey: 'demo.theme.light' },
  { value: 'dark', labelKey: 'demo.theme.dark' },
];

/** 말투 2택 옵션 — settings.tone.* i18n 키. */
const TONE_OPTIONS: readonly { value: ToneStyle; labelKey: string }[] = [
  { value: 'friendly', labelKey: 'settings.tone.friendly' },
  { value: 'formal', labelKey: 'settings.tone.formal' },
];

/**
 * 설정 화면 — design.md §30.
 *
 * 계정 / 권한 / 스타일 / 데이터 섹션을 ScrollView로 구성한다.
 * 자동화 토글·닉네임·말투는 settings-store, 다크모드는 theme-store(단일 진실)에서 읽고 쓴다.
 * 데이터 섹션의 "내 데이터 삭제"는 실제 구현(확인 후 영구 삭제)이며, 백업·내보내기는 준비 중(토스트 안내)이다.
 */
export function SettingsScreen(): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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

  // 다크모드는 theme-store가 단일 진실(설정 스토어에 중복 저장하지 않는다).
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);

  const [isNicknameSheetOpen, setNicknameSheetOpen] = useState(false);
  const [isParcelOnboardingOpen, setParcelOnboardingOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 택배 토글은 한국(ko) 로케일에서만 노출한다.
  const showParcelSection = getLocale() === 'ko';

  // 택배 토글 변경. 최초 ON(미온보딩)이면 한계 고지 시트를 먼저 띄우고, 시트에서 확정될 때만
  // 켠다(여기서는 토글만 켜고 시트를 연다 — 시트가 "나중에"면 원복). OFF는 즉시 반영.
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

  // 온보딩 "시작하기" — 온보딩 완료 플래그 커밋(토글은 이미 ON).
  const handleParcelConfirm = useCallback((): void => {
    setParcelOnboarded(true);
    setParcelOnboardingOpen(false);
  }, [setParcelOnboarded]);

  // 온보딩 "나중에" — 토글 원복(OFF) + 시트 닫기.
  const handleParcelCancel = useCallback((): void => {
    setParcelTracking(false);
    setParcelOnboardingOpen(false);
  }, [setParcelTracking]);

  // 데이터 삭제에 필요한 본인 식별자 + 삭제 후 목록 새로고침 신호.
  const userId = useAuthStore((state) => state.userId);
  const notifyDataChanged = useCaptureStore((state) => state.notifyDataChanged);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // 실제 삭제 수행(확인 후). 본인 캡처·이미지·리포트를 영구 삭제하고 목록을 비운다.
  const runDeleteAllData = useCallback(async (): Promise<void> => {
    if (!userId) {
      toast.show({ tone: 'danger', title: t('settings.data.deleteError') });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteAllUserData(userId);
      // 홈·검색·캘린더 목록이 비워지도록 새로고침 신호를 보낸다.
      notifyDataChanged();
      toast.show({ tone: 'success', title: t('settings.data.deleteSuccess') });
    } catch (error) {
      console.error('[settings] 데이터 삭제 실패:', error);
      // 부분 실패 가능성: 삭제는 단계별로 진행돼 중간 실패 시 일부만 지워졌을 수 있다.
      // 삭제는 멱등하므로 재시도로 완료된다. 목록도 새로고침해 부분 삭제분을 즉시 반영하고,
      // "일부만 삭제됐을 수 있다"는 정확한 문구로 재시도를 유도한다("그대로다"로 오안내 방지).
      notifyDataChanged();
      toast.show({ tone: 'danger', title: t('settings.data.deletePartialError') });
    } finally {
      setIsDeleting(false);
    }
  }, [userId, notifyDataChanged, toast]);

  // 파괴적 작업이라 네이티브 확인 다이얼로그로 한 번 더 확인받는다.
  const handleDeleteData = useCallback((): void => {
    if (isDeleting) return;
    Alert.alert(
      t('settings.data.deleteConfirm.title'),
      t('settings.data.deleteConfirm.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.data.deleteConfirm.confirm'),
          style: 'destructive',
          onPress: () => {
            void runDeleteAllData();
          },
        },
      ],
    );
  }, [isDeleting, runDeleteAllData]);

  const accountTitle = nickname.length > 0 ? nickname : t('settings.nickname.empty');

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header
        title={t('settings.title')}
        topInset={insets.top}
        left={
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            hitSlop={spacing.sm}
            style={styles.backButton}
          >
            <Icon name="chevron-left" size={24} color="textPrimary" />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing['4xl'] },
        ]}
      >
        {/* 계정 섹션 */}
        <Section header={t('settings.section.account')}>
          <ListItem
            leading={<Avatar fallback={nickname.length > 0 ? nickname : '?'} size="md" />}
            title={accountTitle}
            subtitle={t('settings.account.anonymous')}
            trailing={<Icon name="chevron-right" size={20} color="textSecondary" />}
            onPress={() => setNicknameSheetOpen(true)}
          />
        </Section>

        {/* 연동 섹션 — 구글 캘린더 연결/해제 */}
        <Section header={t('settings.section.connections')}>
          <GoogleCalendarRow />
        </Section>

        {/* 권한·자동화 섹션 */}
        <Section header={t('settings.section.permissions')}>
          <ListItem
            title={t('settings.autoCapture')}
            trailing={
              <Switch
                value={autoCapture}
                onValueChange={setAutoCapture}
                accessibilityLabel={t('settings.autoCapture')}
              />
            }
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
          />
          <ListItem
            title={t('settings.weeklyReport')}
            trailing={
              <Switch
                value={weeklyReport}
                onValueChange={setWeeklyReport}
                accessibilityLabel={t('settings.weeklyReport')}
              />
            }
          />
        </Section>

        {/* 택배 · 배송 섹션 — 한국(ko) 로케일에서만 노출(MVP 게이트). */}
        {showParcelSection ? (
          <Section header={t('settings.parcel.sectionTitle')}>
            <ListItem
              leading={<Icon name="package" size={20} color="textSecondary" />}
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

        {/* 스타일 섹션 */}
        <Section header={t('settings.section.style')}>
          <ListItem
            title={t('settings.darkMode')}
            trailing={
              <Segmented
                options={THEME_MODE_OPTIONS}
                value={themeMode}
                onChange={setThemeMode}
                groupLabel={t('settings.darkMode')}
              />
            }
          />
          <ListItem
            title={t('settings.tone')}
            trailing={
              <Segmented
                options={TONE_OPTIONS}
                value={tone}
                onChange={setTone}
                groupLabel={t('settings.tone')}
              />
            }
          />
        </Section>

        {/* 데이터 섹션 — "내 데이터 삭제"는 실제 동작. 백업·내보내기는 미구현이라
            1.0에서 노출하지 않는다(준비 중 토스트 스텁 제거 — 구현 시 재노출). */}
        <Section header={t('settings.section.data')}>
          <ListItem
            title={t('settings.data.delete')}
            // 삭제는 수십 초 걸릴 수 있어(다량 캡처) 진행 중 스피너로 피드백한다.
            // onPress는 isDeleting 가드로 재진입을 막으므로 중복 삭제는 발생하지 않는다.
            trailing={
              isDeleting ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Icon name="chevron-right" size={20} color="textSecondary" />
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

type SectionProps = {
  header: string;
  children: ReactNode;
};

/** 섹션 헤더(caption/textSecondary) + 본문 행 묶음 — design.md §30 섹션 구성. */
function Section({ header, children }: SectionProps): ReactNode {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionHeader, { color: colors.textSecondary }]}
        accessibilityRole="header"
      >
        {header}
      </Text>
      <View style={[styles.sectionBody, { backgroundColor: colors.bgSurface }]}>
        {children}
      </View>
    </View>
  );
}

type SegmentedProps<T extends string> = {
  options: readonly { value: T; labelKey: string }[];
  value: T;
  onChange: (value: T) => void;
  /** 그룹 접근성 라벨(행 제목과 동일). */
  groupLabel: string;
};

/**
 * 인라인 세그먼트 토글 — ListItem trailing에 들어가는 N택 선택자.
 * 선택 항목은 primaryMuted 배경 + primary 텍스트로 강조한다(테마 토큰만 사용).
 * 각 세그먼트는 role=button + selected 상태로 노출하고 44pt 탭 영역을 보장한다.
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  groupLabel,
}: SegmentedProps<T>): ReactNode {
  const { colors, isDark } = useTheme();
  // 선택칸 채움 색: 흰 텍스트(onPrimary)와 WCAG AA(4.5:1)를 양 테마에서 모두 만족시키려면
  // 라이트는 더 진한 primaryHover(lavender700, 흰 글씨 6:1+), 다크는 primary(lavender300,
  // 어두운 글씨 6.4:1)를 쓴다. primary 단일 채움은 라이트에서 흰 글씨 3.97:1로 AA 미달.
  const selectedBg = isDark ? colors.primary : colors.primaryHover;
  return (
    <View
      style={[styles.segmentGroup, { backgroundColor: colors.bgMuted }]}
      accessibilityRole="radiogroup"
      accessibilityLabel={groupLabel}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={t(option.labelKey)}
            style={({ pressed }) => [
              styles.segment,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            {/* 채움 배경은 plain View에 둔다: NativeWind가 Pressable의 inline
                backgroundColor를 누락시켜(BottomBar 캡처 원과 동일 버그) 선택칸 채움이
                렌더되지 않는다. 배경이 정상 적용되는 일반 View로 pill을 그린다.
                채움(fill) 자체가 색 비의존 선택 단서가 된다(색맹·저시력 대응). */}
            <View
              style={[
                styles.segmentFill,
                isSelected ? { backgroundColor: selectedBg } : null,
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  { color: isSelected ? colors.onPrimary : colors.textSecondary },
                ]}
                numberOfLines={1}
              >
                {t(option.labelKey)}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  content: {
    paddingTop: spacing.lg,
    gap: spacing['2xl'],
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    fontSize: typography.caption.size,
    lineHeight: typography.caption.line,
    fontWeight: typography.caption.weight,
    letterSpacing: letterSpacingFor('caption'),
  },
  sectionBody: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  segmentGroup: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    minHeight: SEGMENT_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentPressed: {
    opacity: PRESSED_OPACITY,
  },
  // 선택 채움 pill(일반 View). 터치 영역(segment, 44pt)과 분리해 시각 칩만 담당한다.
  segmentFill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('bodySm'),
  },
});
