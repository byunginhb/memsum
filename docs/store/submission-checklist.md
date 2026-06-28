# Memsum 스토어 제출 체크리스트 (iOS App Store + Google Play)

> 이 문서는 **출시 전 제출 준비물**과 **연령등급 설문 권장 답안**을 정리한 체크리스트다.
> 모든 항목은 실제 코드에서 확인한 데이터 흐름을 근거로 작성했다(추정·과장 없음).
>
> **담당 표기 규칙**
> - 🧑 **사용자(GUI)** — Apple/Google 콘솔에서 직접 클릭·입력·업로드해야 하는 항목. Claude가 대신 못 함.
> - 🤖 **Claude 산출** — 코드/설정/문구/이미지 사양 등 Claude가 만들어 줄 수 있는 항목.
> - 🧑+🤖 **공동** — Claude가 초안·사양을 만들고 사용자가 콘솔에 반영.

---

## 0. 앱 사실 요약 (제출 폼에 반복 입력되는 값)

| 항목 | 값 | 출처 |
|---|---|---|
| 앱 이름 | Memsum | `app.json` `expo.name` |
| iOS Bundle ID | `app.memsum` | `app.json` `ios.bundleIdentifier` |
| Android Package | `app.memsum` | `app.json` `android.package` |
| 버전(마케팅) | `1.0.0` | `app.json` / `package.json` |
| 카테고리(권장) | 생산성(Productivity) / 유틸리티(Utilities) | 제품 성격 |
| 데이터 리전 | Supabase ap-northeast-2 (Seoul) | 인프라 |
| 인증 방식 | 익명(Supabase anonymous) — 이메일·전화·계정 없음 | `src/stores/auth-store.ts` `signInAnonymously()` |
| 광고 | 없음 | 코드에 광고 SDK 없음 |
| 제3자 데이터 전송 | OpenAI(텍스트), Google(캘린더·OAuth), Supabase(스토리지·DB) | 아래 §C 참조 |

### 수집·처리 데이터 (App Privacy / Data safety 작성 근거)

| 데이터 | 수집 여부 | 어디로 | 코드 근거 |
|---|---|---|---|
| 사진(스크린샷 이미지) | 수집 | Supabase Storage 비공개 버킷 `captures-raw` | `src/lib/storage.ts` (`BUCKET='captures-raw'`, `upsert` 업로드) |
| OCR 추출 텍스트 | 수집·처리 | OpenAI `gpt-4o-mini`로 정제·이벤트 추출 → Supabase `captures` 테이블 | `supabase/functions/process-capture/index.ts`, `weekly-report/index.ts` |
| 구글 캘린더 OAuth 토큰 | 수집(기기 내) | **기기 SecureStore(Keychain/Keystore)에만 저장** — 서버 미전송 | `src/lib/secure-tokens.ts`, `src/lib/google-auth.ts` |
| 연결 계정 이메일 | 수집(선택) | 표시용. userinfo로 1회 조회, 토큰 번들에 로컬 보관 | `src/lib/google-auth.ts` `fetchEmail()` |
| 닉네임 | 수집(로컬) | 로컬 보관 | 제품 사양 |
| 분석/추적(Sentry·PostHog) | **현재 빌드 비활성** | — | 현재 빌드 미사용 |

> 중요: 캘린더 토큰은 서버로 보내지 않고 **기기 SecureStore에만** 저장된다(`secure-tokens.ts`). App Privacy / Data safety 작성 시 "구글 자격증명은 기기에만 저장, 서버 미전송"으로 기술한다.

---

## A. iOS App Store 제출 체크리스트

### A-1. 앱 아이콘 & 이미지

| # | 항목 | 사양 | 담당 |
|---|---|---|---|
| A1-1 | 앱 아이콘 1024×1024 | PNG, **알파 채널 없음**, 둥근모서리·투명도 직접 적용 금지(Apple이 마스킹) | 🧑+🤖 — `assets/images/icon.png` 존재(1024×1024) |
| A1-2 | 아이콘 알파 채널 제거 | ⚠️ **현재 `icon.png`는 `hasAlpha: yes` → App Store Connect 업로드 거부 사유.** 무알파 1024 별도 생성 필요 | 🤖 평탄화 명령 제공 / 🧑 ASC 업로드 |

