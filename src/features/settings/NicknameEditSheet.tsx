import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/design/components/Button/Button';
import { Input } from '@/design/components/Input/Input';
import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography, zIndex } from '@/design/tokens';
import { t } from '@/i18n';
import { useSettingsStore } from '@/stores/settings-store';

/** 닉네임 최대 길이 — 헤더/카드 한 줄에 들어오도록 제한. */
const NICKNAME_MAX_LENGTH = 20;

type NicknameEditSheetProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 닉네임 편집 Sheet — RN 내장 Modal 기반(CaptureSheet 선례, @gorhom 금지).
 *
 * KeyboardAvoidingView로 Android 키보드가 입력 필드를 가리지 않게 한다.
 * 열릴 때 스토어의 현재 닉네임을 로컬 초안으로 복사하고, 저장 시에만 setNickname으로 커밋한다
 * (취소 시 변경 폐기 — 불변 흐름). 닫기 후에는 초안을 비워 다음 오픈에서 최신값으로 다시 동기화.
 */
export function NicknameEditSheet({ visible, onClose }: NicknameEditSheetProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nickname = useSettingsStore((state) => state.nickname);
  const setNickname = useSettingsStore((state) => state.setNickname);

  // 로컬 초안: 저장 전까지 스토어를 건드리지 않아 취소 시 원복이 자연스럽다.
  const [draft, setDraft] = useState('');

  // 열릴 때마다 스토어의 최신 닉네임으로 초안을 동기화한다.
  // effect 대신 렌더 단계 prev-가드(React 권장 "prop 변화 시 상태 조정" 패턴) —
  // 캐스케이딩 렌더 없이 visible이 false→true로 바뀐 그 렌더에서 즉시 동기화한다.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(nickname);
  }

  // Input은 maxLength prop이 없으므로 입력 단계에서 길이를 강제한다(공유 컴포넌트 미변경).
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
          {/* 상단 빈 영역 탭 → 닫기(backdrop). */}
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.scrim }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
          />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.bgElevated,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
            accessibilityLabel={t('settings.nickname.title')}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {t('settings.nickname.title')}
            </Text>

            <Input
              variant="filled"
              size="md"
              label={t('settings.nickname.label')}
              placeholder={t('settings.nickname.placeholder')}
              value={draft}
              onChangeText={handleChange}
            />

            <View style={styles.actions}>
              <View style={styles.flexItem}>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={onClose}
                  accessibilityLabel={t('common.cancel')}
                >
                  {t('common.cancel')}
                </Button>
              </View>
              <View style={styles.flexItem}>
                <Button
                  variant="primary"
                  size="md"
                  onPress={handleSave}
                  accessibilityLabel={t('common.save')}
                >
                  {t('common.save')}
                </Button>
              </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: zIndex.overlay,
  },
  sheet: {
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    zIndex: zIndex.modal,
  },
  title: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  flexItem: {
    flex: 1,
  },
});
