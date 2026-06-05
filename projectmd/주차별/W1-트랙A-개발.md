---
tags: [개발, Week1, 트랙A, Swift, Expo, PhotoLibraryWatcher]
created: 2026-05-31
week: 1
track: "A (개발)"
status: "Day 0 — 시작 대기"
마스터플랜: "[[아이디어/Memsum/마스터플랜|마스터플랜]]"
---

# Memsum Week 1 개발 가이드

> **목표**: 16주 여정의 첫 발. 인프라 셋업 + Swift 입문 + 첫 네이티브 모듈 Hello World.
> **원칙**: 매일 끝내고 잘 수 있을 만큼만. 완벽보다 동작.

---

## Day 1 (월) — Expo Bare Workflow 셋업 + Apple Developer 결제

### 오전 (4h) — 프로젝트 부트스트랩
- **09:00–10:00** Node 20 LTS + Xcode 16 + CocoaPods 최신화 (`brew install cocoapods`, `sudo xcode-select --install`)
- **10:00–11:00** Expo 프로젝트 생성 + TypeScript 설정
  ```bash
  npx create-expo-app@latest memsum --template blank-typescript
  cd memsum
  npx expo prebuild --platform ios   # Bare Workflow로 전환
  ```
- **11:00–13:00** Git 초기 커밋 + GitHub Private 저장소 생성 (`memsum`). 기본 폴더 구조 잡기
  ```
  memsum/
  ├── app/                # 화면 (expo-router 추후)
  ├── modules/            # 네이티브 모듈 (PhotoLibraryWatcher 등)
  ├── lib/                # supabase, posthog, sentry 클라이언트
  ├── ios/                # 네이티브 iOS
  ├── android/            # 사용 안 함 (지금은)
  └── .env.local
  ```

