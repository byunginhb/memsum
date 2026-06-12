# Memsum — 당신이 직접 해야 할 일 (USER ACTIONS)

> Claude가 코드/명령을 자동 진행하면서, **사람만 할 수 있는 일**을 여기에 모읍니다.
> 항목이 추가되면 이 문서 상단 "지금 필요한 일"에 먼저 올립니다.

---

## 🔴 지금 시작하면 좋은 준비 (후보 2·3 — 시간 걸리는 계정/결제/OAuth)

> 아래는 **사람만 할 수 있는 설정**입니다. 제가 코드·에셋·메타데이터·정책 문서는 전부 준비하니, 시간이 걸리는 계정 가입·결제·OAuth 발급을 지금부터 병행해 주시면 매끄럽게 출시까지 갑니다.

### A. 캘린더 연동용 — Google Cloud OAuth (후보 2)
1. https://console.cloud.google.com → 새 프로젝트 `memsum` 생성
2. **API 및 서비스 → 라이브러리** → "Google Calendar API" **사용 설정**
3. **OAuth 동의 화면**: External, 앱 이름 `Memsum`, 지원 이메일, 스코프 `.../auth/calendar.events` 추가, 테스트 사용자에 본인 이메일 추가
4. **사용자 인증 정보 → OAuth 2.0 클라이언트 ID** 발급:
   - iOS 클라이언트 (Bundle ID `app.memsum`) ✅ 발급됨
   - Android 클라이언트 (패키지 `app.memsum` + SHA-1 지문) ✅ 발급됨
   - ~~Web 클라이언트~~ → **불필요**(아래 설명)
5. 발급된 **클라이언트 ID**(들)를 알려주시면 `.env`·설정에 반영합니다.

**받은 자격증명 (2026-06-08):**
- iOS 클라이언트 ID: `649138266676-kkj5lepd53o1fu8ha04tppj6qd9604nk.apps.googleusercontent.com` ✅ `.env` 반영됨
- Android 디버그 SHA-1 (`android/app/debug.keystore`, 개발/테스트용): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
- Android 클라이언트 ID: `649138266676-j8bl0afld4bfps2cldigvltfd677elvi.apps.googleusercontent.com` ✅ `.env` 반영됨
- ✅ **Web 클라이언트 ID는 발급 안 해도 됩니다.** 우리는 **네이티브 Authorization Code + PKCE** 플로우를 쓰는데, 이 방식은 iOS/Android 클라이언트(public client)만으로 access·refresh 토큰을 받습니다. client secret도, Web 클라이언트도 필요 없습니다. (기다리시던 그 항목, 이제 신경 안 쓰셔도 됩니다.)
- ⚠️ 출시 단계에서 EAS 업로드 키 SHA-1 + Play 앱 서명 SHA-1을 같은 Android 클라이언트에 **추가** 필요

#### ❗ C2 동작을 위해 지금 확인할 2가지 (Google Cloud Console)
1. **OAuth 동의 화면 스코프에 `.../auth/calendar.events` 가 추가돼 있는지** 확인(없으면 추가). 위 3번에서 이미 하셨으면 OK.
2. **테스트 사용자에 본인 구글 계정(연결 테스트할 계정)이 추가돼 있는지** 확인. 앱이 "테스트" 상태이므로 등록된 테스트 사용자만 로그인됩니다.

> 참고: 출시 전 OAuth 앱 "게시" 상태 전환·Google 검증이 필요할 수 있습니다(민감 스코프). 테스트 단계는 테스트 사용자만으로 충분합니다.

#### ❗ C2 코드 반영 후 — 네이티브 재빌드 1회 필요
캘린더 연동은 네이티브 모듈(`expo-secure-store`)과 OAuth 리다이렉트 URL 스킴을 추가하므로, **Fast Refresh로는 안 되고 네이티브 재빌드가 1회 필요**합니다(이후엔 다시 Metro만으로 충분).
```bash
# 둘 중 실행할 플랫폼만
pnpm ios       # = expo run:ios  (자동 prebuild 포함)
pnpm android   # = expo run:android
```

### B. 스토어 출시용 — 개발자 계정 (후보 3)
1. **Apple Developer Program** — https://developer.apple.com/programs/ 가입 ($99/년 결제). 가입 후 Team ID 확보.
2. **Google Play Console** — https://play.google.com/console/signup 가입 ($25 1회 결제).
3. (제가 준비) 앱 아이콘·스플래시·스토어 스크린샷·설명·개인정보처리방침 → 가입 완료되면 콘솔에 업로드(GUI는 사용자) 안내.

> 인증서·프로비저닝·스토어 리스팅 입력은 GUI라 사용자만 가능. EAS가 인증서 자동 관리를 도와줍니다(EAS 로그인 필요 — 추후 안내).

---

## 🔴 배포 직전 체크리스트 — 남은 것은 4가지 (2026-06-12 갱신)