**검증 결과(실측):**
```
$ sips -g hasAlpha -g pixelWidth -g pixelHeight assets/images/icon.png
  hasAlpha: yes        ← 문제: 무알파여야 함
  pixelWidth: 1024     ← OK
  pixelHeight: 1024    ← OK
```
**알파 제거(흰 배경으로 평탄화) — App Store Connect용 무알파 1024 생성:**
```bash
# 흰 배경 위에 합성해 알파 제거 (투명 영역이 흰색이 됨)
sips -s format jpeg assets/images/icon.png --out /tmp/_icon.jpg \
  && sips -s format png /tmp/_icon.jpg --out assets/images/icon-1024-noalpha.png \
  && sips -g hasAlpha assets/images/icon-1024-noalpha.png   # hasAlpha: no 확인
```
> 투명 배경을 흰색이 아닌 브랜드 색으로 깔고 싶으면 디자인 툴(또는 ImageMagick `magick icon.png -background "#208AEF" -flatten`)로 합성한다(담당: 🤖). ASC "App Information"의 1024 아이콘에는 이 무알파 버전을 업로드한다.
> 참고: 스토어 제출용 1024 아이콘은 **무알파**여야 하지만, 앱 번들 내 아이콘(런타임)은 Expo/Xcode가 자동 처리한다. App Store Connect "App Information"의 1024 아이콘만 무알파면 된다.

### A-2. 스크린샷 (App Store Connect 업로드)

필수: **6.7" iPhone**(1290×2796 또는 1284×2778) 1세트는 반드시 필요. 그 외는 자동 스케일 가능하나 권장.

| 디바이스 | 해상도(세로) | 필수 여부 | 담당 |
|---|---|---|---|
| iPhone 6.9"/6.7" (15/14/13 Pro Max 계열) | 1290×2796 | **필수** | 🧑 (시뮬레이터 캡처) |
| iPhone 6.5" (구형 Max) | 1242×2688 | 권장(6.7 업로드 시 생략 가능) | 🧑 |
| iPad 12.9" (supportsTablet=true이므로) | 2048×2732 | **iPad 지원 시 필수** | 🧑 |

> `app.json` `ios.supportsTablet: true` 이므로 **iPad 스크린샷도 요구**된다. iPad 지원을 빼려면 `supportsTablet: false`로 변경(🤖). 유지하면 iPad 스크린샷 필수(🧑).

스크린샷 장당 2~10장. 권장 화면: (1) 온보딩/캡처 자동감지, (2) 캡처 상세(OCR·요약), (3) 캘린더 등록, (4) 주간 5줄 리포트, (5) 검색/카테고리.

### A-3. App Privacy (필수 — "Data Types" 설문)

App Store Connect → App Privacy → "Yes, we collect data". 아래 매핑으로 작성:

| 데이터 타입 | 수집 | 용도 | 연결(Linked) | 추적(Tracking) | 근거 |
|---|---|---|---|---|---|
| **Photos or Videos** | Yes | App Functionality | **No(익명이라 신원 비연결)** | No | `storage.ts` 업로드 |
| **Other User Content**(OCR 텍스트) | Yes | App Functionality | No | No | `process-capture` |
| **Email Address**(구글 연결 이메일) | Yes | App Functionality | No | No | `google-auth.ts` (기기 보관) |
| **User ID**(익명 user_id) | Yes | App Functionality | No | No | 익명 세션 |
| 광고·분석 식별자 | **No** | — | — | — | 분석 비활성 |

- "Used for Tracking": **전부 No** (광고·크로스앱 추적 없음).
- 제3자 처리 고지: OpenAI(텍스트 처리), Google(캘린더)은 App Privacy의 데이터 용도에 "App Functionality"로 반영하고, 개인정보처리방침 URL에서 제3자 제공을 명시(별도 정책 문서 담당자가 작성).
- 담당: 🧑 (설문은 콘솔 GUI) / 🤖 (위 표가 답안)

