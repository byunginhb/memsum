import { SettingsScreen } from '@/features/settings/SettingsScreen';

/**
 * /settings 라우트 — design.md §30.
 * 화면 구현은 features/settings/SettingsScreen에 위임한다(라우트는 마운트만 담당).
 * default export는 app/ 라우터 규약에 따른다.
 */
export default function SettingsRoute() {
  return <SettingsScreen />;
}