코드·검증·문서·정책 호스팅까지 끝났습니다. **아래 4가지만 하시면 스토어 제출이 가능합니다.**
(순서 = 리드타임 긴 순. 1·2·3은 오늘 시작 권장)

### 1. Google OAuth 검증 — ⏸️ 보류 중 (커스텀 도메인 필요 — 2026-06-12 확인)
**진행 결과**: 브랜딩 입력(앱명·지원이메일·로고·홈페이지·정책 링크) 완료, 프로덕션 게시 완료,
Search Console 소유 확인 완료(`/memsum/` + 루트 둘 다). 그러나 **브랜딩 인증이 반복 거부**.

**원인(구글 공식 정책)**: `*.github.io` 같은 **공유 호스팅 서브도메인은 Search Console
확인을 해도 "내 소유"로 인정하지 않음** (Trust & Safety 팀: "github.io 등은 피해야 한다").
Firebase web.app 사용자들도 동일하게 막힘 — 해결책은 커스텀 도메인뿐.

**현재 상태로 되는 것 / 안 되는 것**:
- ✅ 앱의 모든 기능(감지·정리·리포트)은 검증과 무관하게 정상
- ✅ 캘린더 연동도 동작하지만, 연결 시 "확인되지 않은 앱" 경고 화면이 뜸
  (고급 → "memsum(안전하지 않음)으로 이동"으로 진행 가능, 신규 사용자 100명 한도)
- ❌ 경고 없는 깔끔한 동의 화면은 검증 통과 후에만

**출시 직전에 할 일** (도메인 구매 결정 시 — 이후 설정은 Claude가 전부 자동 처리):
1. 도메인 구매 (추천: `memsum.app`, 연 $14~20 — Cloudflare Registrar/Namecheap/가비아)
2. Claude가: GitHub Pages CNAME 연결 → 정책 페이지·스토어 문서 URL 전부 교체 →
   DNS 레코드값 안내(등록처에 붙여넣기) → Search Console 도메인 속성 → 브랜딩 재제출
3. 브랜딩 통과 → Data access(민감 스코프) 검증 제출(정당화 문구 준비됨) — 보통 2~3영업일+α

### 2. Apple Developer Program 가입 — $99/년
- https://developer.apple.com/programs/ (개인 등록 기준 1~2일 소요 가능)

### 3. Google Play Console 가입 — $25 1회
- https://play.google.com/console/signup (신원 확인 1~2일 소요 가능)

### 4. EAS 로그인 (계정 가입 후)
```bash
eas login && eas init      # projectId가 app.json에 자동 기록됨
```
→ 여기까지 되면 제가 production 빌드·제출 명령과 콘솔 입력값을 순서대로 안내합니다.

### ✅ 제가 이번에 끝낸 것 (2026-06-12)
- **개인정보처리방침 게시**: https://byunginhb.github.io/memsum/privacy.html (영문: /privacy-en.html, 랜딩: /)
  - 원본은 `docs/store/privacy-policy.*.md` (SSOT) — 수정 시 `node scripts/gen-web-policy.mjs` 재실행 후 gh-pages 푸시
- **스토어 문서 확정값 반영**: 운영자명 Byungin Song / 지원 이메일 byunginhb@gmail.com /
  정책·지원 URL / 시행일 2026-06-12 / 삭제 요청 채널 / 데이터 리전 등 일괄 기입
  - 남은 플레이스홀더는 제출 시 결정 항목 4개뿐: 이용약관 URL(선택), 앱 이름·부제 최종안, 연령 등급 설문
- **iOS 재빌드 + 검증**: 무음 자동 저장 PASS(DB +1, 토스트 없음, 홈 카드 갱신), 캘린더·JS 에러 0건
- **Android release 빌드 검증**: 프로덕션 모드(임베디드 번들)에서 기동·감지 잡·주간 알람·
  [저장] 무음 저장(32초, 앱 미전환) 전부 PASS
- **스토어 스크린샷 5종 → 제출 품질로 교체**: release 빌드 + 실제 파이프라인 데이터
  (실제 썸네일·GPT 제목/요약/일정·리포트 1~5위 랭킹) + 깨끗한 상태바(데모 모드 9:00).
  `assets/store/screenshots/` — 그대로 콘솔 업로드 가능
- **연속 캡처 유실 버그 수정(중요)**: 백그라운드에서 여러 장 찍고 응답 없이 앱에 돌아오면
  **마지막 1장만** 정리되던 캐치업 버그(LIMIT 1)를 발견·수정(양 플랫폼, 상한 20).
  데모 시드 5건 연속 주입 → 5건 전부 자동 정리되는 것 라이브 검증 완료

---

## ✅ 알림 정책 확정 — "평소엔 완전 무음, 일요일 저녁에 짜잔" (2026-06-12)

요청하신 정책을 구현하고 Android 에뮬레이터에서 라이브 검증까지 완료했습니다.

### 새 동작
- **[저장]을 누르면 그냥 저장만** — 앱 전환 없음, "정리했어요" 같은 결과 알림도 없음(완전 무음).
  다음에 앱을 열면 목록에 들어와 있습니다.