### A-4. 개인정보처리방침 URL

| # | 항목 | 담당 |
|---|---|---|
| A4-1 | App Store Connect "App Privacy" + "App Information"에 **개인정보처리방침 URL** 필수 | 🧑 입력 |
| A4-2 | 정책 본문(한/영) | 🤖 (별도 privacy 문서 담당자 산출) |
| A4-3 | 정책 호스팅 | 🧑 (URL 발급) → `https://memsum.app/privacy` |

### A-5. 수출 규정 (Export Compliance / 암호화)

- 앱은 HTTPS(TLS)만 사용하고 **자체 암호화 알고리즘을 구현하지 않는다**(표준 OS/HTTPS 암호화만 사용: Supabase TLS, Google OAuth HTTPS, SecureStore=OS Keychain/Keystore).
- 따라서 `ITSAppUsesNonExemptEncryption = false`(면제) 선언이 적합하다.

`app.json` `ios.infoPlist`에 추가 권장(🤖):
```json
"infoPlist": {
  "ITSAppUsesNonExemptEncryption": false
}
```
> 이 키를 넣으면 App Store Connect에서 매 빌드마다 암호화 질문에 답하지 않아도 된다. (담당: 🤖 코드 추가 → 🧑 빌드 후 확인)

### A-6. 데모 계정 / 로그인 안내 (App Review Information)

- 본 앱은 **익명 인증**(`signInAnonymously`)이라 로그인 화면·계정이 없다.
- App Review Information → "Sign-in required?"에 **No**.
- "Notes"에 다음을 기재(🤖 문구 제공 / 🧑 입력):
  > "이 앱은 별도 회원가입/로그인이 없습니다(익명 인증). 모든 기능은 첫 실행 후 바로 사용 가능합니다. 구글 캘린더 연동은 선택 기능이며, 심사 시 리뷰어의 구글 계정으로 OAuth 동의 후 테스트할 수 있습니다. 캘린더 연동 없이도 캡처·OCR·요약·주간 리포트 기능을 모두 확인할 수 있습니다."
- **사진 권한**: 첫 캡처 기능 사용 시 사진 접근 권한을 요청한다(`NSPhotoLibraryUsageDescription`). 리뷰어가 권한을 허용해야 핵심 흐름 확인 가능 — 노트에 안내.

### A-7. TestFlight (선택, 권장)

| # | 항목 | 담당 |
|---|---|---|
| A7-1 | `eas build --profile production --platform ios`로 빌드 | 🤖 명령 / 🧑 EAS 로그인·실행 |
| A7-2 | `eas submit --platform ios`로 App Store Connect 업로드 | 🤖 명령 / 🧑 실행 |
| A7-3 | Internal Testing(본인) → 권한·OCR·캘린더 흐름 점검 | 🧑 |
| A7-4 | (외부 테스터 사용 시) 베타 앱 심사 통과 필요 | 🧑 |

### A-8. iOS 기타 필수

| # | 항목 | 담당 |
|---|---|---|
| A8-1 | `NSPhotoLibraryUsageDescription` 문구 — 이미 설정됨("스크린샷 자동 감지를 위해…") | ✅ `app.json` 확인됨 |
| A8-2 | 지원 URL(Support URL) | 🧑 → `https://memsum.app/` |
| A8-3 | 연령 등급(아래 §D) | 🧑+🤖 |
| A8-4 | 앱 설명·키워드·프로모션 텍스트(한/영) | 🤖 초안 / 🧑 입력 |
| A8-5 | 저작권·판매자 정보 | 🧑 → `Byungin Song` |
| A8-6 | `ios/` 폴더 커밋 확인(prebuild 결과) | ✅ 커밋되어야 함(CLAUDE.md §9) |

---

## B. Google Play 제출 체크리스트

### B-1. 그래픽 자산