### 오후 (4h) — Apple Developer Program 등록
- **14:00–15:00** [developer.apple.com](https://developer.apple.com/programs/enroll/) 접속 → 개인 계정(Individual) 등록 시작
- **15:00–16:00** 결제 ($99/년). 승인 대기 (보통 24~48시간, 길면 1주)
- **16:00–17:00** Bundle ID 후보 정하기: `com.byungin.memsum`. App Store Connect 사전 가입 준비
- **17:00–18:00** iOS 시뮬레이터에 첫 빌드 확인
  ```bash
  npx expo run:ios
  ```

**산출물**: GitHub repo, Bare Workflow 프로젝트, Apple Developer 결제 완료.

---

## Day 2 (화) — Supabase + Sentry + PostHog 셋업

### 오전 (4h) — Supabase 프로젝트
- **09:00–10:00** Supabase 가입 → 프로젝트 생성 (Region: Northeast Asia/Seoul)
- **10:00–12:00** 초기 스키마 SQL 실행 (아래 SQL 섹션 참고)
- **12:00–13:00** Anon Key + URL을 `.env.local`에 저장
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  ```

### 오후 (4h) — 클라이언트 SDK + 관측
- **14:00–15:00** `@supabase/supabase-js` 설치 + `lib/supabase.ts` 작성
  ```typescript
  import { createClient } from '@supabase/supabase-js';
  export const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
  );
  ```
- **15:00–16:00** Sentry 셋업 (`npx @sentry/wizard@latest -i reactNative`)
- **16:00–17:00** PostHog 셋업 (`posthog-react-native`) + 첫 이벤트 `app_opened` 발사
- **17:00–18:00** Supabase에서 `captures` 테이블에 더미 row INSERT 테스트

**산출물**: Supabase 스키마 완성, 앱 → Supabase INSERT 성공, Sentry/PostHog 첫 이벤트 수신.

---

## Day 3 (수) — EAS Build + TestFlight 첫 빌드

### 오전 (4h) — EAS Build 셋업
- **09:00–10:00** `eas-cli` 설치 + 로그인 (`npm i -g eas-cli && eas login`)
- **10:00–11:00** `eas init` → `eas.json` 생성 (아래 예제 참고)
- **11:00–13:00** Apple Developer 승인 안 났으면 시뮬레이터 빌드 먼저
  ```bash
  eas build --profile development --platform ios --local
  ```

### 오후 (4h) — TestFlight 업로드 (승인 났을 때)
- **14:00–16:00** Apple Developer 승인 완료 시 production 빌드
  ```bash
  eas build --profile preview --platform ios
  eas submit --platform ios --latest
  ```
- **16:00–18:00** App Store Connect에서 앱 레코드 생성 + TestFlight 내부 테스터에 본인 추가

**산출물**: `eas.json` 완성, 첫 TestFlight 빌드 업로드 (Apple 승인 지연 시 Day 5로 미룸).

---

## Day 4 (목) — Swift 입문 Day 1

### 오전 (4h) — Swift 공식 튜토리얼
- **09:00–13:00** [Swift Book](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/) 읽기. 핵심 챕터만:
  - The Basics (변수, Optional, 타입)
  - Functions (매개변수 라벨, 클로저)
  - Closures
  - Classes and Structures
  - Properties

### 오후 (4h) — SwiftUI 맛보기
- **14:00–16:00** [Apple SwiftUI Tutorial](https://developer.apple.com/tutorials/swiftui/creating-and-combining-views) Chapter 1–2 따라하기 (Xcode에서 직접)
- **16:00–18:00** Expo Modules 공식 가이드 읽기
  - [Modules Overview](https://docs.expo.dev/modules/overview/)
  - [Get Started](https://docs.expo.dev/modules/get-started/)
  - [Module API Reference](https://docs.expo.dev/modules/module-api/)

**산출물**: Swift 기본 문법 노트, SwiftUI Hello World 앱 (Xcode 단독), Expo Modules 구조 이해.

---

## Day 5 (금) — PhotoLibraryWatcher 모듈 생성

### 오전 (4h) — 모듈 스캐폴딩
- **09:00–10:00** Expo Module 생성
  ```bash
  npx create-expo-module@latest --local modules/photo-library-watcher
  ```
- **10:00–11:00** Info.plist에 권한 키 추가
  ```xml
  <key>NSPhotoLibraryUsageDescription</key>
  <string>스크린샷을 자동으로 감지해 캘린더에 등록합니다.</string>
  ```
- **11:00–13:00** `expo-module.config.json` 검토 + iOS 네이티브 파일 구조 파악

### 오후 (4h) — Swift 코드 작성
- **14:00–17:00** 아래 "Swift 모듈 핵심 코드" 그대로 입력
- **17:00–18:00** TypeScript 인터페이스 작성 + `npx expo run:ios`로 빌드

**산출물**: `PhotoLibraryWatcher` 모듈 컴파일 성공.

---

## Day 6 (토) — 모듈 동작 검증 + 디버깅

### 오전 (4h)
- **09:00–11:00** RN 측에서 `startWatching()` 호출 → 시뮬레이터에서 스크린샷 (`Cmd+S`) → 콘솔에 `onScreenshotDetected` 로그 확인
- **11:00–13:00** 권한 거부 시나리오 테스트 + 권한 재요청 UX 처리

### 오후 (4h) — 실기기 테스트
- **14:00–16:00** iPhone 실기기 연결 + `eas device:create`로 등록 → Development 빌드 설치
- **16:00–18:00** 실기기에서 스크린샷 감지 동작 확인. Sentry에 에러 전송 테스트 (`Sentry.captureException`)

**산출물**: 스크린샷 → 콘솔 로그 동작 완료. 실기기 테스트 완료.

---

## Day 7 (일) — 회고 + 다음 주 준비

### 오전 (3h)
- **10:00–11:00** Week 1 회고를 Obsidian에 작성 (잘된 점, 막힌 점, 학습)
- **11:00–13:00** Week 2 계획 점검 (스크린샷 감지 → 푸시 알림 → Supabase 업로드 파이프라인)

### 오후 (3h)
- **14:00–17:00** Swift 추가 학습: `async/await`, Combine 기초, Vision Framework 개요 ([VNRecognizeTextRequest 문서](https://developer.apple.com/documentation/vision/vnrecognizetextrequest))

**산출물**: Week 1 회고 노트, Week 2 백로그.

---

## 필수 학습 자료

| 주제 | 링크 |
|---|---|
| Swift Book (공식) | https://docs.swift.org/swift-book/ |
| SwiftUI Tutorial | https://developer.apple.com/tutorials/swiftui |
| Expo Modules Overview | https://docs.expo.dev/modules/overview/ |
| Expo Modules API | https://docs.expo.dev/modules/module-api/ |
| PHPhotoLibraryChangeObserver | https://developer.apple.com/documentation/photokit/phphotolibrarychangeobserver |
| PHPhotoLibrary.requestAuthorization | https://developer.apple.com/documentation/photokit/phphotolibrary/requestauthorization(for:handler:) |
| VNRecognizeTextRequest | https://developer.apple.com/documentation/vision/vnrecognizetextrequest |
| EAS Build | https://docs.expo.dev/build/introduction/ |
| Supabase RN Quickstart | https://supabase.com/docs/guides/getting-started/quickstarts/react-native |

---

## PhotoLibraryWatcher 네이티브 모듈

### `modules/photo-library-watcher/expo-module.config.json`
```json
{
  "platforms": ["ios"],
  "ios": {
    "modules": ["PhotoLibraryWatcherModule"]
  }
}
```

### Swift: `ios/PhotoLibraryWatcherModule.swift`
```swift
import ExpoModulesCore
import Photos

