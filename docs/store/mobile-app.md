# Memsum Android — 로컬 빌드·서명·Play 제출 절차

> EAS(엑스포 클라우드 빌드) 대신 **이 맥에서 직접** 서명된 AAB를 만들고 Play Developer API로 올린다.
> Ben의 다른 앱(maldongmu, yegyeon, photoplay)과 같은 방식이다. Ben이 할 일은 `docs/USER_ACTIONS.md` 맨 위.

## 0. 고정 값

| 항목 | 값 |
|---|---|
| 패키지 | `app.memsum` (첫 AAB 업로드 순간 영구 고정) |
| JDK | `~/android-tools/jdk-17.0.20+8/Contents/Home` |
| Android SDK | `~/android-tools/android_sdk` (build-tools 36.0.0) |
| 업로드 키스토어 | `~/android-tools/memsum-upload.keystore` (alias `memsum`, RSA 2048, 유효 10000일) |
| 키 비밀번호 파일 | `~/android-tools/memsum-keystore-password.txt` (권한 600, 스토어·키 비밀번호 동일) |
| 서명 프로퍼티 이름 | `MEMSUM_STORE_FILE`, `MEMSUM_STORE_PASSWORD`, `MEMSUM_KEY_ALIAS`, `MEMSUM_KEY_PASSWORD` |
| 서명 주입 플러그인 | 저장소 루트 `withReleaseSigning.js` (`app.json` plugins 마지막) — prebuild 때마다 서명 설정과 R8 축소를 다시 넣는다 |
| Play API 키 | `~/android-tools/play-service-account.json` (서비스 계정 `play-publisher@maldongmu.iam.gserviceaccount.com`) |
| 파이썬 환경 | `~/android-tools/play-venv` |
| 제출 스크립트 | `scripts/store/play_publish.py` (스토어 폴더 기본값 `docs/store`) |
| 산출물 위치 | `~/android-tools/memsum-v<버전>.aab`, `-test.apk`, `-mapping.txt` (저장소 밖, 커밋 금지) |

### 업로드 키 지문 (2026-10-04 생성)
```
SHA-1:   75:20:50:2B:A6:81:24:A8:ED:91:0C:C3:48:7D:8D:1F:82:50:D3:DD
SHA-256: 1F:07:68:98:8E:96:04:5B:DF:7E:00:28:DA:FD:AB:42:8F:C3:7E:F7:80:5B:C1:E7:8E:14:AF:2B:AE:EF:10:91
```
Play 앱 서명을 쓰므로 **사용자 폰에 설치되는 앱은 Google의 앱 서명 키로 다시 서명된다.** 그 키의 지문은 첫 업로드 후
콘솔 → 테스트 및 출시 → 설정 → 앱 무결성 → 앱 서명에서 확인한다(§6).

키스토어와 비밀번호 파일은 백업하고, 이미 있는 키스토어는 절대 다시 만들지 않는다.

> ⚠️ **(2026-10-04 병합 시 확인) 이 앱은 이미 다른 맥에서 EAS로 Play에 올라가 있다(versionCode 3·7·8).**
> 그때 쓴 업로드 키는 EAS가 관리하는 키스토어라 위의 로컬 키(`1F:07:68…`)와 **다를 가능성이 높다.**
> 다르면 로컬 서명 AAB는 콘솔이 "잘못된 키로 서명됨"으로 거부한다. 첫 로컬 제출 전에:
> 1. 콘솔 → 앱 무결성 → 앱 서명 → "업로드 키 인증서" SHA-256을 위 값과 비교한다.
> 2. 같으면 그대로 진행. 다르면 ⓐ `eas credentials`로 EAS 키스토어를 내려받아 로컬 서명에 쓰거나,
>    ⓑ 콘솔에서 "업로드 키 재설정"을 요청해 로컬 키(`memsum-upload.keystore`의 인증서 PEM)로 바꾼다(승인까지 며칠).

## 1. 빌드 전 준비
- **`.env` 필수.** `EXPO_PUBLIC_*` 값은 빌드 시점에 JS 번들에 박힌다. `.env` 없이 빌드하면 Supabase·구글 캘린더가 꺼진 앱이 나온다
  (2026-10-04 현재 이 맥에 `.env` 없음 → 툴체인 점검 빌드만 함). 항목은 `.env.example` 참고.
- `EXPO_PUBLIC_POSTHOG_KEY` 유무에 따라 데이터 보안 답이 달라진다(`console-answers.md` §2-4).
- `pnpm install` 완료 상태.

