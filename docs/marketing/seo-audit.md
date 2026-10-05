# memsum.app 검색·생성형 AI 검색 노출 감사 (2026-10-05)

기준 문서: Google Search Central "Optimizing your website for generative AI features on Google Search",
다국어 사이트 관리(hreflang), 소프트웨어 앱·FAQ 구조화 데이터 문서.
핵심 원칙: 생성형 AI 검색(AI 개요·AI 모드)도 기존 검색 색인 위에서 동작하므로, 별도의 "AI 전용 작업"보다
**크롤·색인·스니펫이 잘 되는 기본기**가 가장 큰 효과를 낸다.

대상: `memsum-web`(Next.js 15 App Router, 한국어 `/` + 영어 `/en`, Vercel)
감사 방법: 운영 사이트를 curl로 직접 요청(한국어·영어 언어 헤더, Googlebot 사용자 에이전트), 렌더된 HTML 분석,
소스 코드 확인, 수정 후 로컬 운영 빌드로 재검증.

---

## 1. 감사 결과 (수정 전 운영 사이트 기준)

### P0 — 즉시 수정 (이번에 수정함)

| # | 문제 | 위치 | 영향 |
|---|------|------|------|
| 1 | 언어 헤더가 없는 요청(Googlebot이 이렇게 크롤함)이 `/`에 오면 **307로 `/en`에 보내짐** | `src/middleware.ts` | Googlebot은 주로 미국 IP에서 `Accept-Language` 없이 크롤한다. 한국어 페이지 `/`가 검색엔진에는 "리다이렉트"로만 보여 **한국어 랜딩이 색인되지 않을 수 있음**. hreflang의 ko·x-default가 모두 리다이렉트 URL을 가리키는 오류도 함께 발생 |
| 2 | 한국어 랜딩 `/`에 **canonical(대표 URL) 없음** | `src/app/page.tsx` | 쿼리 문자열 붙은 URL 등과 대표 URL 혼동 가능 |
| 3 | 영어 랜딩 제목이 **"… \| Memsum"으로 브랜드명 중복** (`Memsum — Never miss … \| Memsum`) | `src/app/en/page.tsx` | 검색 결과 제목 품질 저하·잘림 |
| 4 | 정책 페이지 4개가 **랜딩 OG 문구를 그대로 상속** — `/en/terms`가 한국어 OG 제목·이미지로 공유됨 | `src/app/{,en/}{privacy,terms}/page.tsx` | 공유 미리보기 오류 |
| 5 | 기존 JSON-LD 사실 오류: `operatingSystem: "iOS, Android"`(iOS 미출시), Google 미지원 카테고리 `ProductivityApplication`, 다운로드 링크 없음 | `src/components/landing/LandingPage.tsx` | 잘못된 사실이 검색·AI 답변에 전달될 위험 |

### P1 — 1~2주 내

| # | 문제 | 위치 | 상태 |
|---|------|------|------|
| 6 | `og:url`, `og:locale`, OG 이미지 크기·대체 텍스트 없음 | 전 페이지 | **수정함** |
| 7 | 정책 페이지 한·영 hreflang 없음 | 정책 페이지 4개 | **수정함** |
| 8 | 사이트맵에 hreflang 대안 없음, `lastmod`가 전부 2026-06-12로 고정(랜딩은 10-04에 바뀜) | `src/app/sitemap.ts` | **수정함** |
| 9 | 영어 페이지인데 `<html lang="ko">` (본문 `<main lang="en">`만 영어) | `src/app/layout.tsx` | **제안**(아래 6-B-1). Google은 lang 속성을 언어 판정에 거의 쓰지 않지만 Bing·네이버·스크린리더에는 영향 |
| 10 | `www.memsum.app` → `memsum.app`이 **307(임시)** 리다이렉트 | Vercel 도메인 설정 | **사용자 할 일**(308 영구로 변경) |
| 11 | `/founder.png`가 404 — 서버 HTML에는 깨진 이미지가 들어가고 JS 실행 후에야 이니셜로 바뀜 | `public/`, `FounderAvatar.tsx` | **제안**(디자인 파일이라 손대지 않음) |
| 12 | 네이버 서치어드바이저 확인 메타 없음 | `src/app/layout.tsx` | 자리만 마련(토큰 넣으면 자동 출력). **사용자 할 일** |

### P2 — 장기

