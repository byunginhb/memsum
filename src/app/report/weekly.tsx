import { Stack, useLocalSearchParams } from 'expo-router';

import { WeeklyReportScreen } from '@/features/report/WeeklyReportScreen';
import { useSettingsStore } from '@/stores/settings-store';

/**
 * 주간 리포트 라우트 (/report/weekly).
 *
 * 선택적 weekStart 쿼리("YYYY-MM-DD")를 받아 특정 주를 연다. 미지정 시 이번 주.
 * 닉네임은 settings store(로컬 영속)에서 읽어 개인화 카피("{name} 님이…")에 쓴다.
 * 미설정(빈 문자열)이면 화면이 "이름 없음" 카피로 폴백한다.
 *
 * Header는 화면 내부 컴포넌트가 그리므로 라우터 헤더는 숨긴다.
 */
export default function WeeklyReportRoute() {
  const params = useLocalSearchParams<{ weekStart?: string }>();
  const nickname = useSettingsStore((state) => state.nickname);
  const weekStart =
    typeof params.weekStart === 'string' && params.weekStart.length > 0
      ? params.weekStart
      : undefined;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WeeklyReportScreen weekStart={weekStart} nickname={nickname} />
    </>
  );
}
