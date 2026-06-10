import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/design/components/EmptyState/EmptyState';
import { Header } from '@/design/components/Header/Header';
import { useTheme } from '@/design/theme/useTheme';
import { t } from '@/i18n';

/**
 * 캘린더 탭(placeholder) — 감지된 일정 모음 화면의 자리.
 * 실제 Google Calendar 연동은 Week 9 예정. 지금은 large Header + 곧 출시 안내(EmptyState).
 */
export default function CalendarScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: colors.bgBase }]}>
      <Header large title={t('home.tab.calendar')} topInset={insets.top} />
      <View style={styles.body}>
        <EmptyState
          icon="calendar"
          title={t('home.calendar.soon.title')}
          body={t('home.calendar.soon.body')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