| # | 항목 | 상태 |
|---|------|------|
| 13 | Wanted Sans 웹폰트를 jsdelivr CSS로 불러와 렌더 차단(이미 `preconnect` + `font-display: swap` 92개 구간 확인) | 제안: `next/font/local`로 자체 호스팅해 외부 연결 1단계 제거 |
| 14 | `/favicon.ico` 404 | 영향 작음 — `app/icon.png`로 `<link rel="icon">`이 출력되어 Google 파비콘 요건은 충족 |

### 이상 없음 (확인만)

- 상태 코드: `/`, `/en`, 정책 4개, `robots.txt`, `sitemap.xml` 모두 200, 없는 경로 404, 404 페이지는 `noindex`.
- `http://` → `https://` 308 영구 리다이렉트.
- 제목 계층: 모든 페이지 `<h1>` 정확히 1개, 섹션마다 `<h2>`.
- 시맨틱 마크업: `<header>`/`<nav>`/`<main>`/`<section aria-labelledby>`/`<footer>`, 정책 페이지 `<article>`, FAQ는 `<details>/<summary>`(JS 없이 열림).
- 이미지 대체 텍스트: 의미 있는 화면 이미지는 모두 alt 있음. 연출용 중복 이미지는 `alt=""`(장식 처리, 올바름).
- LCP(가장 큰 화면 요소) 후보인 히어로 홈 화면 이미지: `fetchPriority="high"`, 지연 로딩 아님, `width/height` 지정(레이아웃 밀림 방지). 그 외 이미지는 `loading="lazy"`. 화면 이미지는 webp 약 40KB.
- **JS 없이도 핵심 사실이 텍스트로 크롤됨**: 제목·기능 설명·FAQ 질문/답·"Google Play"·"6가지 분류" 등 모두 서버 HTML에 있음. 등장 애니메이션은 JS가 붙이는 `.fx` 클래스 아래에서만 숨김이 걸려, JS가 없으면 최종 상태로 보임.
- Google Search Console 소유 확인 메타(`google-site-verification`) 존재.

---

## 2. 바꾼 것

| 파일 | 내용 | 이유 |
|------|------|------|
| `memsum-web/src/middleware.ts` | 검색·AI 크롤러 사용자 에이전트(Googlebot, Bingbot, 네이버 Yeti, Daumoa 등)와 **`Accept-Language`가 없는 요청은 리다이렉트하지 않고 `/`(한국어, x-default)를 그대로 제공** | P0-1. 실제 브라우저는 항상 언어 헤더를 보내므로 사용자 동작(한국어→`/`, 그 외→`/en`, 쿠키 우선)은 그대로. 크롤러가 받는 페이지는 한국 사용자가 보는 것과 동일해 위장(cloaking)이 아님 |
| `memsum-web/src/lib/seo.ts` (신규) | 페이지 메타 공통 도우미 `buildPageMetadata` — canonical(절대 URL), 한·영 hreflang + x-default, `og:url`/`og:locale`/`og:locale:alternate`, OG·트위터 이미지(1200×630, 대체 텍스트) | Next.js 메타데이터는 최상위 키 단위로 덮어써서, 페이지가 일부만 정의하면 hreflang·OG가 통째로 사라지는 문제가 있었음 |
| `memsum-web/src/app/page.tsx` | canonical `https://memsum.app` 추가, 메타 일체 명시, JSON-LD 렌더 | P0-2 |
| `memsum-web/src/app/en/page.tsx` | 제목 `absolute`로 브랜드 중복 제거, 메타 일체, JSON-LD 렌더 | P0-3 |
| `memsum-web/src/app/{privacy,terms}/page.tsx`, `memsum-web/src/app/en/{privacy,terms}/page.tsx` | 기존 제목·설명 문자열 그대로 두고 canonical + 한·영 hreflang + 문서 전용 OG(제목 "개인정보처리방침 \| Memsum" 등, 언어별 OG 이미지) | P0-4, P1-7 |
| `memsum-web/src/app/layout.tsx` | 레이아웃의 hreflang 제거(404 등에 잘못 상속되지 않게, 각 페이지가 선언), 기본 OG에 `locale`·이미지 크기, 네이버 확인 메타 자리(토큰 있을 때만 출력) | |
| `memsum-web/src/lib/site.ts` | `PLAY_DEVELOPER_URL`(Play 개발자 페이지), `NAVER_SITE_VERIFICATION`(빈 값) 상수 추가 | |
| `memsum-web/src/lib/structured-data.ts` (신규) | 랜딩 JSON-LD 생성기. 문구는 전부 `landing-copy.ts`에서 읽음(새 문장 없음) | 아래 §3 |
| `memsum-web/src/components/seo/JsonLd.tsx` (신규) | JSON-LD `<script>` 출력. `<`를 이스케이프해 문구에 `</script>`가 섞여도 안전 | |
| `memsum-web/src/components/landing/LandingPage.tsx` | **기존 JSON-LD 2개 블록만 삭제**(사실 오류 + 새 그래프와 중복 방지). 화면·디자인·모션 코드는 변경 없음 | 같은 페이지에 FAQPage가 두 번 있으면 Search Console이 중복 오류로 보고함 |
| `memsum-web/src/app/sitemap.ts` | 6개 URL 각각에 hreflang 대안(`xhtml:link`) 추가, `lastmod`를 실제 수정일로(랜딩 2026-10-04, 정책 2026-06-28) | P1-8. 빌드 시각을 쓰면 매 배포마다 바뀌어 신호가 흐려지므로 날짜 상수로 관리 — 랜딩·정책을 고치면 함께 갱신 |
| `memsum-web/src/app/robots.ts` | `Disallow: /api/` 추가(알림 신청 POST 엔드포인트뿐) | |

