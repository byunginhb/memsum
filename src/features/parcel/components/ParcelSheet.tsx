import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Eyebrow } from '@/design/components/Eyebrow/Eyebrow';
import { Text } from '@/design/components/Text/Text';
import { useTheme } from '@/design/theme/useTheme';
import { elevation, radius, spacing, zIndex } from '@/design/tokens';
import { t } from '@/i18n';

type ParcelSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  /** 제목 위 mono 머리표(선택). 예: "택배". */
  eyebrow?: string;
  children: ReactNode;
};

/** 손잡이 크기 — 간격 토큰에서 가져온다(너비 40 · 높이 4). */
const HANDLE_WIDTH = spacing['4xl'];
const HANDLE_HEIGHT = spacing.xs;

/**
 * ParcelSheet — 택배 바텀시트 공통 골격(온보딩·수동 입력·택배사 선택).
 *
 * 떠 있는 면이라 bgSurface + 위쪽 반경 sheet(24) + 그림자(시트는 그림자 허용).
 * 왼쪽 정렬 제목(title) 위에 선택적 머리표. RN 내장 Modal + 딤 배경(탭하면 닫힘).
 * KeyboardAvoidingView로 안드로이드 키보드가 입력칸을 가리지 않게 한다.
 */
export function ParcelSheet({
  visible,
  onClose,
  title,
  eyebrow,
  children,
}: ParcelSheetProps): ReactNode {
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
              elevation[4],
              {
                backgroundColor: colors.bgSurface,
                paddingBottom: insets.bottom + spacing.lg,
              },
            ]}
            accessibilityViewIsModal
          >
            <View
              style={[styles.handle, { backgroundColor: colors.borderStrong }]}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <View style={styles.heading}>
              {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
              <Text variant="title" accessibilityRole="header">
                {title}
              </Text>
            </View>
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
});