public class PhotoLibraryWatcherModule: Module, PHPhotoLibraryChangeObserver {
  private var lastFetchResult: PHFetchResult<PHAsset>?

  public func definition() -> ModuleDefinition {
    Name("PhotoLibraryWatcher")

    Events("onScreenshotDetected")

    AsyncFunction("requestPermission") { (promise: Promise) in
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
        promise.resolve(status == .authorized || status == .limited)
      }
    }

    Function("startWatching") {
      let options = PHFetchOptions()
      options.predicate = NSPredicate(
        format: "(mediaSubtype & %d) != 0",
        PHAssetMediaSubtype.photoScreenshot.rawValue
      )
      options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
      self.lastFetchResult = PHAsset.fetchAssets(with: .image, options: options)
      PHPhotoLibrary.shared().register(self)
    }

    Function("stopWatching") {
      PHPhotoLibrary.shared().unregisterChangeObserver(self)
    }
  }

  public func photoLibraryDidChange(_ changeInstance: PHChange) {
    guard let previous = lastFetchResult,
          let changes = changeInstance.changeDetails(for: previous) else { return }

    let newAssets = changes.insertedObjects
    self.lastFetchResult = changes.fetchResultAfterChanges

    for asset in newAssets where asset.mediaSubtypes.contains(.photoScreenshot) {
      self.sendEvent("onScreenshotDetected", [
        "localIdentifier": asset.localIdentifier,
        "creationDate": asset.creationDate?.timeIntervalSince1970 ?? 0,
        "pixelWidth": asset.pixelWidth,
        "pixelHeight": asset.pixelHeight
      ])
    }
  }
}
```

### TypeScript: `modules/photo-library-watcher/index.ts`
```typescript
import { EventEmitter, requireNativeModule } from 'expo-modules-core';

const nativeModule = requireNativeModule('PhotoLibraryWatcher');
const emitter = new EventEmitter(nativeModule);

export type ScreenshotEvent = {
  localIdentifier: string;
  creationDate: number;
  pixelWidth: number;
  pixelHeight: number;
};

export async function requestPermission(): Promise<boolean> {
  return nativeModule.requestPermission();
}

export function startWatching() {
  nativeModule.startWatching();
}

export function stopWatching() {
  nativeModule.stopWatching();
}

export function onScreenshotDetected(listener: (e: ScreenshotEvent) => void) {
  return emitter.addListener('onScreenshotDetected', listener);
}
```

### RN 사용 예제: `App.tsx`
```typescript
import { useEffect } from 'react';
import {
  requestPermission,
  startWatching,
  onScreenshotDetected,
} from './modules/photo-library-watcher';

export default function App() {
  useEffect(() => {
    (async () => {
      const ok = await requestPermission();
      if (!ok) return;
      startWatching();
    })();

    const sub = onScreenshotDetected((e) => {
      console.log('[Memsum] screenshot:', e.localIdentifier, new Date(e.creationDate * 1000));
    });

    return () => sub.remove();
  }, []);

  return null;
}
```

### 동작 검증
1. `npx expo run:ios`
2. 시뮬레이터에서 `Cmd+S` (또는 Device → Screenshot)
3. Metro 콘솔에 `[Memsum] screenshot: ...` 출력 확인
4. 권한 거부 시 `requestPermission()`이 `false` 반환하는지 확인

---

## Supabase 초기 스키마

```sql
-- 1) user_profiles
create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  google_calendar_refresh_token text,
  timezone text default 'Asia/Seoul',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "own profile read"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "own profile upsert"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "own profile update"
  on public.user_profiles for update
  using (auth.uid() = id);