**건드리지 않은 것(제약 준수)**: `src/lib/landing-copy.ts`, `content/*.md`, `src/app/globals.css`, 그리고 `src/components/landing/*` 중 `LandingPage.tsx`의 JSON-LD 삭제 외 전부. `git diff`로 금지 파일 변경 0건 확인.

---

## 3. 구조화 데이터 (JSON-LD)

`/`(ko)와 `/en`(en) 각각에 `@graph` 하나로 5개 노드를 `@id`로 연결해 출력한다.

| 노드 | 주요 속성 | 출처 |
|------|----------|------|
| `WebSite` (`/#website`) | name "Memsum", url, inLanguage [ko, en], publisher → 개발자 | `site.ts` |
| `Person` (`/#founder`) | name "Byungin Song", url, sameAs = Google Play 개발자 페이지 | `site.ts`(OPERATOR_NAME). 법인이 없는 1인 개발이라 Organization 대신 실제 운영자 Person |
| `MobileApplication` (`/#app`) | name, description(`meta.appJsonLdDescription`), operatingSystem **ANDROID**, applicationCategory **UtilitiesApplication**, offers(price "0", ko=KRW / en=USD, InStock, Play URL), **downloadUrl·installUrl = Google Play**, sameAs = Play URL, image(`/icon.png`), screenshot 4장, author·publisher → 개발자 | Play 등록 정보(운영체제 ANDROID, 무료)와 일치 확인 |
| `WebPage` | name·description = 랜딩 메타 원문, isPartOf WebSite, about 앱 | `landing-copy.ts` meta |
| `FAQPage` | 화면 FAQ 5문항의 질문·답 원문 그대로(버튼 문구 `ctaLabel`은 답이 아니라 제외) | `landing-copy.ts` faq |

**넣지 않은 것**: `aggregateRating`·`review`(실제 데이터 없음). 후기 섹션은 "경험 예시" 라벨이 붙은 예시라 Review로 표시하면 정책 위반이므로 절대 넣지 않음. 사이트 검색 상자(`SearchAction`)는 사이트 내 검색 기능이 없어 넣지 않음.

**Google 리치 결과(검색 결과 강조 표시) 자격 — 솔직한 판단**
- 소프트웨어 앱: Google은 `name`, `offers.price`와 함께 **`aggregateRating` 또는 `review`를 필수**로 요구한다. 평점이 없으므로 지금은 **리치 결과 대상이 아니다**. 그래도 검색엔진·AI가 "무료 Android 앱, Play 링크, 개발자"를 정확히 이해하는 데 쓰인다.
- applicationCategory: Google 지원 목록에 `ProductivityApplication`이 없어 `UtilitiesApplication` 사용(Play 카테고리는 '생산성').
- FAQ: 2023년 8월부터 Google은 FAQ 리치 결과를 공신력 있는 정부·보건 사이트에만 보여준다. memsum.app은 리치 결과로는 표시되지 않지만, 질문·답이 화면 텍스트와 1:1로 일치하므로 이해 신호로는 유효하고 해가 없다.

---

## 4. 검증 결과

