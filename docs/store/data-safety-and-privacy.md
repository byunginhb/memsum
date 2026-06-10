# Memsum — 데이터 보안 / 앱 개인정보 보호 입력표

> Google Play **데이터 보안(Data safety)** 폼과 Apple **앱 개인정보 보호(App Privacy / Nutrition Labels)** 폼에 그대로 입력할 수 있도록 정리한 답안표입니다.
> 모든 답은 실제 코드 동작에 근거하며, 각 행마다 **"왜 이렇게 답하는지"** 한 줄 근거를 달았습니다. 콘솔에서 이 표의 선택지를 그대로 고르면 됩니다.
> 코드에 없는 기능(광고 SDK, 분석 SDK, 위치, 연락처 등)은 **수집하지 않음**으로 정확히 표기했습니다.

- 대상 앱: Memsum (bundleId / package = `app.memsum`)
- 인증 방식: **익명 인증**(Supabase `signInAnonymously`). 이메일·전화번호·계정 가입 없음 → 어떤 데이터도 "사용자 신원"에 연결되지 않습니다.
- 제3자 전송 대상: **OpenAI**(OCR 텍스트 후처리), **Google**(캘린더 이벤트 등록 + OAuth), **Supabase**(이미지 스토리지·DB).
- 현재 빌드에 **광고 없음**, **분석/추적 SDK 없음**(Sentry/PostHog/Firebase/AdMob 의존성 부재 — `package.json`·소스 확인).

---

## 0. 실제 데이터 흐름 요약 (입력표의 근거)

코드에서 확인한 "실제로 일어나는" 데이터 처리입니다. 이 사실만으로 아래 두 폼을 채웁니다.

| # | 데이터 | 어디서 어디로 | 코드 근거 |
|---|--------|---------------|-----------|
| 1 | **스크린샷 이미지** | 기기 → Supabase Storage 비공개 버킷 `captures-raw` (`{userId}/{captureId}.jpg`) 업로드. 리사이즈·JPEG 압축 후 전송. 조회 시 1시간 만료 서명 URL 생성(영구 공개 URL 없음). | `src/lib/storage.ts` (`uploadCaptureImage`, `getSignedUrl`), `src/lib/captures.ts` |
| 2 | **OCR 텍스트** (이미지에서 추출한 텍스트) | 기기에서 1차 OCR → Edge Function이 OpenAI `gpt-4o-mini`로 전송해 오타 교정·이벤트(제목/날짜/장소) 추출·카테고리 분류. 결과는 Supabase `captures` 테이블에 저장. | `supabase/functions/process-capture/index.ts`, `supabase/functions/weekly-report/index.ts` |
| 3 | **구글 캘린더 OAuth 토큰** (access / refresh token) | 기기 SecureStore(iOS Keychain / Android Keystore)에만 암호화 저장. **우리 서버로 전송하지 않음.** 캘린더 등록 시 토큰으로 Google Calendar API(`events.insert`)를 기기에서 직접 호출. | `src/lib/google-auth.ts`, `src/lib/secure-tokens.ts`, `src/lib/google-calendar.ts` |
| 4 | **연결된 구글 계정 이메일** | OAuth 후 `userinfo`로 1회 조회해 "연결된 계정" 표시용으로 토큰 번들에 포함, **기기 SecureStore에만 저장.** 우리 서버 전송 없음. | `src/lib/google-auth.ts` (`fetchEmail`), `src/lib/secure-tokens.ts` |
| 5 | **닉네임** | 사용자가 입력하는 표시용 이름. 기기 로컬 저장소(AsyncStorage)에만 저장(개인화 카피용). **서버 전송 없음.** | `src/stores/settings-store.ts`, `src/features/settings/NicknameEditSheet.tsx` |

전송 시 암호화: 위 모든 외부 통신은 HTTPS/TLS(`https://...` 엔드포인트) 사용 → "전송 중 암호화됨(encrypted in transit)" = **예**.

스코프 주의: 구글 권한은 `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`만 요청합니다. **캘린더 전체 읽기 권한 아님**(이벤트 생성 전용).

---

## 1. Google Play — 데이터 보안(Data safety) 입력표

Play Console "데이터 보안" 폼은 데이터 유형별로 다음을 묻습니다:
**(a) 수집(Collected)** = 앱이 기기 밖으로 전송하는가 · **(b) 공유(Shared)** = 제3자에게 전달하는가 · **(c) 처리 목적** · **(d) 전송 중 암호화** · **(e) 삭제 요청 가능 여부** · **(f) 필수/선택(수집인 경우)**.

