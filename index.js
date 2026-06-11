// 앱 엔트리.
// 1) expo-router 부팅(기존 main이던 'expo-router/entry'를 그대로 위임)
// 2) Android 헤드리스 태스크 등록 — 질문 알림의 [저장]을 앱 전환 없이 백그라운드 처리.
//    (등록은 엔트리에서 해야 HeadlessJsTaskService가 JS 런타임을 헤드리스로 부팅할 때 인식된다.)
import 'expo-router/entry';

import { AppRegistry } from 'react-native';

import { saveCaptureTask } from './src/tasks/save-capture-task';

// 이름은 네이티브 ScreenshotAskJobService.HEADLESS_TASK와 일치해야 한다.
AppRegistry.registerHeadlessTask('MemsumSaveCapture', () => saveCaptureTask);
