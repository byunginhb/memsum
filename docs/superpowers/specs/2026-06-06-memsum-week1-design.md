# Memsum Week 1 — 설계 스펙 (로컬 iOS·Android 확인 가능 결과물)

- 작성: 2026-06-06
- 상태: 승인됨 (사용자 승인 후 실행 단계 진입)
- 출처 문서: `projectmd/`(CLAUDE.md, 마스터플랜, 기능명세, 디자인시스템, 개발환경, 브랜드, 페르소나, 개발기획서, 주차별/W1-수정)

## 1. 목표 (합격 기준 = 문서 Week 1 종료 체크리스트)
- iOS 시뮬레이터 `expo run:ios` 빌드·실행 성공
- Android 에뮬레이터 `expo run:android` 빌드·실행 성공
- iOS 스크린샷(Cmd+S) → Metro 콘솔 `[Screenshot]` 로그
- Android 스크린샷 → Metro 콘솔 `[Screenshot]` 로그
- 양쪽에서 라벤더 Button·Card 동일 렌더 + 다크모드 전환
- Supabase `user_profiles`·`captures` 테이블 + RLS + (사용자 키 입력 시) 더미 INSERT

## 2. 범위
- 포함: Expo 앱 셋업, 디자인 토큰+Button/Card, PhotoLibraryWatcher(iOS Swift + Android Kotlin), Supabase 클라이언트+마이그레이션, i18n 최소, 다크모드, Pretendard 폰트
- 제외(다음 주): OCR, Share Extension, Widget, Siri, WebView, 결제, Storybook, 나머지 8개 컴포넌트, OpenAI/Sentry/PostHog 연동

## 3. 기술 스택 (확정)
- Expo SDK 56 / React Native 0.85 / React 19.2 / TypeScript 6
- 네비게이션: Expo Router (`src/app`)
- 스타일: NativeWind v4 (Tailwind 토큰 매핑) — gluestack-ui v2는 호환 리스크로 보류
- 상태: Zustand (테마)
- 네이티브: Expo Modules API (Swift / Kotlin) — CNG/prebuild
- 백엔드: Supabase (사용자 키 직접 제공)
- 아이콘: lucide-react-native / 폰트: Pretendard·Inter (expo-font)

## 4. 폴더 구조 (목표)
```
src/
  app/            # Expo Router 화면 (데모: Button/Card + 스크린샷 로그 + 다크모드 토글)
  design/
    tokens/       # colors·typography·spacing·radius·elevation·motion
    theme/        # ThemeProvider·useTheme·platform(haptic)
    components/   # Button·Card (문서 §3.1·3.2)
    icons/        # Icon (lucide 래퍼)
  hooks/
    use-screenshot-watcher.ts   # 네이티브 모듈 구독 훅 (B가 구현)
  lib/supabase.ts # 클라이언트 싱글톤 (env 없으면 graceful 스킵)
  i18n/           # ko.json·en.json (최소 키)
modules/
  photo-library-watcher/        # iOS Swift + Android Kotlin + 권한 plugin
supabase/migrations/0001_init.sql
```

## 5. 멀티 에이전트 오케스트레이션
- P0 부트스트랩(오케스트레이터 직접): 앱 병합·pnpm·의존성·메타·네이티브 모듈 스캐폴드·공유 계약 파일
- P1 병렬 에이전트: **A** 디자인 시스템(executor·opus) / **C** Supabase+i18n(executor) / **B** 네이티브 모듈 채우기(executor·opus)
  - 파일 소유 분리: A=src/design·src/app·src/components·nativewind config / C=src/lib·src/i18n·supabase / B=modules/·src/hooks/use-screenshot-watcher·app.json plugin
- P2 통합·빌드(직접, 백그라운드): prebuild --clean → run:ios / run:android. 에러는 build-error-resolver/debugger
- P3 검증(독립 레인): code-reviewer(디자인 규칙 15) + verifier(Week1 체크리스트, 증거 기반)

## 6. 공유 계약 (에이전트 간 인터페이스)
- `src/hooks/use-screenshot-watcher.ts`: `useScreenshotWatcher(): { events: ScreenshotEvent[] }`
  - `ScreenshotEvent = { id: string; createdAt: number; platform: 'ios'|'android'; raw?: unknown }`
  - P0가 스텁 생성 → B가 실제 네이티브 구독으로 교체
- `modules/photo-library-watcher` index: `addScreenshotListener(cb)` + `start()/stop()`
- 데모 화면(A)은 위 훅을 구독해 `[Screenshot]` 로그를 콘솔+화면 패널에 표시

## 7. 리스크
- 최신 스택(RN0.85/React19/Xcode26)에서 첫 네이티브 빌드 호환 이슈 → build-error-resolver/debugger 대응
- NativeWind v4 ↔ RN0.85 호환 → 실패 시 토큰 기반 StyleSheet로 폴백(토큰이 SSOT라 컴포넌트 API 불변)
- pnpm 동시 install 경합 → 오케스트레이터가 모든 의존성 선설치, 에이전트는 코드만 작성

## 8. 사용자 액션
`docs/USER_ACTIONS.md` 참조 (Supabase 키, 권한 허용 탭).