- **앱 사용 중 감지도 무음** — 토스트 없이 조용히 저장(실패 시에만 에러 토스트).
- **주 1회 리포트 푸시** — 기본 **일요일 저녁 7시**, "일요일 5줄 리포트가 도착했어요".
  탭하면 주간 리포트 화면으로 이동. 설정 → 권한 → "주간 리포트" 토글로 on/off(기본 ON).
- **구글 캘린더 자동 등록** — 설정 "캘린더 자동 등록"(기본 ON) + 구글 캘린더 연결 상태면,
  캡처에서 날짜가 감지될 때 **제목+시간으로 자동 등록**([저장] 백그라운드 처리에서도 동작).
  미연결이면 조용히 건너뜀(캡처 상세에서 수동 등록은 계속 가능).
- 질문 알림("Memsum에 저장할까요?")은 **항상 최신 1건만** 유지 — 연속 캡처 시 알림이
  쌓여 그룹으로 묶이며 [저장] 버튼이 가려지던 문제를 고정 ID 교체 게시로 해결.

### 라이브 검증 결과 (Android)
- [저장] 탭 → 24초 내 DB 저장, **잔여 알림 0건**(완전 무음), 앱 미전환(런처 유지) ✓
- 주간 알람 OS 등록: 다음 발화 **2026-06-14(일) 19:00 KST** ✓
- 캘린더 미연결 시 에러 없이 조용히 skip ✓ / `pnpm typecheck`·`lint` 그린

### 직접 확인하시려면 (선택)
- **자동 캘린더 end-to-end**: 설정 → 연동 → 구글 캘린더 연결(본인 계정 로그인 필요 — 제가
  자동 검증할 수 없는 유일한 구간) → 날짜 있는 화면 캡처 → 구글 캘린더에 일정 자동 생성 확인.
- **주간 푸시**: 일요일 저녁 7시까지 그대로 두시면 됩니다(에뮬레이터/실기기 모두).

### 알려진 한계 (비차단)
- 연속 스크린샷 후 마지막 것만 [저장]하면 그 이전의 응답 안 한 항목은 자동 회수 대상에서
  제외됩니다(중복 방지 마커가 전진). 원본은 사진첩에 남아 있고, 빈도가 낮아 트레이드오프로 수용.
- iOS는 OS 서스펜드 제약으로 백그라운드 질문 푸시가 불가(기존 문서화) — 복귀 시 자동 회수로 동일 결과.

---

## ✅ 스크린샷 자동 감지 — 시뮬레이터 테스트 가이드 (2026-06-11)

> "시뮬레이터에서 스크린샷을 찍어도 반응이 없다"는 문의의 답. **양쪽 시뮬레이터의 기본
> 스크린샷 단축키는 맥(호스트)에 저장**되어 앱(게스트 OS)이 볼 수 없습니다. 아래 방법으로
> 테스트하세요. 동시에 발견된 실제 버그 3건(부트 윈도우 유실·iOS 업로드 불가·백그라운드
> 동결 유실)도 수정·검증 완료했습니다.

### Android 에뮬레이터에서 테스트하는 법
- ❌ **에뮬레이터 툴바의 카메라 버튼** → 맥에 저장됨(감지 불가)
- ✅ **에뮬레이터 안에서 찍기**: 전원 버튼 길게 → "스크린샷", 또는 앱 서랍의 설정에서 스크린샷,
  또는 터미널에서 `adb shell input keyevent 120`
- 결과: 포그라운드면 **조용히 저장**(무음 정책 — 몇 초 내 홈 목록 갱신으로 확인)

### iOS 시뮬레이터에서 테스트하는 법
- ❌ **Cmd+S 스크린샷** → 맥에 저장됨. iOS 시뮬레이터는 구조적으로 스크린샷이 사진 보관함에
  들어가지 않아 실제 스크린샷 감지는 **실기기에서만** 테스트 가능합니다.
- ✅ **대신 사진 추가로 파이프라인 테스트**: 이미지를 시뮬레이터 창에 드래그하거나
  `xcrun simctl addmedia booted <이미지.png>` → 시뮬레이터 빌드는 "새로 추가된 사진"도
  감지하도록 완화돼 있어(실기기는 스크린샷만) 동일 파이프라인이 돕니다.