| # | 항목 | 사양 | 담당 |
|---|---|---|---|
| B1-1 | 앱 아이콘 | 512×512 PNG(32비트, 알파 허용) | 🤖 사양 / 🧑 업로드 (`icon.png`에서 512 리사이즈) |
| B1-2 | **피처 그래픽(Feature graphic)** | **1024×500** PNG/JPG, 알파 없음 | 🤖 생성 가능 / 🧑 업로드 — **현재 없음, 신규 제작 필요** |
| B1-3 | 폰 스크린샷 | 최소 2장, 16:9~9:16, 320~3840px | 🧑 (에뮬레이터 캡처) |
| B1-4 | 태블릿 스크린샷(선택) | 7"/10" | 🧑 (선택) |

> 피처 그래픽 1024×500은 현재 `assets/`에 없다. 별도 제작 필요(담당: 🤖 디자인 산출 가능 / 🧑 업로드).

### B-2. Data safety (필수 설문)

Play Console → App content → Data safety. 아래로 작성(🧑 GUI / 🤖 답안):

| 데이터 카테고리 | 수집? | 공유(제3자)? | 전송 암호화 | 삭제 요청 가능 | 근거 |
|---|---|---|---|---|---|
| Photos and videos | **Yes** | **Yes**(OpenAI 텍스트화 흐름·Supabase 저장) | Yes(HTTPS/TLS) | Yes(앱 내 직접 삭제 + 문의) | `storage.ts`, `account.ts deleteAllUserData` |
| 사용자 콘텐츠(OCR 텍스트) | Yes | Yes(OpenAI 처리) | Yes | Yes(앱 내 직접 삭제 + 문의) | `process-capture`, `account.ts deleteAllUserData` |
| Email address(구글 연결) | Yes | No(기기 저장, 서버 미전송) | Yes | Yes(연동 해제/앱 삭제 시 제거) | `google-auth.ts`/`secure-tokens.ts` |
| 앱 활동/식별자(분석) | **No** | No | — | — | 분석 비활성 |

- "Is all of the user data encrypted in transit?": **Yes**(모든 통신 HTTPS/TLS).
- "Do you provide a way for users to request data deletion?": **Yes** — **앱 내 직접 삭제 구현됨**(설정 → 데이터 → "내 데이터 삭제" → 확인 시 본인의 모든 캡처·이미지·주간 리포트·피드백을 서버에서 영구 삭제, `account.ts deleteAllUserData`) + 문의 채널. (정책 문서에도 삭제 절차 기재됨)
- 광고용 데이터 공유: **No**.
- 데이터 수집 목적: 앱 기능(App functionality)·계정 관리가 아님(익명).

> Google은 "공유(sharing)"를 "제3자 처리 위탁 포함"으로 넓게 본다. OpenAI로 OCR 텍스트가 전송되므로 Photos/사용자 콘텐츠는 **공유 Yes**로 답하는 것이 안전하다(정책 문서에서 OpenAI를 처리자로 명시).

### B-3. 콘텐츠 등급(Content rating) 설문

Play Console → App content → Content rating. IARC 설문. 권장 답안은 §D 참조. 결과 예상: **전체이용가(Everyone / 만 3세+)**.

| # | 항목 | 담당 |
|---|---|---|
| B3-1 | 앱 카테고리: "유틸리티, 생산성, 기타" 선택 | 🧑 |
| B3-2 | 폭력/성/혐오/도박/욕설/약물: 전부 **없음** | 🧑+🤖(§D 답안) |
| B3-3 | 사용자 간 상호작용/위치공유/개인정보 공유: 해당 없음(SNS 아님) | 🧑+🤖 |

### B-4. 타깃 대상(Target audience & content)

| # | 항목 | 권장 답 | 담당 |
|---|---|---|---|
| B4-1 | 대상 연령대 | **만 18세 이상**(또는 13세 이상 성인 대상 생산성 앱) | 🧑 |
| B4-2 | 아동(13세 미만) 대상 아님 | "No" → **Families 정책 비대상** | 🧑 |

