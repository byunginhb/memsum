# Memsum — Claude Code 컨텍스트

> 이 문서는 Claude Code가 매 세션마다 자동으로 읽는 컨텍스트 파일입니다.
> **이 파일은 프로젝트 루트(`memsum/CLAUDE.md`)에 복사해야 합니다.**
> 사용자는 코드를 직접 작성하지 않습니다. 모든 코드 생성은 Claude Code가 이 문서를 근거로 일관되게 수행해야 합니다.

---

## 1. 프로젝트 개요

**Memsum**(Memory + Summary)은 스크린샷을 자동으로 감지해 OCR → GPT 후처리 → 구글 캘린더 자동 등록 → 주간 5줄 리포트까지 한 번에 처리하는 iOS·Android 앱이다. 타깃은 "스크린샷을 1,000장 넘게 쌓아두지만 다시 안 보는 사람"(대표 페르소나: 이수현, 34세 디지털 마케터, 사진첩 스크린샷 1,847장). 1인 풀타임 개발자가 RN/TypeScript 경험을 활용해 만들고, Swift/Kotlin 네이티브 모듈은 Claude Code가 100% 작성한다.

---

## 2. 기술 스택 한눈에 보기

| 카테고리 | 선택 | 비고 |
|---|---|---|
| 클라이언트 | Expo React Native (Bare Workflow) + TypeScript | Expo Modules API 사용 |
| iOS 네이티브 | Swift 5+ | PhotoKit, Vision, WidgetKit, App Intents |
| Android 네이티브 | Kotlin | ContentObserver, ML Kit, Glance Widget |
| WebView/웹 | Next.js 15 (App Router) + shadcn/ui + Tailwind | Vercel 호스팅 |
| 백엔드 | Supabase (Postgres + pgvector + Edge Functions + Storage + Auth) | RLS 필수 |
| AI | OpenAI `gpt-4o-mini` + `text-embedding-3-small` | Edge Function에서만 호출 |
| 결제 | Apple IAP + Google Play Billing | `react-native-iap` |
| 푸시 | APNs(iOS) + FCM(Android) | Expo Notifications 래핑 |
| 관측 | Sentry + PostHog | dev 빌드에서 비활성화 옵션 |
| 상태관리 | Zustand | Context API 남용 금지 |
| 디자인 시스템 | gluestack-ui v2 + NativeWind | 디자인시스템.md 참조 |

---

## 3. 폴더 구조

```
memsum/
├── app/                          # Expo Router 화면 (파일 기반 라우팅)
│   ├── (tabs)/
│   ├── _layout.tsx
│   └── +not-found.tsx
├── modules/                      # 커스텀 네이티브 모듈
│   ├── photo-library-watcher/    # 스크린샷 자동 감지
│   ├── share-extension/          # iOS Share Extension, Android Share Intent
│   ├── vision-ocr/               # iOS Vision + Android ML Kit
│   ├── widget/                   # iOS WidgetKit + Android Glance
│   └── siri-intents/             # iOS App Intents + Android Assistant
├── src/
│   ├── design/                   # 디자인 시스템 (토큰·컴포넌트·테마)
│   ├── components/               # 도메인 컴포넌트
│   ├── features/                 # capture/ report/ settings/
│   ├── lib/                      # supabase·openai·utils
│   ├── hooks/
│   ├── stores/                   # Zustand
│   └── i18n/                     # ko.json · en.json
├── ios/                          # prebuild 결과 (커밋 필수)
├── android/                      # prebuild 결과 (커밋 필수)
├── memsum-web/                   # Next.js WebView 앱
└── supabase/
    ├── migrations/
    └── functions/
```

---

## 4. 명령어 모음

```bash
# 개발
npm install
npx pod-install ios
npx expo start
npx expo run:ios
npx expo run:android
npx expo prebuild --clean

# 빌드 (EAS — 시뮬레이터 단계 끝난 후)
eas build --profile development --platform ios
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
eas submit --platform ios

# Supabase
supabase start
supabase db push
supabase db diff -f <name>
supabase functions deploy <name>
supabase functions serve

# 품질
npm test
npm run lint
npm run typecheck

# 웹 (memsum-web)
cd memsum-web && pnpm dev
cd memsum-web && pnpm build
vercel --prod
```

---

## 5. 코딩 컨벤션

- TypeScript **strict 모드**, `noImplicitAny: true`, `strictNullChecks: true`
- React 함수 컴포넌트 + 훅만. 클래스 컴포넌트 금지
- 파일 명명
  - 컴포넌트: `PascalCase.tsx`
  - 그 외: `kebab-case.ts`
- import 순서: `react/react-native` → 외부 라이브러리 → `@/` alias → 상대 경로
- export는 named export 우선. default는 `app/` 라우터에서만
- 색·간격·폰트는 **반드시 `src/design/` 토큰 사용**. 하드코딩 금지
  - ❌ `color: '#7C6FE8'`
  - ✅ `color: tokens.color.primary`
- 한국어가 메인이지만 모든 문구는 i18n 키 (`t("home.welcome")`)
- 주석은 **왜(why)** 중심. 코드만 봐도 아는 what은 안 씀
- 비동기는 `async/await`. Promise 체이닝 금지
- 매직넘버는 상수로 추출

---

## 6. 네이티브 모듈 작성 룰