> 핵심 원칙(콘솔에서 그대로 적용):
> - **기기에만 저장되고 전송되지 않는 데이터는 "수집(Collected)"이 아닙니다.** → 구글 OAuth 토큰, 연결 이메일, 닉네임은 "수집 안 함"으로 답합니다(기기 SecureStore / AsyncStorage 전용).
> - "공유(Shared)"는 제3자에게 **전달**하는 것을 의미합니다. OpenAI로 텍스트를, Google로 캘린더 이벤트를 보내는 것은 공유에 해당합니다.

### 1-A. "수집/공유함" 으로 답할 데이터 유형

| 데이터 유형 (Play 카테고리) | 수집함? | 공유함? | 처리 목적 | 전송 중 암호화 | 삭제 요청 가능 | 필수/선택 | 왜 이렇게 답하는가 (코드 근거) |
|---|---|---|---|---|---|---|---|
| **사진 및 동영상 → 사진(Photos)** | **예** | **예** | 앱 기능(App functionality) | 예 | 예 | 필수(Required) | 스크린샷 이미지를 Supabase 비공개 버킷에 업로드해 OCR·미리보기·리포트에 사용. 공유=처리를 위해 Supabase(제3자 인프라)로 전달. `storage.ts uploadCaptureImage`. |
| **앱 활동 → 기타 사용자 생성 콘텐츠(Other user-generated content)** | **예** | **예** | 앱 기능(App functionality) | 예 | 예 | 필수(Required) | 이미지에서 추출한 OCR 텍스트를 OpenAI `gpt-4o-mini`로 전송해 정제·이벤트 추출. 텍스트는 `captures`에 저장. 공유=OpenAI로 전달. `process-capture/index.ts`, `weekly-report/index.ts`. ※ "앱 내 검색 기록"으로 분류하지 않음: `searchCaptures`는 입력 검색어를 저장하지 않는 ILIKE 즉석 질의일 뿐임(`src/lib/captures.ts`). |
| **캘린더 → 캘린더 이벤트(Calendar events)** | **예** | **예** | 앱 기능(App functionality) | 예 | 예 | 선택(Optional) | 사용자가 "캘린더에 추가"를 누를 때만, 추출된 이벤트(제목/시간/장소)를 Google Calendar `events.insert`로 전송해 사용자 본인 캘린더에 등록. 공유=Google로 전달. 선택=캘린더 연결 안 하면 발생 안 함. `google-calendar.ts insertEvent`. |

> 보충 설명(폼의 "데이터 처리 방식" 자유 기재란이 있으면 권장):
> - 사진은 **스크린샷 정리·OCR 목적**으로만 업로드하며, 다른 사진첩 이미지를 자동 수집하지 않습니다.
> - OCR 텍스트의 OpenAI 전송은 **텍스트 정제·일정 추출** 목적이며, 광고·프로파일링에 사용하지 않습니다.
> - 캘린더 이벤트 전송은 **사용자가 명시적으로 등록을 누를 때만** 발생합니다.

### 1-B. "수집 안 함" 으로 답할 데이터 유형 (왜 아닌지 명시)

> 아래는 Play 폼에서 흔히 오해해 잘못 "수집"으로 표시하기 쉬운 항목입니다. 코드 기준으로 **수집 안 함**이 정답입니다.

| 데이터 유형 (Play 카테고리) | 수집함? | 왜 "수집 안 함"인가 (코드 근거) |
|---|---|---|
| **개인 정보 → 이름** | 아니요 | 닉네임은 기기 로컬 저장소(AsyncStorage)에만 저장하고 서버로 전송하지 않음. `settings-store.ts`. 기기에만 머무는 값은 "수집"이 아님. |
| **개인 정보 → 이메일 주소** | 아니요 | 연결된 구글 계정 이메일은 표시용으로 기기 SecureStore에만 저장, 우리 서버 미전송. `google-auth.ts fetchEmail` → `secure-tokens.ts`. |
| **개인 정보 → 사용자 ID** | 아니요 | 인증이 익명(`signInAnonymously`)이라 계정 식별자가 없음. RLS용 익명 `user_id`는 내부 접근제어용이며 사용자 신원이 아님. `auth-store.ts`. |
| **금융 정보 / 결제 정보** | 아니요 | 현재 빌드에 결제·IAP 없음(`react-native-iap` 미설치). |
| **위치(대략/정확)** | 아니요 | 위치 권한·SDK 없음. `app.json` 권한은 사진 접근만. |
| **연락처** | 아니요 | 연락처 권한·접근 코드 없음. |
| **앱 활동 → 앱 상호작용 / 기타 작업** (분석) | 아니요 | 분석/제품 텔레메트리 SDK 없음(Sentry/PostHog/Firebase 미설치). |
| **기기 또는 기타 ID → 기기 ID, 광고 ID** | 아니요 | 광고·분석 SDK 없음 → 광고 ID·기기 ID 수집 안 함. |
| **웹 검색 기록 / 음악 / 건강 / 메시지 등** | 아니요 | 해당 기능·권한·코드 없음. |