> 13세 미만을 대상에 포함하면 Google Play Families 정책·추가 심사가 적용된다. Memsum은 성인 생산성 앱이므로 **아동 대상 아님**으로 선택해 Families 정책을 피한다.
> 참고: **콘텐츠 등급(전체이용가)과 타깃 대상 연령 설정은 별개의 설문**이며 둘 다 유효하다. 콘텐츠 등급이 전체이용가라도 타깃 연령을 성인으로 설정하는 것은 모순이 아니다(등급=콘텐츠 자체의 수위, 타깃=의도한 사용자층).

### B-5. 앱 서명(App signing)

| # | 항목 | 담당 |
|---|---|---|
| B5-1 | **Play App Signing** 사용(권장) — Google이 서명 키 관리 | 🧑 (콘솔에서 활성, 기본값) |
| B5-2 | 업로드 키: EAS가 관리(`eas build`)하거나 직접 키스토어 | 🤖 명령 / 🧑 키 관리 |
| B5-3 | `eas build --profile production --platform android` → AAB 산출 | 🤖 명령 / 🧑 실행 |
| B5-4 | `eas submit --platform android` 또는 콘솔 직접 업로드 | 🧑 |
| B5-5 | `android/` 폴더 커밋 확인(prebuild 결과) | ✅ 커밋되어야 함 |

### B-6. Google Play 기타 필수

| # | 항목 | 담당 |
|---|---|---|
| B6-1 | 개인정보처리방침 URL(Store listing + Data safety 양쪽) | 🧑 → `https://memsum.app/privacy` |
| B6-2 | 앱 접근 권한 설명(`READ_MEDIA_IMAGES`) — 사진/미디어 권한 사용 사유 선언 | 🧑+🤖 |
| B6-3 | 짧은 설명(80자)·전체 설명(한/영) | 🤖 초안 / 🧑 입력 |
| B6-4 | 광고 포함 여부: **"No ads"** | 🧑 |
| B6-5 | 정부/금융/건강 앱 아님 선언 | 🧑 |

---

## C. 제3자 데이터 전송 고지 (정책·설문 공통 근거)

코드에서 확인된 외부 전송처:

| 전송처 | 무엇을 | 코드 근거 | 비고 |
|---|---|---|---|
| **OpenAI** (`api.openai.com`) | OCR 텍스트(이미지 아님) — gpt-4o-mini로 정제·이벤트 추출·주간 선별 | `process-capture/index.ts`, `weekly-report/index.ts` | 텍스트만 전송. 이미지 원본은 OpenAI로 보내지 않음 |
| **Google** (`accounts.google.com`, `googleapis.com`) | OAuth 인증 + 캘린더 이벤트 생성(`calendar.events`) + userinfo 이메일 | `google-auth.ts`, `google-calendar.ts` | 스코프 = 이벤트 생성만. 캘린더 전체 읽기 아님 |
| **Supabase** (ap-northeast-2) | 스크린샷 이미지(비공개 버킷) + 캡처 텍스트/메타(Postgres, RLS) | `storage.ts`, `captures.ts` | 사용자별 RLS로 본인 데이터만 접근 |

> 정책 문서에는 위 3개 처리자를 모두 명시해야 한다. App Privacy/Data safety 설문도 이 표를 근거로 작성한다.

---

## D. 연령 등급 설문 권장 답안

### 공통 결론
폭력·성적 콘텐츠·도박·약물·욕설·공포·차별 요소가 **전혀 없는 생산성/유틸리티 앱**.
사용자 생성 콘텐츠(스크린샷)는 **본인만 보는 비공개**이며, 사용자 간 공유/소셜 기능이 없다.

| 플랫폼 | 예상 등급 |
|---|---|
| iOS (Apple 연령 등급 설문) | **4+** |
| Google Play (IARC) | **전체이용가 / Everyone** |
| 국내(GRAC, 해당 시) | **전체이용가** |

