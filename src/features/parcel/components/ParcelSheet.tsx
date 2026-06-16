import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme/useTheme';
import { radius, spacing, typography, zIndex } from '@/design/tokens';
import { t } from '@/i18n';

type ParcelSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * ParcelSheet — 택배 바텀시트 공통 컨테이너(NicknameEditSheet 선례 재사용).
 *
 * RN 내장 Modal + backdrop + 상단 핸들. @gorhom 금지(현재 스택에서 silent fail).
 * KeyboardAvoidingView로 Android 키보드가 입력을 가리지 않게 한다(수동 입력 시트용).
 * 온보딩·수동입력·택배사선택 3개 시트가 같은 골격을 공유한다(중복 제거).
 */
export function ParcelSheet({ visible, onClose, title, children }: ParcelSheetProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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
              {
                backgroundColor: colors.bgElevated,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
            accessibilityLabel={title}
          >
            <View style={[styles.handle, { backgroundColor: colors.borderStrong }]} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {children}
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
    paddingTop: spacing.md,
    gap: spacing.lg,
    zIndex: zIndex.modal,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    alignSelf: 'center',
  },
  title: {
    fontSize: typography.title.size,
    lineHeight: typography.title.line,
    fontWeight: typography.title.weight,
  },
});
