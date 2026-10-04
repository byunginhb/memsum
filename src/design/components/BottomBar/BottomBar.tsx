import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/design/components/PressableScale/PressableScale';
import { Text } from '@/design/components/Text/Text';
import { Icon } from '@/design/icons/Icon';
import type { IconName } from '@/design/icons/Icon';
import { useTheme } from '@/design/theme/useTheme';
import { elevation, motion, radius, spacing } from '@/design/tokens';
import { usePhotoImport } from '@/hooks/use-photo-import';
import { t } from '@/i18n';

import type { BottomBarProps, BottomBarTab } from './BottomBar.types';

/** 알약 높이. */
const BAR_HEIGHT = 64;
/** 가운데 가져오기 코발트 원 지름. */
const IMPORT_SIZE = 48;
/** 활성 형광펜 점 지름. */
const ACTIVE_DOT = 6;
/** 활성 점 위쪽 가장자리의 알약 중심 아래 거리(아이콘 24 아래 4px 띄움). */
const ACTIVE_DOT_OFFSET = 16;
/** 화면 아래에서 떠 있는 최소 간격(홈 인디케이터 없는 기기). */
const FLOAT_GAP = spacing.md;
/** 감지 표시 줄 높이(mono 16 + 간격). */
const DETECTING_ROW = 16 + spacing.xs;
/** 5칸(탭 4 + 가져오기 1). 가운데가 가져오기. */
const SLOT_COUNT = 5;
const IMPORT_SLOT = 2;

const TABS: readonly (BottomBarTab & { slot: number })[] = [
  { routeName: 'index', icon: 'home', labelKey: 'home.tab.home', slot: 0 },
  { routeName: 'search', icon: 'search', labelKey: 'home.tab.search', slot: 1 },
  { routeName: 'calendar', icon: 'calendar', labelKey: 'home.tab.calendar', slot: 3 },
  { routeName: 'settings', icon: 'settings', labelKey: 'home.tab.settings', slot: 4 },
];

/**
 * 탭 화면이 스크롤 콘텐츠 하단에 줘야 할 여백(px). 탭바가 콘텐츠 위에 떠 있으므로
 * 마지막 행이 가리지 않게 contentContainerStyle paddingBottom에 쓴다.
 */
export function useBottomBarClearance(): number {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, FLOAT_GAP) + BAR_HEIGHT + DETECTING_ROW + spacing.lg;
}

/**
 * 하단 탭바 — 바닥에서 떨어진 잉크색 알약(명세 §6).
 *
 * 아이콘만 보이고 활성 탭 아래에 형광펜 점이 레이아웃 스프링으로 미끄러진다.
 * 가운데 코발트 원은 라우트가 아니라 "사진첩에서 가져오기" 액션(usePhotoImport).
 * detecting이면 알약 위에 `● 감지 중` mono 표시. 콘텐츠 위에 떠 있으므로 화면은
 * useBottomBarClearance()만큼 하단 여백을 둔다.
 */
export function BottomBar({
  state,
  navigation,
  detecting = false,
  detectingLabel,
}: BottomBarProps): ReactNode {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { onImport, isImporting } = usePhotoImport();
  const [barWidth, setBarWidth] = useState(0);

  const activeRouteName = state.routes[state.index]?.name;
  const activeSlot = TABS.find((tab) => tab.routeName === activeRouteName)?.slot ?? -1;

  const slotWidth = barWidth / SLOT_COUNT;
  // -1 = 아직 자리 안 잡음 → 첫 배치는 미끄러지지 않고 바로 놓는다.
  const dotX = useSharedValue(-1);
  const dotVisible = activeSlot >= 0 && barWidth > 0;

  useEffect(() => {
    if (!dotVisible) return;
    const target = slotWidth * activeSlot + slotWidth / 2 - ACTIVE_DOT / 2;
    const jump = reducedMotion || dotX.value < 0;
    dotX.value = jump ? target : withSpring(target, motion.spring.layout);
  }, [dotVisible, slotWidth, activeSlot, reducedMotion, dotX]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value }],
  }));

  const handleLayout = (e: LayoutChangeEvent): void => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const showDetecting = detecting && !!detectingLabel;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, { paddingBottom: Math.max(insets.bottom, FLOAT_GAP) }]}
    >
      {showDetecting ? (
        <View style={styles.detecting} accessibilityRole="text" accessibilityLabel={detectingLabel}>
          <View style={[styles.detectingDot, { backgroundColor: colors.primary }]} />
          <Text variant="mono" color="textSecondary">
            {detectingLabel}
          </Text>
        </View>
      ) : (
        <View style={{ height: DETECTING_ROW }} />
      )}

      <View
        onLayout={handleLayout}
        accessibilityRole="tablist"
        style={[styles.bar, elevation[4], { backgroundColor: colors.barBg }]}
      >
        {dotVisible ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.activeDot, { backgroundColor: colors.marker }, dotStyle]}
          />
        ) : null}

        {Array.from({ length: SLOT_COUNT }, (_, slot) => {
          if (slot === IMPORT_SLOT) {
            return (
              <View key="import" style={styles.slot}>
                <PressableScale
                  onPress={onImport}
                  disabled={isImporting}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isImporting }}
                  accessibilityLabel={t('home.tab.capture')}
                  accessibilityHint={t('home.tab.captureHint')}
                  style={[styles.importCircle, { backgroundColor: colors.primary }]}
                >
                  <Icon name="images" size={24} color="onPrimary" />
                </PressableScale>
              </View>
            );
          }
          const tab = TABS.find((item) => item.slot === slot);
          // 라우트가 (tabs)에 등록돼 있을 때만 그린다(미등록 시 빈 칸).
          if (!tab || !state.routes.some((r) => r.name === tab.routeName)) {
            return <View key={`empty-${slot}`} style={styles.slot} />;
          }
          return (
            <TabItem
              key={tab.routeName}
              icon={tab.icon}
              label={t(tab.labelKey)}
              isActive={activeSlot === slot}
              onPress={() => navigation.navigate(tab.routeName)}
            />
          );
        })}
      </View>
    </View>
  );
}

type TabItemProps = {
  icon: IconName;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

function TabItem({ icon, label, isActive, onPress }: TabItemProps): ReactNode {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
      containerStyle={styles.slot}
      style={styles.tab}
    >
      <Icon name={icon} size={24} color={isActive ? 'barFg' : 'barFgMuted'} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing['2xl'],
  },
  detecting: {
    height: DETECTING_ROW,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  detectingDot: {
    width: ACTIVE_DOT,
    height: ACTIVE_DOT,
    borderRadius: radius.pill,
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slot: {
    flex: 1,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tab: {
    width: BAR_HEIGHT,
    height: BAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importCircle: {
    width: IMPORT_SIZE,
    height: IMPORT_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDot: {
    position: 'absolute',
    left: 0,
    top: BAR_HEIGHT / 2 + ACTIVE_DOT_OFFSET,
    width: ACTIVE_DOT,
    height: ACTIVE_DOT,
    borderRadius: radius.pill,
  },
});