-- 2) captures
create table public.captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  local_identifier text,                    -- iOS PHAsset id
  image_url text,                           -- Supabase Storage
  ocr_text text,
  detected_dates jsonb,                     -- [{datetime, raw, confidence}]
  calendar_event_id text,                   -- Google Calendar event id
  status text default 'pending',            -- pending | processed | saved | failed
  source text default 'screenshot',
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index captures_user_created_idx on public.captures(user_id, created_at desc);

alter table public.captures enable row level security;

create policy "own captures all"
  on public.captures for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 인프라 체크리스트

### Apple Developer Program
- [ ] developer.apple.com 가입 (Apple ID 2단계 인증 필수)
- [ ] Individual $99 결제
- [ ] 본인 확인 (전화 인증 올 수 있음)
- [ ] App Store Connect 접속 가능 확인
- [ ] Bundle ID 등록 (`com.byungin.memsum`)

### `eas.json`
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" }
    },
    "production": {
      "autoIncrement": true,
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "byunginhb@gmail.com",
        "ascAppId": "TBD",
        "appleTeamId": "TBD"
      }
    }
  }
}
```

### `.env.local`
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_POSTHOG_KEY=
EXPO_PUBLIC_SENTRY_DSN=
OPENAI_API_KEY=                # Edge Function에서만 사용. 클라 노출 금지
```
> `.env.local`은 `.gitignore`에 추가. 백엔드 키는 Supabase Edge Function의 `secrets`에 저장.

---

## 막혔을 때 대처법

### Stack Overflow 검색 키워드
- `expo modules ios swift PHPhotoLibraryChangeObserver`
- `react native bare workflow custom native module event emitter`
- `eas build ios provisioning profile error`
- `supabase row level security auth.uid not working`

### 커뮤니티
- Expo Discord: https://chat.expo.dev (`#expo-modules` 채널)
- React Native Korea Slack: https://rnkorea.kr
- Reactiflux Discord: https://www.reactiflux.com
- Supabase Discord: https://discord.supabase.com

### 흔한 함정 3가지
1. **`prebuild` 후 `ios/` 폴더를 git에 안 올림** → EAS Build가 깨짐. Bare Workflow는 `ios/`, `android/` 모두 커밋해야 함.
2. **Info.plist 권한 문구 누락** → 앱 크래시 또는 권한 다이얼로그 안 뜸. `NSPhotoLibraryUsageDescription` 필수.
3. **`PHPhotoLibrary.shared().register(self)`를 deinit에서 unregister 안 함** → 메모리 누수. `stopWatching` 또는 `deinit`에서 반드시 해제.

---

## Week 1 종료 검증 체크리스트

- [ ] iOS 시뮬레이터에 `npx expo run:ios` 빌드 성공
- [ ] 실기기에 Development 빌드 설치 성공
- [ ] PhotoLibraryWatcher: 시뮬레이터 스크린샷 → Metro 콘솔 로그 출력
- [ ] Apple Developer 계정 활성 (App Store Connect 접근 가능)
- [ ] EAS Build로 첫 빌드 성공 (preview 또는 development)
- [ ] Supabase 프로젝트 생성 + `user_profiles`, `captures` 테이블 존재
- [ ] RN 앱에서 Supabase에 더미 capture INSERT 성공
- [ ] Sentry에 테스트 에러 1건 도착 확인
- [ ] PostHog에 `app_opened` 이벤트 1건 도착 확인
- [ ] GitHub Private repo에 Day 7까지 매일 커밋 1회 이상
- [ ] Swift Book의 The Basics ~ Closures 정독 완료
- [ ] Week 2 백로그를 Obsidian에 정리

> 위 항목 중 10개 이상 체크되면 Week 1 성공. Apple 승인 지연으로 TestFlight가 Week 2로 밀려도 괜찮다 — 나머지가 단단하면 회복 가능.

---

*마스터플랜: [[아이디어/Memsum/마스터플랜|마스터플랜]]*
*기능명세: [[아이디어/Memsum/기능명세|기능명세]]*
*개발기획서: [[아이디어/Memsum/개발기획서|개발기획서]]*