- `pnpm build`: 성공(정적 페이지 13개, 미들웨어 포함). `tsc --noEmit` 통과.
- 로컬 운영 서버(`pnpm start`)에서 자동 검증 스크립트 실행 — **전 항목 통과**
  - 6개 페이지: canonical 1개·자기 URL 일치, hreflang 3개(ko/en/x-default), `og:url` 일치, `og:locale` ko_KR/en_US, OG 이미지 1200×630, `<h1>` 1개, 제목 브랜드 중복 없음
  - 랜딩 2개: JSON-LD 블록 1개, JSON 파싱 성공, `@id` 참조 끊김 없음, MobileApplication 필수 필드(name·offers.price=0·operatingSystem=ANDROID·downloadUrl·installUrl), 평점·리뷰 없음, FAQ 질문·답이 화면 텍스트에 그대로 존재
  - 정책 페이지: JSON-LD 없음(의도)
  - 404 페이지: `noindex`, canonical·hreflang 없음
- schema.org 공식 검사기(validator.schema.org)에 ko·en JSON-LD 제출: **오류 0, 경고 0**
- 미들웨어 동작

  | 요청 | 결과 |
  |------|------|
  | Googlebot, 언어 헤더 없음 | 200 (`/` 한국어) — 수정 전 운영: 307 → `/en` |
  | 언어 헤더 없는 일반 요청 | 200 |
  | 브라우저 `en-US` | 307 → `/en` (기존과 동일) |
  | 브라우저 `ko-KR` | 200 (기존과 동일) |
  | 브라우저 `en` + 쿠키 `NEXT_LOCALE=ko` | 200 (기존과 동일) |
  | 네이버 Yeti | 200 |

- 사이트맵: URL 6개, 각 항목에 hreflang 3개.
- robots.txt: `Allow: /`, `Disallow: /api/`, Sitemap 명시.

배포 후 확인 권장 URL
- Rich Results Test: https://search.google.com/test/rich-results?url=https://memsum.app/ , `/en`
- Schema Markup Validator: https://validator.schema.org/#url=https%3A%2F%2Fmemsum.app%2F
- PageSpeed Insights: https://pagespeed.web.dev/analysis?url=https://memsum.app/

---

## 5. 생성형 AI 검색(AI 개요) 관점

- **핵심 사실의 텍스트 크롤 가능성: 양호.** 무엇을 하는 앱인지(스크린샷 글자 인식→제목·요약·6가지 분류→캘린더→일요일 5줄), 가격(지금은 무료), 지원 기기(Android 출시, iOS 준비 중), 개인정보 관련 답(학습에 안 씀, 캘린더는 이벤트 추가만)이 모두 서버 HTML 텍스트와 FAQ에 있다. 이번 JSON-LD로 같은 사실이 기계가 읽는 형태로도 일치한다.
- **가장 큰 개선은 P0-1(리다이렉트) 수정**이다. AI 개요는 색인된 페이지에서 근거를 가져오므로, 한국어 페이지가 색인되지 않으면 한국어 질의에서 인용될 수 없다.
- **llms.txt: 만들지 않음.** Google은 AI 기능을 위해 llms.txt 같은 별도 파일이 필요 없다고 명시한다. 같은 사실이 이미 HTML·JSON-LD·사이트맵에 있어 추가 이득이 없고, 관리할 사본만 늘어 사실 불일치 위험이 생긴다.
- **의도적으로 하지 않은 것** (Google 가이드상 불필요하거나 해로움)
  - llms.txt 등 AI 전용 파일
  - AI를 위한 콘텐츠 잘게 쪼개기(chunking)
  - AI용 키워드 재작성, 롱테일 변형 페이지 양산(대량 생성 콘텐츠 정책 위반 위험)
  - 인위적인 언급(mentions) 확보
  - 화면에 없는 사실을 구조화 데이터에만 넣기(평점 등)

---

## 6. 제안 (문구 파일 수정 필요 → 직접 수정하지 않음)

`landing-copy.ts`·`content/*.md`는 이번 작업에서 수정 금지라 아래는 **제안만** 한다. 반영 여부는 카피 담당이 결정.

