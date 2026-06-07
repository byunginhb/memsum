import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings-store';
import type { ToneStyle } from '@/stores/settings-store';

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
 * 데이터 섹션은 미구현이라 onPress 시 토스트로 "준비 중" 안내만 한다.
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
  const setAutoCapture = useSettingsStore((state) => state.setAutoCapture);
  const setAutoCalendar = useSettingsStore((state) => state.setAutoCalendar);
  const setWeeklyReport = useSettingsStore((state) => state.setWeeklyReport);
  const setTone = useSettingsStore((state) => state.setTone);

  // 다크모드는 theme-store가 단일 진실(설정 스토어에 중복 저장하지 않는다).
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);

  const [isNicknameSheetOpen, setNicknameSheetOpen] = useState(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // 미구현 데이터 동작 — 토스트로 준비 중 안내(공통 핸들러로 중복 제거).
  const showComingSoon = useCallback(() => {
    toast.show({ tone: 'info', title: t('settings.comingSoon') });
  }, [toast]);

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

        {/* 데이터 섹션 — 미구현(토스트 안내) */}
        <Section header={t('settings.section.data')}>
          <ListItem
            title={t('settings.data.backup')}
            trailing={<Icon name="chevron-right" size={20} color="textSecondary" />}
            onPress={showComingSoon}
          />
          <ListItem
            title={t('settings.data.export')}
            trailing={<Icon name="chevron-right" size={20} color="textSecondary" />}
            onPress={showComingSoon}
          />
          <ListItem
            title={t('settings.data.delete')}
            trailing={<Icon name="chevron-right" size={20} color="textSecondary" />}
            onPress={showComingSoon}
          />
        </Section>
      </ScrollView>

      <NicknameEditSheet
        visible={isNicknameSheetOpen}
        onClose={() => setNicknameSheetOpen(false)}
      />
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
  const { colors } = useTheme();
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
              isSelected ? { backgroundColor: colors.primaryMuted } : null,
              pressed ? styles.segmentPressed : null,
            ]}
          >
            <Text
              style={[
                styles.segmentLabel,
                { color: isSelected ? colors.primary : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {t(option.labelKey)}
            </Text>
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
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segmentPressed: {
    opacity: PRESSED_OPACITY,
  },
  segmentLabel: {
    fontSize: typography.bodySm.size,
    lineHeight: typography.bodySm.line,
    fontWeight: typography.bodyMd.weight,
    letterSpacing: letterSpacingFor('bodySm'),
  },
});