### 1-C. Play 폼 상단 글로벌 질문 답안

| 질문 | 답 | 근거 |
|---|---|---|
| 이 앱이 위에서 설명한 데이터 유형을 **수집 또는 공유**합니까? | **예** | 사진·OCR 텍스트·캘린더 이벤트를 외부로 전송함. |
| 전송되는 모든 사용자 데이터가 **전송 중 암호화**됩니까? | **예** | 모든 외부 호출이 HTTPS(OpenAI, Google, Supabase). |
| 사용자가 **데이터 삭제를 요청**할 방법을 제공합니까? | **예** | 앱 내 직접 삭제(설정 → 데이터 → "내 데이터 삭제" → 확인 시 본인의 모든 캡처·이미지·주간 리포트·피드백을 서버에서 영구 삭제) + [[데이터 삭제 요청 URL 또는 지원 이메일]]을 통한 문의 경로. (아래 "채워야 할 항목" 참조) |
| 데이터 수집이 **앱 사용에 필수**입니까(선택 거부 가능 여부)? | 사진·OCR은 핵심 기능상 필수, **캘린더 전송은 선택** | 캘린더 연결은 사용자가 명시적으로 켤 때만 동작. |
| 데이터가 **제3자와 공유**됩니까? | **예** | OpenAI(텍스트), Google(캘린더), Supabase(인프라). |
| **가족 정책**(아동 대상) 적용 앱입니까? | [[아동 대상 여부 — 일반적으로 아니요]] | 타깃은 성인(디지털 워커 페르소나). 콘솔에서 대상 연령 설정에 맞춰 선택. |

---

## 2. Apple — 앱 개인정보 보호(App Privacy / Nutrition Labels) 입력표

App Store Connect "앱 개인정보 보호"는 데이터 유형별로 다음을 묻습니다:
**(a) 수집 여부** · **(b) 사용 목적** · **(c) 사용자 신원에 연결됨(Linked to You) / 연결 안 됨(Not Linked)** · **(d) 추적에 사용됨(Used to Track You)**.

> 핵심 원칙(코드 기준):
> - **익명 인증**이라 사용자 신원(이름·이메일·계정)이 없으므로, 수집하는 데이터는 모두 **"사용자에게 연결되지 않음(Not Linked to You)"** 으로 분류합니다.
> - **추적(Tracking) 없음**: 광고·분석·데이터 브로커 전달이 없으므로 모든 항목 **"추적에 사용 안 함"**, App Tracking Transparency(ATT) 불필요.
> - 기기에만 저장되고 전송되지 않는 데이터(OAuth 토큰·연결 이메일·닉네임)는 Apple 정의상 **"수집(Collect)"에 해당하지 않습니다.**

### 2-A. "수집함" 으로 신고할 데이터 유형

| 데이터 유형 (Apple 카테고리) | 추적에 사용(Used to Track)? | 신원 연결(Linked / Not Linked) | 사용 목적(Purpose) | 왜 이렇게 답하는가 (코드 근거) |
|---|---|---|---|---|
| **사용자 콘텐츠 → 사진 또는 동영상(Photos or Videos)** | 아니요 | **Not Linked to You** | 앱 기능(App Functionality) | 스크린샷을 Supabase 비공개 버킷에 업로드해 OCR·리포트 제공. 익명 인증이라 신원 미연결. `storage.ts`. |
| **사용자 콘텐츠 → 기타 사용자 콘텐츠(Other User Content)** | 아니요 | **Not Linked to You** | 앱 기능(App Functionality) | 이미지에서 추출한 OCR 텍스트를 OpenAI로 처리하고 `captures`에 저장. 텍스트=사용자 콘텐츠. `process-capture/index.ts`. |

> 캘린더 이벤트에 대한 Apple 처리: Apple App Privacy에는 Google Play의 "Calendar events"에 정확히 대응하는 별도 카테고리가 없습니다. 추출된 이벤트는 위 **"기타 사용자 콘텐츠"** 범주에 포함되며, 사용자가 자신의 Google 계정으로 직접 등록하는 동작입니다. 별도 항목 추가가 필요하면 "기타 사용자 콘텐츠"로 처리하면 됩니다.

### 2-B. "수집 안 함" 으로 답할 데이터 유형 (왜 아닌지 명시)