1. **한국어 제목(`KO.meta.titleDefault`)이 길다** — 현재 약 45자로 검색 결과에서 잘릴 가능성이 높다. 검색어가 될 "스크린샷"과 브랜드 "멤섬"을 앞쪽에 두고 30자 안팎으로 줄이는 안 권장. 예: `Memsum 멤섬 — 스크린샷 속 약속, 안 까먹게`.
2. **설명(`meta.description`, ko·en)에 "Android"·"Google Play"가 없다** — "어디서 받나요?"류 질의 대응을 위해 한 구절 추가 권장. 예(ko): `… 광고 없음. Android 무료.`
3. **"가입 없이 바로 시작"(ko 설명) 사실 확인** — 구글 캘린더 연결에 구글 로그인이 필요하다면 오해 소지가 있다. 앱 실제 흐름과 일치하는지 확인 권장(YMYL은 아니지만 신뢰 신호).
4. **개발자 표기 통일** — 사이트는 "Byungin Song", Google Play 개발자명은 "Song Byungin". 검색엔진이 같은 인물로 묶도록 한쪽으로 통일하거나, 구조화 데이터에 `alternateName`으로 Play 표기를 추가하는 안(코드 1줄, 원하면 바로 반영 가능).
5. **한국어 브랜드 대체명** — 한국어 사용자가 "멤섬"으로 검색할 수 있다. 문구 파일에 브랜드 한글 표기 상수를 두면 `WebSite.alternateName`에 연결해 Google 사이트 이름 표시를 돕는다.
6. **FAQ 보강 후보**(실제 사실일 때만): "어떤 정보가 서버로 전송되나요?", "스크린샷 원본은 어디에 저장되나요?", "지원 언어는?" — AI 개요가 자주 다루는 개인정보 질문에 1차 출처 답을 제공.
7. **`landing-copy.ts`의 `shots`·`appScreens.src`가 존재하지 않는 옛 이미지 경로**(`/shots/*.png`, `/store/*.png`)를 가리킴 — 현재 화면은 `screens.ts`를 써서 영향 없지만, 정리 대상.

### 6-B. 코드 제안 (디자인 파일·구조 변경이라 이번에 하지 않음)

1. **영어 페이지 `<html lang="en">`**: 지금은 루트 레이아웃 하나라 전 페이지가 `lang="ko"`. 해결책은 루트 레이아웃 분리(`app/(ko)/layout.tsx` + `app/en/layout.tsx`, 각자 `<html lang>`)인데, 다중 루트 레이아웃은 404 처리 방식이 바뀌어 별도 작업·검증이 필요하다.
2. **창작자 사진**: `public/founder.png`를 실제 사진으로 추가하거나, `FounderAvatar.tsx`가 사진 없을 때 서버에서부터 이니셜을 렌더하도록 변경(지금은 서버 HTML에 404 이미지가 들어감).
3. **폰트 자체 호스팅**: Wanted Sans를 `next/font/local`로 옮겨 외부 CDN 연결·렌더 차단 CSS 제거(LCP 개선).
4. Play에 실제 평점이 쌓이면, 그 평점을 **페이지에 보이게 표시한 뒤** `aggregateRating`을 추가하면 앱 리치 결과 자격이 생긴다.

---

## 7. 사용자가 할 일

1. **배포 후 Google Search Console**(https://search.google.com/search-console)
   - `memsum.app` 속성 소유 확인 상태 확인(메타 태그는 이미 있음 — 확인 완료 여부는 콘솔에서만 볼 수 있음). 가능하면 DNS 방식의 "도메인" 속성도 추가.
   - Sitemaps 메뉴에서 `https://memsum.app/sitemap.xml` 제출(이미 제출했으면 다시 제출해 새 `lastmod`·hreflang 반영).
   - URL 검사에서 `https://memsum.app/` 입력 → "실제 URL 테스트"로 **200과 한국어 페이지가 보이는지 확인** 후 "색인 생성 요청". `/en`도 동일.
   - 1~2주 뒤 "페이지" 보고서에서 `/`가 "리디렉션이 포함된 페이지"에서 "색인 생성됨"으로 바뀌는지 확인.
2. **네이버 서치어드바이저**(https://searchadvisor.naver.com)
   - 사이트 등록 → 소유확인 "HTML 태그" 선택 → `content="..."` 값을 받아 `memsum-web/src/lib/site.ts`의 `NAVER_SITE_VERIFICATION`에 넣고 배포(또는 값을 Claude에게 전달) → 소유확인 완료.
   - 요청 → 사이트맵 제출 `https://memsum.app/sitemap.xml`, robots.txt 수집 요청, 웹페이지 수집 요청(`/`, `/privacy`, `/terms`).
3. **Bing 웹마스터 도구**(https://www.bing.com/webmasters) — "Google Search Console에서 가져오기"로 1분 등록. Bing 색인은 ChatGPT 검색·Copilot 답변 출처로도 쓰인다.
4. **Vercel 도메인 설정** — `www.memsum.app` 리다이렉트를 307(임시)에서 **308(영구)**로 변경(Project → Settings → Domains → www 항목 Edit).
5. (선택) 다음 검색등록(https://register.search.daum.net) 사이트 등록.
