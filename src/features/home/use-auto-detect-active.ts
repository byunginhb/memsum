import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useOnboardingStore } from '@/stores/onboarding-store';
import { useSettingsStore } from '@/stores/settings-store';

import { getPermissionStatus } from '../../../modules/photo-library-watcher';

/**
 * 자동 감지가 실제로 돌고 있는지 — 탭바 위 `● 감지 중` 표시용.
 *
 * use-auto-capture의 감지 조건(온보딩 완료 + 설정 autoCapture ON + 사진 권한)과 같다.
 * 권한은 설정 앱에서 바뀔 수 있어 앱이 앞으로 올 때마다 다시 확인한다(팝업은 띄우지 않는다).
 */
export function useAutoDetectActive(): boolean {
  const autoCapture = useSettingsStore((s) => s.autoCapture);
  const onboarded = useOnboardingStore((s) => s.completed);
  const [granted, setGranted] = useState(false);
  const wanted = autoCapture && onboarded;

  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    const check = async (): Promise<void> => {
      const status = await getPermissionStatus();
      if (alive) setGranted(status === 'granted' || status === 'limited');
    };
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, [wanted]);

  return wanted && granted;
}