| 데이터 유형 (Apple 카테고리) | 수집함? | 왜 "수집 안 함"인가 (코드 근거) |
|---|---|---|
| **연락처 정보 → 이름** | 아니요 | 닉네임은 기기 로컬 저장소(AsyncStorage)에만 저장, 서버 미전송 → Apple 정의상 수집 아님. `settings-store.ts`. |
| **연락처 정보 → 이메일 주소** | 아니요 | 연결 구글 이메일은 기기 SecureStore에만 저장, 우리 서버 미전송. `google-auth.ts`, `secure-tokens.ts`. |
| **식별자 → 사용자 ID** | 아니요 | 익명 인증으로 사용자 신원 식별자 없음. 내부 RLS용 익명 id는 외부로 식별 가능한 사용자 ID가 아님. `auth-store.ts`. |
| **식별자 → 기기 ID** | 아니요 | 기기 ID·광고 ID 수집 코드/SDK 없음. |
| **사용 데이터(Usage Data) / 진단(Diagnostics)** | 아니요 | 분석·크래시 리포팅 SDK 없음(Sentry/PostHog 미설치). |
| **위치(정확/대략)** | 아니요 | 위치 권한·코드 없음. `app.json`은 사진 접근만. |
| **금융 정보 / 구매 내역** | 아니요 | 결제·IAP 없음. |
| **연락처(주소록)** | 아니요 | 주소록 접근 없음. |

### 2-C. Apple 폼 글로벌 질문 답안

| 질문 | 답 | 근거 |
|---|---|---|
| 이 앱이 데이터를 **수집**합니까? | **예** | 사진·OCR 텍스트를 외부(Supabase/OpenAI)로 전송. |
| 수집 데이터가 **사용자 추적(Tracking)**에 사용됩니까? | **아니요** | 광고·분석·데이터 브로커 전달 없음 → ATT 프롬프트 불필요. |
| 수집 데이터가 **사용자 신원에 연결(Linked)**됩니까? | **아니요(모두 Not Linked)** | 익명 인증이라 신원 식별 불가. |

---

## 3. 두 폼 공통 — 권한(Permissions) 대응

| 권한 | 선언 위치 | 사용자 대면 사유 문구 | 데이터 폼 매핑 |
|---|---|---|---|
| iOS `NSPhotoLibraryUsageDescription` | `app.json > ios.infoPlist` | "스크린샷 자동 감지를 위해 사진 접근이 필요해요. Memsum은 스크린샷만 인식하고 다른 사진은 보지 않습니다." | 사진(Photos) 수집과 직접 연결. |
| Android `android.permission.READ_MEDIA_IMAGES` | `app.json > android.permissions` | (스토어 설명·런타임 안내에 동일 취지 문구 사용) | 사진(Photos) 수집과 직접 연결. |

---

## 4. 채워야 할 항목 (플레이스홀더)

콘솔 제출 전에 아래 값을 확정해 본문의 대괄호를 교체하세요.

- [[데이터 삭제 요청 URL 또는 지원 이메일]] — 인앱 직접 삭제(설정 → 데이터 → "내 데이터 삭제")에 더해 Play "데이터 삭제 요청"·Apple 폼에 기재할 보조 문의 채널. (예: 지원 이메일 또는 정책 페이지 내 삭제 안내 섹션)
- [[개인정보처리방침 호스팅 URL]] — 두 스토어 모두 공개 URL 필수. (본 저장소의 개인정보처리방침 문서를 호스팅한 주소)
- [[Supabase 데이터 보관 리전]] — 코드에는 미고정. 프로젝트 개발 체크리스트 기준 후보는 Seoul(ap-northeast-2) 또는 Tokyo(ap-northeast-1). 실제 생성한 Supabase 프로젝트 리전으로 확정. (폼 필수 항목은 아니나 처리방침·내부 기록용)
- [[아동 대상 여부]] — 일반적으로 "아니요"(성인 타깃). Play 콘텐츠 등급·대상 연령 설정과 일치시킬 것.
- [[데이터 보관 기간 정책]] — 캡처 이미지·OCR 텍스트의 보관/자동 삭제 주기를 정의했다면 명시(현재 코드에 자동 만료 로직 없음 → 정책으로 보완 필요).
- [[OpenAI 데이터 처리 고지 문구]] — 텍스트가 OpenAI로 전송됨을 처리방침에 명시하는 문장(이미 사실로 확인됨, 문구만 확정).

---

> 작성 근거 파일: `supabase/functions/process-capture/index.ts`, `supabase/functions/weekly-report/index.ts`, `src/lib/google-auth.ts`, `src/lib/google-calendar.ts`, `src/lib/secure-tokens.ts`, `src/lib/storage.ts`, `src/lib/captures.ts`, `src/stores/auth-store.ts`, `src/stores/settings-store.ts`, `app.json`, `package.json`.
