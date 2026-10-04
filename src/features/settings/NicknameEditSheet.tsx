import { useState } from 'react';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/design/components/Button/Button';
import { Input } from '@/design/components/Input/Input';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { elevation, radius, spacing, zIndex } from '@/design/tokens';
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings-store';

/** 호칭 최대 길이 — 리포트 소개 한 줄에 들어오도록 제한. */
const NICKNAME_MAX_LENGTH = 20;
/** 손잡이 크기 — 간격 토큰(너비 40 · 높이 4). ParcelSheet와 같다. */
const HANDLE_WIDTH = spacing['4xl'];
const HANDLE_HEIGHT = spacing.xs;

type NicknameEditSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 호칭 편집 시트 — RN 내장 Modal(@gorhom 금지 선례).
 *
 * 떠 있는 면(bgSurface) + 위쪽 반경 sheet + 손잡이, 밑줄형 입력, 하단 버튼 두 개.
 * 열릴 때 스토어의 현재 호칭을 로컬 초안으로 복사하고 저장할 때만 커밋한다(취소 시 폐기).
 * KeyboardAvoidingView로 안드로이드 키보드가 입력칸을 가리지 않게 한다.
 */
export function NicknameEditSheet({ visible, onClose }: NicknameEditSheetProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nickname = useSettingsStore((state) => state.nickname);
  const setNickname = useSettingsStore((state) => state.setNickname);

  // 로컬 초안: 저장 전까지 스토어를 건드리지 않아 취소 시 원복이 자연스럽다.
  const [draft, setDraft] = useState('');

  // 열릴 때마다 최신 호칭으로 초안을 맞춘다. effect 대신 렌더 단계 prev-가드
  // (React 권장 "prop 변화 시 상태 조정" 패턴) — 캐스케이딩 렌더 없이 즉시 동기화.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(nickname);
  }

  // Input에 maxLength가 없어 입력 단계에서 길이를 강제한다(공용 컴포넌트 미변경).
  const handleChange = (value: string): void => {
    setDraft(value.slice(0, NICKNAME_MAX_LENGTH));
  };

  const handleSave = (): void => {
    setNickname(draft.trim());
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.scrim }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View
            style={[
              styles.sheet,
              elevation[4],
              { backgroundColor: colors.bgSurface, paddingBottom: insets.bottom + spacing.lg },
            ]}
            accessibilityViewIsModal
          >
            <View
              style={[styles.handle, { backgroundColor: colors.borderStrong }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={styles.heading}>
              <Text variant="title" accessibilityRole="header">
                {t('settings.nickname.title')}
              </Text>
              <Text variant="caption" color="textSecondary">
                {t('settings.nickname.helper')}
              </Text>
            </View>

            <Input
              variant="underline"
              size="md"
              label={t('settings.nickname.label')}
              placeholder={t('settings.nickname.placeholder')}
              value={draft}
              onChangeText={handleChange}
            />

            <View style={styles.actions}>
              <Button
                variant="secondary"
                size="lg"
                onPress={onClose}
                accessibilityLabel={t('common.cancel')}
                style={styles.flexItem}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="lg"
                onPress={handleSave}
                accessibilityLabel={t('common.save')}
                style={styles.flexItem}
              >
                {t('common.save')}
              </Button>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: zIndex.overlay,
  },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.lg,
    zIndex: zIndex.modal,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radius.pill,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  heading: {
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
});