> 참고: **콘텐츠 등급(전체이용가)과 타깃 대상 연령 설정(§B-4)은 별개의 설문**이며 둘 다 유효하다. 콘텐츠 자체에 폭력·성·도박 등 요소가 없어 등급은 전체이용가이지만, 의도한 사용자층(타깃 연령)은 성인으로 설정한다 — 두 설정은 서로 모순되지 않는다.

### iOS 연령 등급 설문 답안 (App Store Connect → Age Rating)

| 질문 항목 | 답 |
|---|---|
| 만화/판타지 폭력 | 없음(None) |
| 사실적 폭력 | 없음 |
| 성적 콘텐츠/노출 | 없음 |
| 욕설/저속한 유머 | 없음 |
| 음주·흡연·약물 | 없음 |
| 공포/무서운 테마 | 없음 |
| 도박(시뮬레이션 포함) | 없음 |
| 의료/치료 정보 | 없음 |
| **제한 없는 웹 접근**(브라우저 기능) | **없음**(앱 내 임의 웹 브라우징 기능 없음. OAuth 동의창은 시스템 인앱 브라우저로 제한적) |
| 사용자 생성 콘텐츠 + 무제한 소셜 | **없음**(스크린샷은 본인 전용, 타 사용자와 공유 안 함) |
| **결과 등급** | **4+** |

### Google Play IARC 설문 답안 (Content rating)

| 질문 항목 | 답 |
|---|---|
| 폭력 | 없음 |
| 성적 콘텐츠 | 없음 |
| 욕설 | 없음 |
| 통제 물질(약물/술/담배) | 없음 |
| 도박 | 없음 |
| 공포 | 없음 |
| 사용자 간 상호작용/채팅 | **없음**(소셜·메시징 기능 없음) |
| 위치 공유 | **없음**(타 사용자에게 위치 공유 안 함) |
| 개인정보 공유(사용자 간) | **없음** |
| 디지털 구매(IAP) | 향후 결제 도입 시 **Yes**로 변경 — 현재 빌드 기준 해당 없음 |
| **결과 등급** | **전체이용가(Everyone)** |

> ⚠️ 결제(Apple IAP / Google Play Billing)를 실제 출시 빌드에 포함하면 "디지털 구매" 항목을 Yes로 바꿔야 한다(등급 자체는 보통 전체이용가 유지). 현재 코드 기준으로는 결제 SDK 활성 흐름이 없으므로 "없음"으로 답한다. **출시 빌드에 결제가 포함되는지 확인 필요**.

---

## E. ⚠️ 중요 경고 — 구글 OAuth `calendar.events`는 "민감 스코프(Sensitive scope)"

`src/lib/google-auth.ts`의 요청 스코프:
```
openid, email, https://www.googleapis.com/auth/calendar.events
```

`calendar.events`는 Google이 분류하는 **민감(Sensitive) 스코프**다. 이 때문에 **앱 스토어 심사와 별개로** Google Cloud Console에서 추가 절차가 필요하다:

| # | 단계 | 담당 | 비고 |
|---|---|---|---|
| E-1 | OAuth 동의 화면을 **테스트(Testing) → 게시(In production)**로 전환 | 🧑 (Cloud Console GUI) | 게시 전에는 테스트 사용자(최대 100명)만 로그인 가능 |
| E-2 | 동의 화면 정보: 앱 이름 `Memsum`, 지원 이메일, 개인정보처리방침 URL, 홈페이지 URL, 로고 | 🧑+🤖 | URL·이메일은 플레이스홀더 |
| E-3 | **앱 검증(Verification) 제출** — 민감 스코프 사용 시 Google 브랜드/스코프 검증 필요 | 🧑 | 미검증 시 동의 화면에 "확인되지 않은 앱" 경고 + 100명 한도 |
| E-4 | (민감 스코프만 사용 시) 보통 보안 평가(Security Assessment)까지는 불요하나, **제한(Restricted) 스코프가 아님**을 확인 | 🧑 | `calendar.events`는 Sensitive이지 Restricted가 아님 → 통상 정식 보안평가(연 단위 유료 감사)는 불필요. 단 브랜드/도메인 검증은 필요할 수 있음 |
| E-5 | 검증 소요: 수일~수주. **출시 일정에 버퍼 반영** | 🧑 | 스토어 심사와 병행 |

