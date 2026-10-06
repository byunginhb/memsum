# Memsum — Play Console 설문 답안 (Android, `app.memsum`)

> Play Console **정책 및 프로그램 → 앱 콘텐츠**와 **사진 및 동영상 권한** 선언에 그대로 옮겨 적는 답안이다.
> 모든 답은 2026-10-04 기준 코드로 확인했다(근거 파일은 각 행에 적음). 기능이 바뀌면 이 문서부터 고친다.
> 더 자세한 데이터 흐름 표(Apple 포함)는 `data-safety-and-privacy.md`. 이 문서가 Play 기준 최신 판단이다.

공통 값

| 항목 | 값 |
|---|---|
| 연락 이메일 | byunginhb@gmail.com |
| 웹사이트 | https://memsum.app/ |
| 개인정보처리방침 URL | https://memsum.app/privacy (영문 https://memsum.app/en/privacy) |
| 앱 카테고리 | 생산성(Productivity) |
| 앱/게임, 무료/유료 | 앱 / 무료 |

---

## 1. 사진 및 동영상 권한 선언 (READ_MEDIA_IMAGES)

콘솔 경로: 앱 콘텐츠 → **사진 및 동영상 권한**. 앱 번들에 `READ_MEDIA_IMAGES`가 있으면 이 선언이 없을 때 제출이 막힌다.
(`READ_MEDIA_VIDEO`는 `app.json`의 `blockedPermissions`로 제거했으므로 동영상 사용은 "없음"으로 답한다.)

질문 "앱의 핵심 기능에서 사진에 대한 광범위한 접근 권한이 필요한 이유"에 쓸 문구:

**English (콘솔에 붙여넣기 — 영문 권장)**
```
Memsum's core feature is automatic screenshot detection. While the user is in other apps, Memsum watches the device's media store for newly created screenshots (a JobScheduler content-URI trigger on MediaStore images), immediately posts a notification asking whether to save the new screenshot, and, when the user taps Save, reads the text in that screenshot and organizes it (title, summary, category, calendar date) without opening the app. This has to happen in the background at the moment a screenshot is taken, so it requires ongoing read access to newly added images. The Android photo picker cannot do this: it only returns images the user manually selects while the app is open, so it cannot notice a new screenshot in the background or know which image was just captured. Memsum only processes screenshots (it ignores other photos), and the user can turn auto-detection off in Settings. The photo picker is still used for the separate "import older screenshots" action.
```

**한국어 (참고용 번역 / 한국어 입력란이 있으면 사용)**
```
Memsum의 핵심 기능은 스크린샷 자동 감지입니다. 사용자가 다른 앱을 쓰는 동안 기기 미디어 저장소(MediaStore 이미지)에 새 스크린샷이 생기는 순간을 감지(JobScheduler 콘텐츠 URI 트리거)해 "Memsum에 저장할까요?" 알림을 바로 띄우고, 사용자가 [저장]을 누르면 앱을 열지 않고 그 스크린샷의 글자를 읽어 제목·요약·분류·일정으로 정리합니다. 이 동작은 스크린샷을 찍는 시점에 백그라운드에서 일어나야 하므로 새로 추가되는 이미지를 계속 읽을 수 있는 권한이 필요합니다. 시스템 사진 선택기는 앱이 열려 있을 때 사용자가 직접 고른 이미지만 돌려주므로, 백그라운드에서 새 스크린샷이 생긴 것을 알아차리거나 방금 찍힌 이미지가 무엇인지 알 수 없어 대체할 수 없습니다. Memsum은 스크린샷만 처리하고 다른 사진은 무시하며, 자동 감지는 설정에서 끌 수 있습니다. 예전 스크린샷을 불러오는 기능은 별도로 시스템 사진 선택기를 씁니다.
```

> 문구가 길다고 거절되면(글자 수 제한이 화면에 표시됨) 첫 문장 + "photo picker cannot …" 문장 + "only screenshots" 문장만 남긴다.
> 스토어 전체 설명 첫 문단(`listings/*/full.txt`)에 "스크린샷 자동 감지 → 알림 → 정리"를 명시해 이 선언과 일치시켰다. 둘 중 하나를 바꾸면 다른 쪽도 맞춘다.
> 심사에서 영상 증빙을 요구하면: 다른 앱 사용 중 스크린샷 → 알림 → [저장] → 앱에서 정리된 카드 확인까지 30초 화면 녹화.