## 2. 빌드 명령
```bash
export JAVA_HOME=~/android-tools/jdk-17.0.20+8/Contents/Home ANDROID_HOME=~/android-tools/android_sdk
export PATH="$JAVA_HOME/bin:$PATH"
cd ~/Documents/projects/memsum
pnpm exec expo prebuild --platform android --clean --no-install
grep -c MEMSUM_STORE_FILE android/app/build.gradle      # 0이면 서명 치환 실패 → withReleaseSigning.js의 치환 문자열 확인
PW="$(cat ~/android-tools/memsum-keystore-password.txt)"
cd android && echo "sdk.dir=$ANDROID_HOME" > local.properties
./gradlew bundleRelease assembleRelease --no-daemon \
  -PMEMSUM_STORE_FILE="$HOME/android-tools/memsum-upload.keystore" -PMEMSUM_STORE_PASSWORD="$PW" \
  -PMEMSUM_KEY_ALIAS=memsum -PMEMSUM_KEY_PASSWORD="$PW"
V=1.0.0
cp app/build/outputs/bundle/release/app-release.aab ~/android-tools/memsum-v$V.aab
cp app/build/outputs/apk/release/app-release.apk   ~/android-tools/memsum-v$V-test.apk
cp app/build/outputs/mapping/release/mapping.txt   ~/android-tools/memsum-v$V-mapping.txt
```
- 첫 빌드는 10분 이상 걸린다. 에이전트는 백그라운드로 돌린다.
- 네이티브 코드(`modules/**`)나 `app.json`이 바뀌면 반드시 `prebuild --clean`부터 다시 한다.
- `android/`는 `.gitignore` 대상(`/android/`)이라 커밋되지 않는다. 서명 설정은 플러그인이 매번 다시 넣는다.
- 비밀번호가 든 명령을 로그 파일·문서에 남기지 않는다.

## 3. 검증 4가지 (모두 통과해야 업로드)
```bash
AAB=~/android-tools/memsum-v$V.aab; APK=~/android-tools/memsum-v$V-test.apk
# ① 서명 지문 = 위 업로드 키 SHA-256 (다르면 -P가 안 먹어 debug 키로 서명된 것 → 콘솔이 거부)
keytool -printcert -jarfile $AAB | grep SHA256
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs $APK | grep SHA-256   # APK는 v2 서명이라 keytool로 안 보임
# ② 패키지·버전·targetSdk·권한
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging $APK | grep -E "^package|targetSdkVersion|uses-permission"
# ③ .env 값이 번들에 들어갔는지(값을 출력하지 말고 개수만). "supabase.co" 단순 검색은 라이브러리 코드에도 있어 쓸모없다
unzip -p $APK assets/index.android.bundle | grep -aoE "https://[a-z0-9]{20}\.supabase\.co" | sort -u | wc -l                    # 1이어야 함
unzip -p $APK assets/index.android.bundle | grep -aoE "[0-9]{12}-[a-z0-9]{32}\.apps\.googleusercontent\.com" | sort -u | wc -l  # 2 이상(iOS·Android)
# ④ 금지 권한이 없는지
$ANDROID_HOME/build-tools/36.0.0/aapt dump badging $APK | grep -E "CAMERA|RECORD_AUDIO|READ_MEDIA_VIDEO|SYSTEM_ALERT_WINDOW|WRITE_EXTERNAL_STORAGE|AD_ID"   # 비어 있어야 함
```
②에서 기대하는 권한(2026-10-04 툴체인 점검 빌드 기준 — §7 참고)에서 늘어난 것이 있으면 이유를 확인하고 `console-answers.md`를 고친다.

## 4. 제출
첫 AAB는 API로 못 올린다 → Ben이 콘솔 내부 테스트 트랙에 수동 업로드(`USER_ACTIONS.md`). 서비스 계정에 앱 권한이 붙은 뒤부터:
```bash
cd ~/Documents/projects/memsum
PY=~/android-tools/play-venv/bin/python
# 먼저 검증만(편집 폐기). --track 기본값은 internal
$PY scripts/store/play_publish.py --package app.memsum --aab ~/android-tools/memsum-v$V.aab \
  --mapping ~/android-tools/memsum-v$V-mapping.txt --release-name $V
# 통과하면 같은 명령에 --commit
# 프로덕션은 반드시 명시 + 단계적 배포 권장(예: 10%. 지정 시 status=inProgress, 빼면 전체 배포 completed)
$PY scripts/store/play_publish.py --package app.memsum --aab ~/android-tools/memsum-v$V.aab \
  --mapping ~/android-tools/memsum-v$V-mapping.txt --release-name $V --track production --user-fraction 0.1 --commit
# 등록정보·이미지만: --aab 없이 실행
# 기본 언어 지정: --default-language ko-KR
```
- 같은 versionCode는 다시 못 올린다. 이미 올라간 버전이면 `--aab` 없이 등록정보만 보낸다.
- 이미지가 준비되기 전에는 `--skip-images`(이미지 폴더가 비어 있으면 어차피 건너뛴다).
- 권한 점검(읽기 전용): edit를 만들어 details·tracks·listings를 읽고 삭제. 403이면 서비스 계정 앱 권한이 아직 없다.

## 5. 버전업 순서
1. `app.json`의 `expo.version`(예 1.0.1)과 `expo.android.versionCode`(+1)를 올린다. (`eas.json`의 `appVersionSource: local` — 로컬 값이 기준)
2. `docs/store/listings/<lang>/notes.txt`에 출시 노트(500자 이하, `wc -m`).
3. §2 빌드 → §3 검증 → §4 제출(`--release-name <새 버전>`).
4. 아래 버전 표에 한 줄 추가.

