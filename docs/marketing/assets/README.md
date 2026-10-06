# Memsum 홍보 시각 자산

브랜드 기준: `docs/design/redesign-2026-10.md` "형광펜 & 코발트" (종이 `#F2F3F0` · 잉크 `#0D0E12` · 코발트 `#1530FF` · 형광 `#E8FF3A`는 바탕 전용, 그 위 글씨는 잉크).
서체: Wanted Sans(Regular/SemiBold/Bold/Black) + JetBrains Mono Medium(머리표, 라틴·숫자만).

모든 PNG는 알파 없는 RGB(`sips -g hasAlpha` → `no`).

## 파일 목록

| 파일 | 규격 | 용도 |
|---|---|---|
| `feed-01.png` ~ `feed-05.png` | 1080×1080 | 인스타 피드 캐러셀(한국어). ① 쌓인 스크린샷 ② 스캔·형광펜 ③ 캘린더 등록 ④ 일요일 5줄 리포트 ⑤ Google Play에서 받기 |
| `feed-01.en.png` ~ `feed-05.en.png` | 1080×1080 | 위 캐러셀 영어판 |
| `story-01.png` ~ `story-03.png` | 1080×1920 | 스토리·릴스 커버(한국어). ① 태그라인 + 스캔 ② 이렇게 간단해요(3단계) ③ 5줄 리포트 화면 + 받기 |
| `story-01.en.png` ~ `story-03.en.png` | 1080×1920 | 위 스토리 영어판 |
| `ph-gallery-01.png` ~ `ph-gallery-04.png` | 1270×760 | Product Hunt 갤러리(영어). ① 태그라인 + 스캔 ② 글자 읽기(앱 화면 2장) ③ 캘린더 ④ 5줄 리포트 + 출시 상태 |
| `profile-avatar.png` | 1080×1080 | 프로필 사진(인스타·X 등). 원형으로 잘려도 마크가 다 들어가게 앱 아이콘 마크를 88%로 |
| `x-header.png` / `x-header.en.png` | 1500×500 | X(트위터) 헤더. 왼쪽 아래(프로필 사진 자리)는 비움 |
| `reel-30s.mp4` | 1080×1920, 25.5초, 30fps | 릴스·쇼츠·틱톡(한국어). H.264 High 4.1, yuv420p, BT.709, faststart, 빈 AAC 오디오 트랙(무음) |
| `reel-30s.en.mp4` | 같음 | 영어판 |

스토리·릴스는 위 약 250px·아래 약 340px을 앱 UI(계정명·자막·버튼)가 덮으므로 핵심 글자를 그 사이에 두었다.

### 릴스 구성 (25.5초)
| 시각 | 장면 |
|---|---|
| 0.0 | 첫 프레임부터 헤드라인 "사진첩 ‘스크린샷’ 폴더, 몇 장이세요?" + 스크린샷이 쌓인다 |
| 3.0 | 새 스크린샷(청첩장) 한 장이 더미 위로 떨어짐 |
| 4.3 | 코발트 바탕으로 넘어가며 그 장이 들려 올라옴 → 6.0~7.7 코발트 스캔선이 훑고 줄마다 형광펜 |
| 10.2 | 날짜 줄이 떨어져 나와 캘린더 행으로 → 13.5 [캘린더에 등록] 누름 → 등록됨 |
| 15.8 | 잉크 바탕, `SUN 19:00`, 5줄 리포트 순위 1~5가 차례로 떨어짐(1위만 형광펜) |
| 21.0 | 코발트 바탕, 아이콘 마크 조립 → "까먹어도 괜찮아요. Memsum이 대신 기억해요." → Google Play에서 받기 · iOS는 준비 중 |

## 문구 원칙
이미지·영상 속 문구는 모두 확정 문구에서 그대로 가져왔다(출처는 `scripts/marketing/lib/copy.mjs` 주석).
랜딩 카피(`memsum-web/src/lib/landing-copy.ts`), 스토어 스크린샷 캡션(`scripts/gen-store-screenshots.mjs`), 피처 그래픽 문구, 스토어 등록정보(`docs/store/listings/`), 앱 예시 데이터(`src/dev/preview.web.ts`)가 출처다.
새 주장·수치·후기는 넣지 않았다. 출시 상태는 "Android는 지금 Google Play에서 받을 수 있어요. iOS는 준비 중이에요."로만 표기했다.
택배 조회 기능은 서비스에서 빠졌으므로 택배·운송장 장면과 문구는 쓰지 않는다(홈 화면 원본 `02-home`은 택배 행이 보여 쓰지 않는다).
Google Play 공식 배지와 로고는 쓰지 않았다. 버튼 모양은 브랜드 알약이다. 공식 배지가 필요하면 Google 배지 생성기의 원본을 그대로 쓴다.

## 재생성

```bash
# 1) 홍보 자산 전용 의존성 설치(앱 package.json 과 별개, node_modules 는 .gitignore)
npm --prefix scripts/marketing i
npx --prefix scripts/marketing playwright install chromium   # 처음 한 번

# 2) 정지 이미지 전부(약 30초)
node scripts/marketing/gen-stills.mjs
node scripts/marketing/gen-stills.mjs --only feed,story,ph,avatar,x   # 일부만

# 3) 릴스(한·영 각 25초 내외 소요)
node scripts/marketing/gen-reel.mjs              # ko + en
node scripts/marketing/gen-reel.mjs --lang ko
# 영상 대신 특정 시각 프레임만 PNG 로 확인
REEL_FRAMES_DIR=/tmp/frames node scripts/marketing/gen-reel.mjs --lang ko --frames 0,7,14.6,19.5,25
```

의존성을 다른 곳에 설치했다면 `MARKETING_DEPS_DIR=<node_modules 가 있는 폴더>`로 지정한다.

### 스크립트 구성
- `scripts/marketing/lib/kit.mjs`: 색, 서체, 미니 스크린샷, 크롭 모서리, 형광펜, 아이콘 마크, Playwright·ffmpeg 연결, 알파 제거
- `scripts/marketing/lib/copy.mjs`: 문구(출처 표기)
- `scripts/marketing/parts.mjs`: 장면 조각(잘린 스크린샷 카드, 캘린더 행, 5줄 리포트, 받기 버튼, 앱 화면)
- `scripts/marketing/gen-stills.mjs`: 피드, 스토리, PH 갤러리, 프로필, X 헤더
- `scripts/marketing/gen-reel.mjs`: 릴스. `window.frame(t)`로 시각별 상태를 직접 계산하고, 30fps JPEG를 ffmpeg로 인코딩한다