### 동작 방식(요약) — 무음 정책 (2026-06-12 갱신)
- **앱 사용 중(포그라운드)**: 감지 → **조용히** 업로드·OCR·GPT·저장(토스트 없음, 실패 시에만 에러 토스트) → 목록 갱신
- **다른 앱 사용 중(백그라운드, Android)**: 찍는 순간 상단에 **"Memsum에 저장할까요?"** 헤드업 푸시
  - **[저장]**: 앱을 열지 않고 백그라운드에서 조용히 정리·저장(작업 비방해 — Headless JS).
    **결과 알림 없음(완전 무음)** — 다음에 앱을 열면 목록에 들어와 있음
  - **본문 탭**: 앱을 열어 바로 확인하며 저장(보고 싶은 사용자용)
  - **[무시]**: 알림만 제거(저장 안 함)
  - 질문 알림은 **항상 최신 1건만** 유지(새 스크린샷이 이전 질문을 교체 — 누적 시 OS가
    그룹으로 묶어 버튼이 가려지는 문제 방지. 응답 안 한 옛 항목은 앱 복귀 시 자동 회수)
  - 구현: Android 12+의 cached-app freezer가 백그라운드 앱의 옵저버 콜백을 동결하므로,
    **JobScheduler + TriggerContentUri**(OS가 동결 앱을 깨워줌)로 네이티브 알림을 게시 — 라이브 검증됨
- **앱 시작 직후(JS 로딩 중) 찍은 스크린샷**: 로딩 완료 시 자동 회수(checkNow) ✓ 검증됨
- **iOS**: 백그라운드는 OS가 앱을 서스펜드하므로 즉시 푸시는 불가(플랫폼 제약) — 복귀 시 자동 회수 ✓ 검증됨
- 한계(플랫폼 제약): 앱 프로세스가 완전히 종료된 상태에서 찍은 스크린샷은 다음 실행 시점
  기준 "과거"라 자동 회수하지 않음(과거 사진 오발화 방지와 트레이드오프)

---

## ✅ C3 스토어 배포 준비 완료 (2026-06-10) — 배포 전 당신 액션 정리

스토어 제출에 필요한 **코드·에셋·문서**를 모두 준비했습니다. 아래 "당신만 할 수 있는 것"만 처리하면 제출 가능합니다.