코드 근거: `modules/photo-library-watcher/android/src/main/AndroidManifest.xml`(READ_MEDIA_IMAGES, POST_NOTIFICATIONS),
`modules/photo-library-watcher/android/.../ScreenshotAskJobService.kt`(백그라운드 감지 → 질문 알림 [저장]/[무시]),
`src/hooks/use-photo-import.ts`(expo-image-picker — 옛 스크린샷 수동 불러오기).

---

## 2. 데이터 보안 (Data safety)

### 2-1. 판단 원칙
- **수집** = 기기 밖으로 전송됨. 기기 안에만 있는 값(닉네임, 구글 토큰, 연결 이메일)은 수집이 아니다.
- **공유가 아닌 것**: 우리를 대신해 처리하는 **서비스 제공자**로의 전송 — Supabase(DB·스토리지·서버 함수), OpenAI(글자 정리·리포트 생성), PostHog(키를 넣은 경우 분석). 각사 약관상 우리 지시에 따라 처리하는 처리 위탁이므로 Play 정의상 "공유"가 아니다.
- **사용자가 직접 시작한 전송**(캘린더 등록 버튼, 캘린더 자동 등록을 사용자가 켠 경우)도 Play 정의상 공유 예외다.
- 결론: 모든 항목 **"공유: 아니요"**. (과거 `data-safety-and-privacy.md`에는 "공유: 예"로 적혀 있었다. 보수적으로 "예"를 골라도 정책 위반은 아니지만 사용자에게 불필요한 경고 배지가 붙는다.)