- 새 모듈은 `modules/<kebab-case>/`에 `npx create-expo-module --local <name>`로 스캐폴드
- iOS: **Swift + Expo Modules API**, Android: **Kotlin + Expo Modules API**
- 권한 요청은 별도 함수 분리: `requestPermission(): Promise<PermissionStatus>`
- 이벤트는 `EventEmitter`로 노출 (예: `onScreenshotDetected`)
- 옵저버·콜백·리스너 해제 필수
  - iOS: `PHPhotoLibrary.shared().unregisterChangeObserver(self)`
  - Android: `contentResolver.unregisterContentObserver(observer)`
- 권한 키 자동 추가 (config plugin):
  - iOS: `NSPhotoLibraryUsageDescription`
  - Android: `READ_MEDIA_IMAGES`
- 모듈마다 `index.ts`에 TypeScript 타입 export 필수
- 네이티브 코드 변경 후 반드시 `npx expo prebuild --clean` 안내

---

## 7. Supabase 사용 규칙

- **모든 테이블에 RLS 활성화**. 예외 없음
- 사용자 데이터 테이블은 `user_id uuid not null references auth.users(id)` 컬럼 필수
- 정책 예시:
  ```sql
  create policy "users read own"
    on captures for select
    using (auth.uid() = user_id);
  ```
- Edge Function 경로: `supabase/functions/<name>/index.ts`
- 비밀 키:
  - 클라이언트: `EXPO_PUBLIC_*` (anon key까지만)
  - 서버: `supabase secrets set OPENAI_API_KEY=...`
- 마이그레이션: `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`
- pgvector: `ivfflat (embedding vector_cosine_ops) with (lists = 100)`
- **OpenAI 호출은 반드시 Edge Function에서만**. 클라이언트 직접 호출 금지

---

## 8. 커밋 메시지 규칙 (Conventional Commits)

```
feat:     새 기능
fix:      버그 수정
refactor: 기능 변화 없는 코드 개선
docs:     문서만 변경
chore:    빌드·설정·의존성
style:    포맷·세미콜론
test:     테스트 추가/수정
perf:     성능 개선
```

**예시**:
```
feat(ocr): iOS Vision Framework 한국어 인식 모듈 추가
fix(watcher): Android 13에서 ContentObserver 미발화 해결
refactor(lib): supabase 클라이언트 싱글톤화
docs(claude): 네이티브 모듈 룰 추가
chore(deps): expo SDK 51 → 52 업그레이드
```

---

## 9. 흔한 함정 & 해결

| 함정 | 증상 | 해결 |
|---|---|---|
| 사진 권한 미요청 | 첫 실행 크래시 | `Info.plist`/`AndroidManifest.xml` + 런타임 요청 |
| `npx expo prebuild` 후 `ios/`·`android/` 미커밋 | CI 빌드 실패 | 두 폴더 모두 커밋 |
| `PHPhotoLibraryChangeObserver` 미해제 | 메모리 누수 | `deinit`에서 unregister |
| Supabase RLS 정책 누락 | 데이터 노출 | 테이블 생성과 동시에 정책 작성 |
| iOS·Android 폰트 폴백 차이 | 한글 깨짐 | Pretendard를 양쪽 asset에 포함 |
| Android 키보드가 입력 필드 가림 | UX 깨짐 | `KeyboardAvoidingView` + `android:windowSoftInputMode` |
| OpenAI 키 클라이언트 노출 | 비용 폭탄 | 반드시 Edge Function 경유 |

---

## 10. 작업 흐름 (사용자 ↔ Claude Code)

1. 사용자가 자연어로 지시 ("스크린샷 감지 모듈 만들어줘")
2. Claude Code는 이 문서·디자인시스템.md 규칙대로 **명령·코드·파일** 한 번에 생성
3. 빌드/실행 명령은 항상 명시 (사용자 그대로 복붙)
4. **첫 단계 목표는 시뮬레이터·에뮬레이터까지**. 실기기·스토어 제출은 이후
5. 사용자가 직접 해야 할 (Claude Code가 대신 못 함):
   - Apple Developer Program 결제 / App Store Connect (나중에)
   - Google Play Console 결제 (나중에)
   - 외부 API 키 발급 (OpenAI, Google Cloud)
   - 도메인 구매 (나중에)
   - GUI 클릭 (Xcode 인증서, Android Studio AVD 등)
6. **막힐 때 디버깅 흐름**:
   - 에러 로그 전체 → 사용자가 Claude Code에 붙여넣기
   - Claude Code는 원인 진단 → 최소 변경 패치 → 재현 확인 명령
   - **추정 금지. 로그·코드 근거로만 진단**

---

## 11. 관련 문서 (Obsidian Vault)

작업 전에 아래 노트를 먼저 참조. 모두 `/Users/byunginsong/Documents/Obsidian Vault/idea/아이디어/Memsum/` 하위.

- `개발기획서.md` — 제품 요구사항
- `기능명세.md` — 화면·플로우·DB·API 명세
- **`디자인시스템.md`** — 토큰·컴포넌트·라이브러리 (gluestack-ui v2)
- `페르소나.md` — 이수현 외 페르소나·시나리오
- `마스터플랜.md` — 16주 로드맵
- `주차별/W1-수정.md` — 현재 진행 중인 주차 가이드
- `개발환경.md` — 로컬 macOS 셋업