### 제가 완료한 것 (커밋됨)
- **eas.json** — development/preview/production 빌드 프로파일 + submit 설정(플레이스홀더)
- **app.json** — version 1.0.0 / iOS buildNumber 1 / Android versionCode 1 / iOS 수출규정(ITSAppUsesNonExemptEncryption=false)
- **브랜드 아이콘·스플래시** — Expo 템플릿 → Memsum 9닷 마크(라벤더 #7C6FE8 + 흰 점 + 우하단 코랄). `scripts/gen-icons.mjs`로 재생성 가능
- **애니메이션 스플래시** — 첫 실행 시 9닷이 움직이는 모션 약 1초 후 앱 전환(`src/components/AnimatedSplash.tsx`)
- **인앱 데이터 삭제** — 설정 → 데이터 → "내 데이터 삭제"(개인정보·스토어 데이터 삭제 요건 충족, 라이브 검증됨)
- **스토어 문서** (`docs/store/`) — 개인정보처리방침(ko/en)·리스팅 카피(ko/en)·데이터안전 양식·제출 체크리스트(코드 기준 정확, 교차검증 완료)

### 🔴 당신만 할 수 있는 것 (배포 전)

**1. 채워야 할 플레이스홀더** (스토어 문서 `[[...]]` 표시 항목)
- 지원/문의 이메일, 개인정보처리방침 **호스팅 URL**(아무 정적 호스팅 가능 — GitHub Pages·Vercel·Notion 공개 페이지 등), 사업자/개발사 표기명, 정책 시행일
- 데이터 보관 기간 정책 문구(현재 자동 만료 없음), 이용약관 URL(권장)
- → `docs/store/*.md` 각 파일 끝 "채워야 할 항목"에 모아뒀습니다.

**2. 계정·결제** (이미 안내한 후보 B)
- Apple Developer Program($99/년), Google Play Console($25 1회) 가입 → Team ID·판매자 등록

**3. EAS 설정** (제가 대신 못 함 — 로그인 필요)
```bash
npm i -g eas-cli            # 이미 설치돼 있으면 생략
eas login                   # Expo 계정 로그인
eas init                    # projectId 발급 → app.json에 자동 기록
eas build --profile production --platform all   # 스토어 빌드
```

**4. 그래픽·스크린샷 — ✅ 제가 생성 완료**
- **피처 그래픽** `assets/store/feature-graphic.png` (1024×500, 브랜드 라벤더 + 9닷 + 워드마크/태그라인). 그대로 Google Play에 업로드 가능.
- **스크린샷 5종** `assets/store/screenshots/` (홈 대시보드·주간 리포트·이벤트 상세·캘린더 연결·설정). 시드 데이터로 캡처한 것이라 썸네일은 placeholder입니다.
- ✅ **(2026-06-12 갱신) release 빌드 + 실제 데이터로 교체 완료** — 그대로 콘솔 업로드 가능.
  기기 프레임/캡션을 입힌 마케팅 버전은 선택 사항(원하시면 추후 제작).
- 생성 스크립트: `node scripts/gen-icons.mjs`(아이콘), `node scripts/gen-feature-graphic.mjs`(피처 그래픽) — 색·문구 수정 시 재실행.

### ❗ 네이티브 재빌드 1회 필요 (아이콘·스플래시·secure-store 반영)
브랜드 아이콘·라벤더 스플래시·캘린더 secure-store는 **네이티브 설정**이라 재빌드해야 실제 적용됩니다(JS 화면은 Metro로 즉시 반영).
```bash
pnpm ios       # = expo run:ios  (자동 prebuild 포함)
pnpm android   # = expo run:android
```
> 현재 Android 에뮬레이터에 설치된 빌드는 옛 아이콘/스플래시입니다. 위 명령으로 재빌드하면 새 브랜드 에셋 + 애니메이션 스플래시가 보입니다.

### ⚠️ 구글 OAuth 출시 주의 (이미 안내)
`calendar.events`는 Google 민감 스코프 → 출시 시 OAuth 동의 화면 **게시(production) + 브랜드/스코프 검증**이 필요할 수 있습니다(검증에 수일~수주 버퍼 권장). 테스트 단계는 테스트 사용자만으로 충분합니다.

---

## ✅ C2 캘린더 Google OAuth 연동 완료 (2026-06-10)

감지된 일정을 구글 캘린더에 등록하는 기능을 **구현·교차검증·Android 라이브 검증**까지 완료. (커밋 `c4926ac`)

### 핵심 결정
- **네이티브 Authorization Code + PKCE** 플로우 → iOS/Android 클라이언트(public client)만으로 토큰 발급. **client secret·Web 클라이언트 ID 불필요**(기다리던 Web ID, 안 써도 됨).
- 토큰은 **SecureStore(Keychain/Keystore)에만** 저장(AsyncStorage 금지). 스코프는 `calendar.events` 최소 권한.
- **멱등 등록**: captureId 기반 결정적 event id → 같은 일정 재등록 시 409로 거부되어 캘린더 중복 생성 방지.

### 라이브 검증 (Android 에뮬레이터, 재빌드 후)
- secure-store 네이티브 모듈 + OAuth scheme 배열 prebuild 반영 → **BUILD SUCCESSFUL**.
- 캘린더 탭(미연결 연결 안내) / 설정 "연동" 섹션 행 / 캡처 상세 "캘린더에 추가" 렌더 ✓.
- "연결" 탭 → 앱이 **Chrome Custom Tab으로 구글 동의 진입** ✓ (실제 로그인은 본인 계정 자격증명 필요 — 거기까지만 자동 검증).
- 취소(브라우저 back) → 앱 복귀, 크래시 없음 ✓. `pnpm typecheck`·`pnpm lint` 그린.
- 리뷰: code-reviewer·security-reviewer 교차검증 **critical/high 0건**, medium·low 전부 반영(멱등 등록·htmlLink https 가드·동시성 가드·응답 런타임 검증 등).

### 당신이 직접 테스트하려면
1. **iOS도 쓰려면** `pnpm ios`로 1회 재빌드(네이티브 모듈·스킴 반영). Android는 이미 재빌드됨.
2. 설정 → 연동 → "구글 캘린더" 또는 캘린더 탭 → "구글 캘린더 연결" 탭 → 브라우저에서 **본인 구글 계정(테스트 사용자로 등록된)으로 로그인·동의**.
3. 캡처 상세에서 "캘린더에 추가" → 구글 캘린더 앱/웹에서 일정 확인.

### 알려진 후속 점검(비차단)
- 홈 화면 시작 시 **개발 전용 LogBox 경고**("hasn't mounted yet")가 잠깐 떴다 사라짐. 홈(C1) 영역 + `reactCompiler` 실험 플래그 정황. 프로덕션 무영향. 다음에 데이터 훅 마운트 타이밍 점검 예정.

---

## ✅ Week 6 완전 완료 (2026-06-07) — 지금 필요한 일 없음

**3개 워크스트림 병행**(주간 5줄 리포트 / 설정 화면 / 디자인 잔여 정합)을 멀티 에이전트로 **계획→공통 컴포넌트→화면·백엔드→교차검증→라이브 검증**까지 완료.

### 신규 기능
- **주간 5줄 리포트(Hero Moment)** — 제품 핵심 가치. 한 주 캡처 중 gpt-4o-mini가 5개 선별·랭킹·요약. 1위 카드 coral 강조(display 28pt) + 2~5위 elevated, ritual(1200ms) stagger 등장 + 1위 reveal 햅틱, up/down 피드백. 온디맨드 생성 + 주당 캐시(재호출 시 OpenAI 0회), 캡처<5 빈 상태, OpenAI 실패 시 created_at 폴백.
- **설정 화면** — 계정(닉네임·Avatar)/권한(자동감지·캘린더·리포트 Switch)/스타일(다크모드 3택·말투 2택)/데이터(백업·내보내기·삭제 "준비 중" 토스트). 로컬 영속 닉네임으로 리포트 개인화("{name} 님이 던지신…").
- **공통 컴포넌트 7종** — Input·ListItem·Switch·Avatar·Toast(전역)·NotificationCard(Liquid Glass)·Card padding 3단계. 홈 헤더에 검색·리포트·설정 진입점 추가.

### 백엔드 (적용·배포됨)
- 마이그레이션 **0004_weekly_reports.sql** 적용 — `weekly_reports`·`report_feedback` 테이블 + RLS(본인만).
- Edge Function **weekly-report** 배포(ACTIVE) — `OPENAI_API_KEY` 시크릿 공유(process-capture와 동일). **참고: 캐시 미스 시에만 OpenAI 호출**(같은 주 재조회는 비용 0).

### 교차검증 후 반영 (CRITICAL 0)
- ReportCard reduce-motion 후발 활성화 시 카드 가시성 보장(최종값 강제) + 1위 햅틱을 reveal 완료 콜백에 결합.
- 피드백 captureId별 in-flight 가드(연타 race 방지), Edge Function captures 쿼리 `user_id` 명시(defense-in-depth), 에러 카피 i18n화, 리포트 헤딩 hero(34)→heading(22) 위계 정정.

### 라이브 검증 (Android, 시드 캡처 6건)
- 홈 6장 카드 + 헤더 4진입점 ✓ / 설정 4섹션·Switch·세그먼트·Avatar ✓ / 닉네임 Input 시트 ✓
- **리포트: GPT가 6건 중 5건 선별·요약·랭킹 → Hero UI 렌더, 캐시(week_start KST 월요일·total 6) ✓**
- 좋아요 → `report_feedback` DB 기록 + 낙관적 UI ✓ / `pnpm typecheck`·`pnpm lint` 그린(에러 0)
- 검증 후 테스트 데이터(캡처·리포트·피드백) 전량 정리.

### 메모
- 디자인 SSOT 내부 모순 2건(§11/§20 gentle stiffness, §11/§27 햅틱 카드)은 구현이 합리적 선택을 했고, 문서 갱신은 후속 과제.
- 후속 후보: 홈 화면을 design.md §26(개인화 large 헤더·주간 통계 카드)으로 정렬, dev 데모에 신규 컴포넌트 등록, Input maxLength/keyboardType 패스스루.

---

## ✅ Week 5 완전 완료 (2026-06-07) — 지금 필요한 일 없음

**디자인·사용성 집중 주차.** `projectmd/designmd/design.md`("Calm Glass" 컨셉)에 맞춰 온보딩·디자인 컴포넌트·브랜드 모션·Liquid Glass를 구현하고, **2개 리뷰 에이전트(코드+디자인 정합성) 교차검증 → 발견사항 반영 → Android 라이브 검증**까지 완료.

### 구현 (W5-A~C)
- **온보딩 플로우**: 환영(애니메이션 DotsGrid 로고) → 가치 3종(자동감지·캘린더·일요일 5줄) → 시작. `pagingEnabled` 스와이프 + [다음]/[건너뛰기], AsyncStorage 영속 게이트(`completed`).
- **디자인 컴포넌트**: Badge·EmptyState·Header·SearchBar + 브랜드 9닷 로고 애니메이션(`DotsGrid`, reanimated4 spring).
- **Calm Glass**: 캡처 Sheet 상단에 Liquid Glass 밴드(64px, iOS26+ `GlassView` / 그 외 tint 폴백), 따뜻한 한국어 카피.

### 교차검증 후 반영 (W5-E)
- **CRITICAL**: DotsGrid 애니메이션 `cancelAnimation` cleanup 추가(언마운트 누수 방지) + 비애니메이션 시 accent 점 흰색으로 남던 버그 수정.
- **디자인 토큰 P0**: `motion.duration.ritual=1200`·`motion.stagger=50` 추가, `typography.hero` weight `800→700`(명세 "800 금지"), 전 스케일 `tracking`(자간) + `letterSpacingFor()` 헬퍼.
- **접근성**: reduce-motion(DotsGrid)·reduce-transparency(Glass) 대응, `accessibilityRole="text"`(RN 비표준) 전부 제거.
- **통합**: 검색 화면이 디자인시스템 `SearchBar` 사용(이중 구현 제거), i18n `t(key, params)` 보간 도입(`{count}개` 등 수동 replace 제거).
- **토큰화**: 백드롭 딤 `colors.scrim` 토큰, Badge `#FFFFFF`→`colors.onPrimary`.

### 라이브 검증 결과 (Android 에뮬레이터)
- 온보딩 4페이지 스와이프·[다음]·[시작하기]→홈 진입·`completed` 영속 확인.
- 홈 EmptyState(DotsGrid 로고+따뜻한 카피), 캡처 카드(일정 Badge·썸네일), 캡처 Sheet 64px Glass 밴드+scrim, 검색("2026"→"1개" 보간·"지우기" a11y 라벨) 전부 동작.
- `pnpm typecheck`·`pnpm lint` 모두 그린(에러 0).

### 메모
- iOS는 Liquid Glass 네이티브가 iOS26+에서만 실제 렌더 → iOS 시뮬레이터 검증은 네이티브 재빌드 후 진행 예정(Android는 tint 폴백으로 검증 완료).
- 다음 후보: 주간 5줄 리포트(Hero Moment), 설정 화면(Input·ListItem 컴포넌트는 이때 구현), Header 개인화("수현 님") — design.md 잔여 격차.

---

## ✅ Week 4 완전 완료 (2026-06-07) — 지금 필요한 일 없음

캡처 리스트·검색·상세가 **라이브 UI + 데이터 레이어 모두 검증**됨.

### 검증 결과
- 샘플 캡처 FAB → 업로드·OCR·GPT → captures 저장 → **홈 리스트에 카드**(썸네일·제목·"일정 감지됨" 배지·날짜) → 탭 → **상세**(요약·이벤트 6/15 14:00·코엑스·OCR 전문·캘린더 추가 버튼) 전부 동작.
- 검색: `searchCaptures` jsonb `.or()` ILIKE 매칭 REST+DB 검증.
- 데이터 레이어(list/search/get) RLS 세션 스코프 + 썸네일 batch 서명URL.

### 고친 버그
- `useCaptures` 마운트 시 `setIsLoading`이 RefreshControl 마운트 전 동기 호출 → "hasn't mounted yet" 경고(개발 LogBox 레드박스) → 초기 fetch를 setTimeout(0)으로 defer해 제거(리로드 후 0건 확인).

### 화면 구조 메모
- 홈(`/`) = 캡처 리스트. 검색(`/search`), 상세(`/captures/[id]`). 디자인시스템 데모는 `/dev`로 보존(헤더 우측 슬라이더 아이콘).

---

## ✅ Week 3 완전 완료 (2026-06-06) — 지금 필요한 일 없음

캡처 저장 흐름이 **end-to-end로 실제 동작·DB 저장까지 검증**됨.

### 검증 결과 (앱 → DB 실측)
샘플 캡처 → 익명세션 → 이미지 업로드 → OCR → GPT 후처리 → captures 기록:
- captures row 생성: `status=ocr_done`, `source_platform=android`
- `image_url`: `{익명uid}/cap_....jpg` (본인 폴더, Storage RLS 준수)
- `ocr_text`: "Memsum 디자인 위크 2026 / 6월 15일 토요일 오후 2시 / ..."
- `parsed_event`: title="Memsum 디자인 위크 2026", starts_at=`2026-06-15T14:00:00+09:00`, location="코엑스 그랜드볼룸"
- CaptureSheet에 제목·요약·이벤트카드·[저장만]/[캘린더 추가] 정상 표시

### 완료된 셋업 (참고)
- 익명 로그인(Anonymous sign-ins) 활성화 ✓ · captures-raw 버킷 + RLS ✓

### 기술 메모
- 캡처 Sheet는 @gorhom/bottom-sheet v5가 reanimated4 스택에서 silent fail 하여 **RN 내장 Modal**로 구현.
- 향후 reanimated 기반 모션(로고 점 애니메이션 등) 추가 시 reanimated4 호환을 별도 점검 필요.

---

## ✅ Week 2 완전 완료 (2026-06-06) — 지금 필요한 일 없음

Phase 2a(온디바이스 OCR) + Phase 2b(OpenAI 후처리 Edge Function) 모두 **실측 검증 완료**.

### Phase 2b 최종 검증 결과 (HTTP 200)
입력: `"디자인 위크 2026 / 6월 15일 토요일 오후 2시 / 장소: 코엑스 그랜드볼룸 / 사전등록 필수"`
→ gpt-4o-mini 출력:
- title: `디자인 위크 2026`
- summary: `디자인 위크 2026이 6월 15일 토요일 오후 2시에 코엑스 그랜드볼룸에서 개최됩니다.`
- event.starts_at: `2026-06-15T14:00:00+09:00` (한국어 날짜→ISO8601 KST 정확 변환)
- event.location: `코엑스 그랜드볼룸`
- captures 테이블 기록까지 확인

### 완료된 셋업 (참고)
- Supabase 로그인·link, `OPENAI_API_KEY` Edge Function 시크릿 등록, OpenAI 결제 활성화 ✓
- `process-capture` 배포(ACTIVE) ✓

---

## ✅ 현재 상태 (Week 1 검증 완료 — 2026-06-06)

iOS 시뮬레이터 · Android 에뮬레이터 양쪽에서 **빌드·실행·렌더 확인 완료**.

| 검증 항목 | 결과 | 증거 |
|---|---|---|
| iOS 빌드·실행 (iPhone 16) | ✅ | Build Succeeded + app.memsum 설치·실행, 디자인 시스템 렌더 |
| Android 빌드·실행 (API 36) | ✅ | BUILD SUCCESSFUL + 디자인 시스템 라이트/다크 렌더 |
| 디자인 시스템 (Button 5종·Card 4종·다크모드·Pretendard) | ✅ | 라이트/다크 캡처 |
| Android 스크린샷 감지 `[Screenshot]` 로그 | ✅ | Metro 로그에 uri·displayName·createdAt 출력 확인 |
| iOS 네이티브 모듈 로드 + 사진 권한 문구 | ✅ | 첫 실행 권한 다이얼로그에 커스텀 문구 표시 |

### 로컬 실행 방법 (당신 터미널에서)
```bash
# 1) Metro 한 번만 띄우기
pnpm start            # 또는 npx expo start

# 2) iOS 시뮬레이터 (별도 터미널)
pnpm ios              # = expo run:ios  (첫 빌드 5~10분, 이후 Metro만)

# 3) Android 에뮬레이터 (에뮬레이터 먼저 부팅 후)
pnpm android          # = expo run:android
```
> 코드(특히 화면·디자인) 수정은 Metro가 Fast Refresh로 즉시 반영. 네이티브(modules/ Swift·Kotlin) 수정 시에만 `expo run:*` 재빌드 필요.

### iOS 스크린샷 감지 직접 확인 (시뮬레이터 한계)
- iOS 시뮬레이터는 Cmd+S 스크린샷이 게스트 사진 보관함에 들어가지 않아 자동 검증이 안 됩니다. **실기기**에서 사진 권한 허용 후 스크린샷을 찍으면 `[Screenshot]` 로그가 뜹니다. (Android는 에뮬레이터에서 검증 완료.)

---

## ✅ Supabase 연결·스키마 적용 완료 (2026-06-06)

- 프로젝트 `pyelhfiqafzexksrqkog` (Seoul, ap-northeast-2) 연결됨
- `.env`: `EXPO_PUBLIC_SUPABASE_URL`·`ANON_KEY` + `SUPABASE_DB_URL`(Session pooler, 자동 탐색 고정) 설정됨
- **마이그레이션 `0001_init.sql` 적용 완료** — `user_profiles`·`captures` 테이블 + RLS ON + 정책 2개
- 검증: anon REST 조회 `[]`(테이블 인식 + RLS 작동), 재실행 시 idempotent skip
- 이후 마이그레이션 추가 시: `supabase/migrations/`에 SQL 추가 후 `pnpm db:migrate`

> 메모: direct 연결(`db.<ref>.supabase.co`)은 이 환경(IPv4)에서 DNS 미해석 → **Session pooler URL**(`aws-1-ap-northeast-2.pooler.supabase.com:5432`, 유저명 `postgres.<ref>`)을 사용. `.env`에 이미 반영됨.

---

## 🔴 지금 필요한 일

### 1. (선택) 더미 INSERT로 RLS 직접 체감
RLS가 막고 있어 인증 없으면 INSERT가 거부됩니다(정상). 실제 데이터는 앱에서 로그인 후 생성됩니다. 대시보드에서 바로 테스트하려면 Authentication → Add user로 유저 1명 만들고 그 uid로 SQL Editor에서 INSERT.

### (참고) 초기 Supabase 셋업 — 이미 완료됨
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

### 기술 후속 과제 (코드 — Claude가 다음에 처리)
- **Android 런타임 권한 요청**: `READ_MEDIA_IMAGES`는 Android 13+에서 런타임 권한. 현재 모듈은 ContentObserver만 등록하고 권한을 요청하지 않아, 실기기 첫 실행 시 사용자가 허용하기 전엔 스크린샷 쿼리가 비어 있음(검증은 `adb`로 권한 부여 후 진행). 온보딩에 권한 요청 UX 추가 필요 (iOS는 모듈이 `PHPhotoLibrary.requestAuthorization`으로 자동 요청 중).
- iOS 다크모드 클린 스크린샷은 첫 실행 권한 모달에 가려 자동 캡처가 막힘(Android에서 다크모드 검증 완료). 실기기에서 권한 1회 허용 후 정상.

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
| `ios/` `android/` 커밋 | **gitignore (제외)** — `expo prebuild`로 재생성 | projectmd 문서는 커밋 권장이나 모던 CNG 관행 채택. `expo run`이 자동 prebuild. **되돌리려면 `.gitignore`에서 `/ios/` `/android/` 두 줄 제거.** 네이티브 소스는 `modules/`에 커밋됨 |

### 진행 중 고친 버그 (참고)
- iOS Swift: Expo `Module`이 `PHPhotoLibraryChangeObserver`(NSObject 기반)를 직접 conform 불가 → 별도 `NSObject` 옵저버로 분리 (W1 문서 코드의 컴파일 에러 수정).
- Android Kotlin: `MediaStore` 쿼리의 `"... DESC LIMIT 1"` 정렬 인자가 Android 11+에서 거부되어 스크린샷 시 앱 크래시 → API 30+ Bundle `QUERY_ARG_LIMIT`로 교체 + try-catch 방어.
- 디자인 Button: NativeWind 래핑 Pressable의 함수형 style에서 배경색 누락 → 정적 배열 style로 수정.

---

*최종 업데이트: 2026-06-06 (Week 1 부트스트랩)*