> 핵심: 구글 검증이 끝나기 전이라도 **테스트 사용자 등록**으로 본인 기기 테스트는 가능하다. 그러나 **일반 사용자에게 배포하려면 동의 화면 게시 + 민감 스코프 검증**이 선행되어야 OAuth 경고 없이 캘린더 연동이 동작한다. 캘린더 연동은 선택 기능이므로, 검증 지연 시 캘린더 외 기능 우선 출시도 고려 가능.

---

## F. 제출 전 최종 점검 (요약 체크리스트)

### iOS
- [ ] 1024 아이콘 무알파 검증(`sips -g hasAlpha`) 🧑
- [ ] iPhone 6.7" 스크린샷(+ supportsTablet=true면 iPad 12.9") 🧑
- [ ] `ITSAppUsesNonExemptEncryption=false` `app.json` 반영 🤖 → 빌드 확인 🧑
- [ ] App Privacy 설문(§A-3 표) 🧑
- [ ] 개인정보처리방침 URL·지원 URL 입력 🧑
- [ ] App Review Notes에 "로그인 없음(익명)" + 사진 권한 안내 🧑
- [ ] `ios/` 커밋 확인 ✅
- [ ] TestFlight 내부 테스트 1회 🧑

### Google Play
- [ ] 512 아이콘 + **피처 그래픽 1024×500(신규 제작)** 🤖/🧑
- [ ] 폰 스크린샷 2장+ 🧑
- [ ] Data safety 설문(§B-2 표) 🧑
- [ ] 콘텐츠 등급 설문(§D) → 전체이용가 🧑
- [ ] 타깃 연령: 아동 대상 아님 🧑
- [ ] Play App Signing 활성 + AAB 업로드 🧑
- [ ] 개인정보처리방침 URL 입력 🧑
- [ ] `android/` 커밋 확인 ✅

### 공통 (구글 OAuth)
- [ ] OAuth 동의 화면 게시(production) 🧑
- [ ] 민감 스코프(`calendar.events`) 검증 제출 + 일정 버퍼 🧑
- [ ] 결제 SDK가 출시 빌드에 포함되는지 확인 → 포함 시 등급 설문 "디지털 구매" Yes 🧑

### 공통 (데이터 삭제)
- [ ] 인앱 데이터 삭제(설정 → 데이터 → "내 데이터 삭제", `account.ts deleteAllUserData`) 동작 확인 — Data safety/App Privacy의 "삭제 가능=Yes" 근거 🧑
- [ ] 보조 문의 채널(`byunginhb@gmail.com (인앱 삭제 + 이메일 문의)`) 확정 🧑

---

## 채워야 할 항목 (플레이스홀더)

| 플레이스홀더 | 용도 | 담당 |
|---|---|---|
| `https://memsum.app/privacy` | App Store Connect / Play Store listing / Data safety / OAuth 동의 화면 | 🧑 |
| `https://memsum.app/` | iOS Support URL / 사용자 문의 채널 | 🧑 |
| `byunginhb@gmail.com` | OAuth 동의 화면 지원 이메일 / 스토어 연락처 | 🧑 |
| `https://memsum.app/` | OAuth 동의 화면 앱 홈페이지(선택) | 🧑 |
| `Byungin Song` | App Store 판매자 정보 / 저작권 표기 | 🧑 |
| `2026-06-12` | 정책 시행일(정책 문서와 일치) | 🧑 |
| `assets/store/feature-graphic.png (제작 완료)` | Google Play 필수 그래픽 (현재 미보유, 제작 필요) | 🤖 제작 / 🧑 업로드 |
| `byunginhb@gmail.com (인앱 삭제 + 이메일 문의)` | 인앱 직접 삭제(설정 → 데이터 → "내 데이터 삭제")에 더해 Data safety "삭제 요청 방법"에 기재할 보조 문의 경로 | 🧑 |
