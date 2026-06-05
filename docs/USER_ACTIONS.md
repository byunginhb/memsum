# Memsum — 당신이 직접 해야 할 일 (USER ACTIONS)

> Claude가 코드/명령을 자동 진행하면서, **사람만 할 수 있는 일**을 여기에 모읍니다.
> 항목이 추가되면 이 문서 상단 "지금 필요한 일"에 먼저 올립니다.

---

## 🔴 지금 필요한 일 (Week 1 완료를 위해)

### 1. Supabase 프로젝트 생성 + 키 입력  ← 가장 중요
1. https://supabase.com → 로그인 → **New Project**
   - Name: `memsum`
   - Region: **Northeast Asia (Seoul) `ap-northeast-2`** (없으면 Tokyo `ap-northeast-1`)
   - DB Password: 안전하게 보관
   - ⚠️ 무료 플랜은 조직당 활성 프로젝트 2개 한도. 이미 2개(`sector-king`,`yegyeon`)가 활성이면, 새 프로젝트 생성이 막힐 수 있습니다. 그 경우 ① 안 쓰는 활성 프로젝트를 Pause 하거나 ② 별도 무료 조직을 새로 만들어 그 안에 `memsum`을 만드세요.
2. 생성 후 **Settings → API**에서 복사 → 루트 `.env`에 붙여넣기:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
3. **SQL Editor**에 `supabase/migrations/0001_init.sql` 내용을 붙여넣고 **Run**
   (또는 터미널에서 `supabase link --project-ref <ref>` 후 `supabase db push`)

> 키가 비어 있어도 앱은 빌드·실행됩니다(백엔드 호출은 자동 스킵). 키 넣는 즉시 실연결됩니다.

### 2. 시뮬레이터/에뮬레이터 첫 실행 시 권한 [허용] 탭
- iOS 시뮬레이터: 사진 권한 다이얼로그 → **[허용]**
- Android 에뮬레이터: 미디어 권한 다이얼로그 → **[허용]**

### 3. (선택) 더미 INSERT로 RLS 확인
- Supabase SQL Editor에서 `auth.users`에 테스트 유저가 있어야 INSERT 가능 → 콘솔의 Authentication → Add user로 1명 생성 후, 그 uid로 `user_profiles`/`captures` INSERT 테스트.

---

## 🟡 다음 단계 (Week 2~ 예정, 지금은 불필요)

| 항목 | 시점 | 비고 |
|---|---|---|
| OpenAI API 키 | Week 2 OCR 후처리 | 카드 등록 + $5~10 충전 |
| Sentry DSN / PostHog Key | 관측 붙일 때 | 무료 티어 |
| Apple Developer Program ($99) | 실기기·TestFlight 직전 | 지금 불필요 |
| Google Play Console ($25) | Android 출시 1~2주 전 | 지금 불필요 |
| Google Cloud (Calendar OAuth) | Week 9 캘린더 연동 | |

---

## 📌 진행 중 내린 기술 결정 (참고)

| 결정 | 내용 | 사유 |
|---|---|---|
| Expo SDK | **56** (RN 0.85 / React 19.2) | 환경(Xcode 26.5)과 정합, create-expo-app 최신 |
| 폴더 구조 | `src/app`(router) + `src/design`·`src/lib` | SDK56 기본 템플릿이 `src/` + `@/*`→`src/*` 별칭 |
| 패키지 매니저 | **pnpm** + `.npmrc node-linker=hoisted` | 전역 규칙, Expo 호환 |
| 디자인 라이브러리 | **NativeWind 채택, gluestack-ui v2 보류** | RN0.85/React19 호환 리스크. 디자인 문서가 요구하는 커스텀 Button/Card는 토큰+NativeWind로 그대로 구현 |
| Supabase | 클라우드, **사용자 키 직접 제공**(MCP 미사용) | 사용자 선택 |
| bundleId/package | `app.memsum` | 문서의 App Group `group.app.memsum.*`와 정합 |

---

*최종 업데이트: 2026-06-06 (Week 1 부트스트랩)*
