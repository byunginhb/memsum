import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/design/theme/useTheme';
import { letterSpacingFor, spacing, typography } from '@/design/tokens';

type HeaderProps = {
  /** 네비게이션 바 제목. */
  title: string;
  /** 좌측 슬롯 (뒤로가기 버튼 등). */
  left?: ReactNode;
  /** 우측 슬롯 (액션 버튼 등). */
  right?: ReactNode;
  /**
   * true면 iOS 큰 제목 스타일(34pt), false면 컴팩트(17pt).
   * Android는 항상 고정 56dp + 20sp 좌측 정렬 — 디자인시스템.md §3.9.
   */
  large?: boolean;
  /**
   * SafeArea top inset(px). 미지정 시 0 — 호출측이 useSafeAreaInsets()로 전달 책임.
   * Header 자체는 SafeAreaView를 쓰지 않아 레이아웃 유연성을 유지한다.
   */
  topInset?: number;
};

/** 플랫폼별 네비게이션 바 높이 — iOS 44 / Android 56 (Material). */
const BAR_HEIGHT = Platform.select({ ios: 44, default: 56 });

/**
 * Header — 디자인시스템.md §3.9
 * iOS: large=true → 큰제목(34pt) / false → 컴팩트(17pt)
 * Android: 고정 56dp, 제목 20sp 좌측 정렬
 * SafeArea top은 topInset prop으로 주입 (호출측 책임).
 */
export function Header({
  title,
  left,
  right,
  large = false,
  topInset = 0,
}: HeaderProps): ReactNode {
  const { colors } = useTheme();

  const isIOS = Platform.OS === 'ios';
  const showLarge = isIOS && large;

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: topInset,
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {/* 컴팩트 바 — iOS 항상 표시, Android 항상 표시 */}
      <View style={[styles.bar, { height: BAR_HEIGHT }]}>
        {/* 좌측 슬롯 */}
        <View style={styles.sideSlot}>{left ?? null}</View>

        {/* 중앙 제목 (컴팩트 / Android) */}
        {!showLarge ? (
          <View style={styles.titleCenter}>
            <Text
              style={[
                styles.titleCompact,
                isIOS
                  ? {
                      fontSize: typography.title.size,
                      fontWeight: typography.title.weight,
                      letterSpacing: letterSpacingFor('title'),
                    }
                  : {
                      fontSize: typography.bodyMd.size,
                      fontWeight: typography.bodyMd.weight,
                      textAlign: 'left',
                    },
                { color: colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          </View>
        ) : (
          // iOS compact 모드에서 large title이 있으면 중앙 제목 숨김
          <View style={styles.titleCenter} />
        )}

        {/* 우측 슬롯 */}
        <View style={styles.sideSlot}>{right ?? null}</View>
      </View>

      {/* iOS Large Title 영역 */}
      {showLarge ? (
        <View style={styles.largeSection}>
          <Text
            style={[
              styles.titleLarge,
              { color: colors.textPrimary },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sideSlot: {
    // 최소 탭 영역 확보 — 디자인시스템.md §10: 44pt
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
  titleCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCompact: {
    // Android는 좌측 정렬로 override
  },
  largeSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  titleLarge: {
    fontSize: typography.display.size,
    fontWeight: typography.display.weight,
    lineHeight: typography.display.line,
    letterSpacing: letterSpacingFor('display'),
  },
});