### 2-2. 상단 질문
| 질문 | 답 |
|---|---|
| 필수 데이터 유형을 수집·공유하나요? | **예** |
| 전송 중 암호화되나요? | **예** (Supabase·OpenAI·Google·PostHog 모두 HTTPS) |
| 사용자가 데이터 삭제를 요청할 수 있나요? | **예** — 앱 설정 → 데이터 → "내 데이터 삭제"(서버의 캡처·이미지·리포트·피드백 영구 삭제) + byunginhb@gmail.com |
| 계정 만들기 지원? | **아니요** — 회원가입 없음. 익명 세션(Supabase `signInAnonymously`)이 자동으로 붙을 뿐 사용자가 계정을 만들지 않는다. (계정 삭제 URL 질문이 나오면 https://memsum.app/privacy 의 삭제 안내 절을 쓴다) |

### 2-3. 항목별 답 — 항상 해당
| Play 데이터 유형 | 수집 | 공유 | 일시적 처리? | 필수/선택 | 목적 | 근거 |
|---|---|---|---|---|---|---|
| 사진 및 동영상 → **사진** | 예 | 아니요 | 아니요 | 필수(핵심 기능) | 앱 기능 | 스크린샷을 리사이즈해 Supabase 비공개 버킷 `captures-raw`에 업로드. `src/lib/storage.ts` |
| 앱 활동 → **기타 사용자 생성 콘텐츠** | 예 | 아니요 | 아니요 | 필수 | 앱 기능 | 기기에서 읽은 글자(OCR)를 서버 함수가 OpenAI `gpt-4o-mini`로 보내 정리, `captures` 테이블에 저장. 이미지는 OpenAI로 보내지 않음. `supabase/functions/process-capture/index.ts`, `weekly-report/index.ts` |
| 캘린더 → **캘린더 일정** | 예 | 아니요 | 아니요 | **선택** | 앱 기능 | 캘린더 연결 시에만, 추출된 제목·시간·장소를 사용자 본인 구글 캘린더에 `events.insert`. 기존 일정 읽지 않음. `src/lib/google-calendar.ts` |
| 기기 또는 기타 ID | 예 | 아니요 | 아니요 | 필수 | 앱 기능(+ 키 설정 시 분석) | 익명 사용자 id(Supabase auth uid)로 서버 데이터 접근을 구분(RLS). 개인을 식별하는 정보는 아니지만 "앱 인스턴스 식별자"라 보수적으로 신고. `src/stores/auth-store.ts` |

### 2-4. 빌드 환경에 따라 달라지는 항목 — 빌드 전에 `.env` 확인
| 조건 | 추가로 신고할 것 |
|---|---|
| `.env`에 **`EXPO_PUBLIC_POSTHOG_KEY`가 있음** | 앱 활동 → **앱 상호작용**: 수집 예 / 공유 아니요 / 필수 / 목적 **분석**. 이벤트 6종(photo_imported, capture_completed, report_viewed, report_item_opened, report_feedback, report_coachmark_dismissed)을 익명 id와 함께 전송. `src/lib/analytics.ts`. 또 PostHog는 기본으로 IP에서 대략 위치를 뽑으므로 **PostHog 프로젝트 설정에서 "Discard client IP data"를 켜라**. 못 켜면 위치 → **대략적인 위치**(분석)도 신고 |
| `EXPO_PUBLIC_POSTHOG_KEY`가 비어 있음 | 추가 없음(분석 코드는 전부 동작하지 않음) |

빌드 후 확인 명령: `unzip -p <apk> assets/index.android.bundle | grep -c "us.i.posthog.com"`는 키 유무와 상관없이 1 이상이다. 키가 실제로 들어갔는지는 `.env`를 본다(키 값을 문서나 채팅에 붙이지 말 것).

### 2-5. "수집 안 함" 항목
이름(닉네임은 기기에만), 이메일(연결 구글 계정 이메일은 기기 SecureStore에만), 사용자 ID(회원 계정 없음), 위치, 연락처, 금융·결제, 건강, 메시지, 오디오, 파일·문서, 웹 검색 기록, 앱 정보 및 성능(크래시 수집 SDK 없음), 광고 ID.

---

## 3. 광고 / 광고 ID
- 광고 포함: **아니요** (광고 SDK 없음)
- 광고 ID 사용: **아니요** — 광고·분석 SDK가 없고 최종 APK에 `com.google.android.gms.permission.AD_ID` 권한이 없다(`mobile-app.md`의 aapt 검증으로 확인). 이 질문을 빠뜨리면 API 제출이 "must declare the use of advertising ID"로 실패한다.

## 4. 앱 액세스 (로그인 세부정보)
- 선택: **"모든 기능을 특별한 액세스 권한 없이 이용할 수 있음"**
- 근거: 첫 실행 시 회원가입 없이 익명 세션으로 시작. 구글 캘린더 연결은 선택 기능이며 심사자 본인 구글 계정으로 가능.
- 안내란이 있으면(영문):
```
No login is required. The app starts with an anonymous session. Google Calendar connection is optional and uses the reviewer's own Google account via Google's OAuth screen. To test screenshot detection, allow photo and notification access, switch to another app, take a screenshot, and tap "저장"(Save) on the notification.
```
- 주의: 구글 OAuth 동의 화면이 아직 "미확인 앱" 상태면 연결 시 경고가 뜬다(고급 → 계속). 심사 거절 사유는 아니지만, 거절 메일에 언급되면 OAuth 검증 진행 상황을 회신한다.

## 5. 콘텐츠 등급 (IARC)
- 이메일: byunginhb@gmail.com
- 카테고리: **"유틸리티, 생산성, 커뮤니케이션 또는 기타"** (게임·소셜·뉴스 아님)
- 폭력/성적 콘텐츠/비속어/약물/도박: 모두 **아니요**
- 사용자 간 상호작용·콘텐츠 공유(다른 사용자에게 보임): **아니요** — 캡처는 본인만 본다(RLS)
- 사용자의 위치 공유: **아니요**
- 디지털 상품 구매: **아니요**
- 제한 없는 인터넷 접근(브라우저 등): **아니요** — 외부 링크는 구글 캘린더·정책 페이지 정도
- 예상 결과: 전체이용가 / PEGI 3 / ESRB Everyone

## 6. 타겟층 및 콘텐츠
- 타겟 연령: **18세 이상**만 선택(페르소나가 성인 직장인. 13세 미만을 넣으면 가족 정책 심사가 붙고, 13~17을 넣으면 청소년 관련 추가 검토가 생긴다. 개인정보처리방침도 만 14세 미만 비대상)
- 아동에게 어필할 수 있나요: **아니요**
- 스토어 등록정보에 아동 대상 요소 없음

## 7. 그 밖의 선언
| 항목 | 답 |
|---|---|
| 뉴스 앱 | 아니요 |
| 코로나19 추적·상태 앱 | 아니요 |
| 정부 앱 | 아니요 |
| 금융 기능 | 해당 없음 |
| 건강 앱 | 아니요 |
| 데이터 보안 섹션의 "독립적 보안 검토" | 아니요 |
| 정확한 알람 권한(USE_EXACT_ALARM) 선언 | 최종 APK에 해당 권한이 있을 때만 필요 — `mobile-app.md`의 권한 목록 참고 |
| 포그라운드 서비스 권한 선언 | 최종 APK에 FOREGROUND_SERVICE_* 가 있을 때만 필요 — 같은 목록 참고 |