| 버전 | versionCode | 날짜 | 트랙 | 비고 |
|---|---|---|---|---|
| 1.0.0 | 3·7·8 | 2026-06~07 | production | 다른 맥에서 EAS 빌드·제출(원격 main 기록) |
| (다음) | 9 | (예정) | internal → production | 리디자인 + 원격 기능 병합본. 로컬 서명 — 위 ⚠️ 업로드 키 확인 먼저 |

## 6. 구글 캘린더 로그인과 SHA-1 (중요)
- Android OAuth 클라이언트는 **패키지 이름 + 서명 인증서 SHA-1** 짝으로 앱을 알아본다. 지금 Google Cloud의 Android 클라이언트
  (`649138266676-j8bl…`)는 **debug 키 SHA-1**(`5E:8F:16:06:…:F6:25`)로 만들어져 있다.
- Play에서 설치한 앱은 **Play 앱 서명 키**로 서명되므로 SHA-1이 다르다 → 그대로면 Play 설치본에서 캘린더 연결이 실패할 수 있다.
  (이 앱은 PKCE + 리디렉트 스킴 방식이라 SHA-1을 실제로 검사하지 않을 가능성도 있다. 그래서 먼저 확인한다)
- 순서:
  1. 내부 테스트 트랙으로 설치 → 설정에서 구글 캘린더 연결 시도.
  2. 되면 아무것도 안 한다. 실패하면(Error 400/“앱이 등록되지 않음” 류) Ben에게 콘솔 → 앱 무결성 → 앱 서명 키 SHA-1을 받는다.
  3. Google Cloud → 사용자 인증 정보 → **새 Android 클라이언트**(패키지 `app.memsum` + 앱 서명 키 SHA-1). 한 클라이언트에 SHA-1을
     여러 개 넣을 수 없으므로 새로 만든다. 업로드 키 SHA-1(`75:20:50:…:D3:DD`)은 로컬 서명 test APK용이 필요할 때만 별도 클라이언트로.
  4. 새 클라이언트 ID를 `.env`의 `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`로 바꾸고, 그 reversed 스킴
     (`com.googleusercontent.apps.<번호>`)을 `app.json`의 `scheme` 배열에 추가 → 재빌드(versionCode +1).
- OAuth 동의 화면 브랜드 검증(미확인 앱 경고)은 별개 문제다(`USER_ACTIONS.md` 옛 절 참고).

## 7. 툴체인 점검 빌드 기록 (2026-10-04, `.env` 없이)
산출물: `~/android-tools/memsum-v1.0.0-toolcheck.aab` — **제출본 아님**(서버 키가 빠진 번들).

| 확인 | 결과 |
|---|---|
| prebuild 서명 치환 | `build.gradle`에 `MEMSUM_STORE_FILE` 들어감, `gradle.properties`에 R8·리소스 축소 true |
| 빌드 | `bundleRelease assembleRelease` 성공 (11분 46초, JS 번들 포함) |
| 크기 | AAB 95MB, 범용 APK 149MB (모든 CPU 종류 + ML Kit 한국어 인식 모델 내장. Play는 기기별로 쪼개 내려주므로 실제 설치 크기는 훨씬 작다) |
| 서명 | AAB·APK 모두 업로드 키 SHA-256 `1F:07:68:…:10:91` 일치 |
| 버전 | `app.memsum` versionCode 1 / versionName 1.0.0 / minSdk 24 / targetSdk 36 |
| `.env` 값 | Supabase 주소 0개, 구글 클라이언트 ID 0개 → 예상대로 빠짐(그래서 제출 불가) |
| mapping | `~/android-tools/memsum-v1.0.0-toolcheck-mapping.txt` |

최종 권한 목록(aapt):
```
INTERNET, ACCESS_NETWORK_STATE, READ_MEDIA_IMAGES, READ_EXTERNAL_STORAGE(maxSdk 32), POST_NOTIFICATIONS,
VIBRATE, WAKE_LOCK, RECEIVE_BOOT_COMPLETED, USE_BIOMETRIC, USE_FINGERPRINT,
com.google.android.c2dm.permission.RECEIVE, com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE,
app.memsum.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION, 런처 배지 권한들(삼성·화웨이·오포·HTC·소니 등, expo-notifications 의존성)
```
- 없음 확인: CAMERA, RECORD_AUDIO, READ_MEDIA_VIDEO, SYSTEM_ALERT_WINDOW, WRITE_EXTERNAL_STORAGE, AD_ID,
  SCHEDULE_EXACT_ALARM/USE_EXACT_ALARM, FOREGROUND_SERVICE_* → 정확한 알람·포그라운드 서비스 선언 불필요.
- USE_BIOMETRIC/USE_FINGERPRINT는 expo-secure-store 기본값(생체 인증 옵션용). 앱이 생체 인증을 쓰지 않으면
  `blockedPermissions`에 넣어도 되지만, secure-store 동작 확인 후에 결정한다(현재는 그대로 둠).
