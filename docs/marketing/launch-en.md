# English launch kit — Memsum

> 작성 기준: `docs/store/listings/en-US/*.txt`, `memsum-web/src/lib/landing-copy.ts`(EN), `docs/store/console-answers.md`, `supabase/migrations/0002_storage.sql`(비공개 버킷·사용자별 폴더 정책), `modules/vision-ocr/android/.../VisionOcrModule.kt`(ML Kit).
> 공통 금지: 다운로드 수·평점·사용자 수, 랜딩의 "Experience example" 후기 인용, 가격·유료 플랜, "best/#1", iOS 사용 가능 표현, 추천(업보트) 요청.
> 링크는 `{링크:채널키}` 자리에 `tracking-links.md`의 주소를 넣어요.

## 0. 채널 적합도 요약

| 채널 | 판단 | 핵심 이유 | 규칙 확인 |
|---|---|---|---|
| Product Hunt | 추천(2주 차 화~목) | 1인 메이커 런치 문화. 다만 사용자 다수가 iOS라 Android 전용인 점을 처음부터 밝혀야 해요 | 설명 260자 확인함. 태그라인 60자는 요청 기준(공식 도움말엔 숫자 명시 없음), 토픽 개수 확인 필요 |
| Reddit r/androidapps | 추천(조건부) | Android 앱 찾는 사람이 모인 곳 | 확인 필요(reddit.com 접근 차단으로 규칙 페이지를 직접 못 읽음) |
| Reddit r/productivity | 신중 | 자기 홍보에 엄격한 편으로 알려져 있어요. 토론 글 + 개발자 고지 형태만 | 확인 필요 |
| Hacker News (Show HN) | 조건부 적합 | 직접 만든·가입 없이 써 볼 수 있는 제품이라 규칙엔 맞아요. 다만 Android 전용·비공개 소스·서버 LLM 처리라 개인정보 질문이 많이 올 거예요 | 확인함(news.ycombinator.com/showhn.html) |
| X / Threads 영문 스레드 | 추천 | 런치 당일 다른 채널 글로 연결하는 허브 | 해당 없음 |

---

## 1. Product Hunt

**확인한 규칙:** 제품 이름 칸엔 이름만(설명·이모지 금지), 설명은 260자 이내, 갤러리 권장 1270x760·최소 2장, 첫 댓글로 대화를 여는 걸 권장. 업보트를 직접 부탁하면 안 되고 "방문해서 댓글을 남겨 달라"로만 요청해요.

| 필드 | 글자 수 / 제한 | 내용 |
|---|---|---|
| Name | 6 | `Memsum` |
| Tagline (A, 추천) | 56 / 60 | `Turn screenshots into calendar events and a Sunday recap` |
| Tagline (B) | 52 / 60 | `Screenshots that remind you before you miss the plan` |
| Tagline (C) | 57 / 60 | `Remembers what's in your screenshots so you don't miss it` |
| Description | 256 / 260 | 아래 |

**Description (256자)**

```
You screenshot an invite, a receipt, a coupon, then never open them again. Memsum (Android) spots new screenshots, reads the text, titles and sorts them, adds dates to Google Calendar in one tap, and sends 5 worth revisiting every Sunday. No sign-up, no ads.
```

- **Links:** Website `{링크:producthunt_web}` / Google Play `{링크:producthunt}`
- **Platform:** Android만 체크. iOS 체크 금지.
- **Pricing:** Free
- **Topics(우선순위 순, 허용 개수만큼):** Productivity → Android → Calendar → Artificial Intelligence
- **Gallery:**

| 순서 | 파일 | 담을 장면(요청 사양) |
|---|---|---|
| 1 | `docs/marketing/assets/ph-gallery-01.png` | 대표: "Never miss what's in your screenshots" + 영문 홈 화면(upcoming plans by D-day) |
| 2 | `docs/marketing/assets/ph-gallery-02.png` | 알림 [Save] → 글자 인식 → title·summary·category 카드 |
| 3 | `docs/marketing/assets/ph-gallery-03.png` | "Date clear" / "Check date" 표시와 Google Calendar 등록, 전날 저녁 알림 |
| 4 | `docs/marketing/assets/ph-gallery-04.png` | Sunday 5-line recap + privacy 요약(No sign-up · No ads · Calendar is add-only) |

영상이 필요하면 `reel-30s.mp4`의 영문 화면판이 있을 때만 YouTube에 올려 링크해요. 한국어 화면 영상은 PH에 쓰지 않아요.

**First maker comment**

```
Hi Product Hunt, I'm Byungin, the solo maker of Memsum.

I had 1,800 screenshots in my camera roll and still missed plans that were sitting right there in them. Screenshots are the fastest way to save something, but nobody goes back to copy them into a calendar. So I built an app that does the remembering for you.

How it works on Android:
- Take a screenshot as usual. Memsum asks in a notification whether to save it.
- Tap Save and, without opening the app, it reads the text (on-device), adds a one-line title and summary, and sorts it into one of six categories.
- If there's a date, you can add it to Google Calendar in one tap, or turn on auto-add. Auto-add only touches dates written out clearly. Vague ones like "next week" are marked "Check date" and left for you.
- Home shows upcoming plans by D-day, the evening before you get one notification with tomorrow's plans, and every Sunday at 7 PM you get 5 captures from the week worth a second look.
- Search finds words inside your screenshots, not just titles.

A few honest notes:
- Android only for now. iOS is in the works; you can get a one-time launch email at memsum.app/en.
- Titles and summaries are generated on our server from the recognized text. A private copy of the screenshot is stored so only you can access it, and you can delete everything from Settings.
- Calendar permission is add-only. Memsum never reads your existing events.
- No sign-up, no ads, free.

I'd love to hear where it gets dates wrong, or what you wish it caught. I read every comment here and reply myself.
```

**런치 운영 메모**
- 시작 시각: 태평양 시간 00:01(한국 시간 16:01). 첫 6시간은 댓글에 바로 답해요.
- 다른 채널(X/Threads, 디스콰이엇)에서 PH 링크를 공유할 때 "댓글로 의견 남겨 주세요"까지만 쓰고 "업보트해 주세요"는 쓰지 않아요.

---

## 2. Reddit

**규칙 확인 상태:** reddit.com과 old.reddit.com 모두 외부 조회가 막혀 각 서브레딧 규칙을 **직접 확인하지 못했어요(확인 필요).** 올리기 전에 사이드바의 Rules와 고정 글을 꼭 읽고 아래를 점검해요.
- 개발자 본인 글 허용 여부, 필수 플레어(예: Dev/Self-promotion), 고정된 자기 홍보 스레드 존재 여부
- 같은 앱 재게시 간격, 계정 나이·카르마 조건
- 본문에 개발자임을 밝히는 문장(아래 초안엔 이미 들어가 있어요)

### 2-1. r/androidapps

- **링크:** `{링크:reddit_androidapps}`
- **Title (127 / 300):**

```
[DEV] Memsum: it reads your screenshots, pulls out dates for Google Calendar, and reminds you the evening before (free, no ads)
```

- **Body:**

```
Hi r/androidapps, I'm the solo developer of Memsum. Posting per the sub rules; happy to take blunt feedback.

The problem: I had 1,800 screenshots and still missed plans that were in them. Screenshotting is easy; going back to copy dates into a calendar never happens.

What it does
- Detects new screenshots in the background and asks in a notification whether to save it. Regular photos are ignored, and auto-detect can be turned off.
- Tap Save and, without opening the app, it reads the text (on-device OCR), adds a one-line title and summary, and sorts it into six categories (marketing, events, receipts, shopping, info, other).
- Dates go to Google Calendar in one tap, or via optional auto-add. Auto-add only adds dates that are written out clearly; vague ones like "next week" are marked "Check date" and never auto-added.
- Home lists upcoming plans by D-day. The evening before, you get one notification with tomorrow's plans (time adjustable).
- Sunday 7 PM: 5 captures from the week worth a second look (needs 5+ screenshots that week).
- Search matches words inside screenshots.
- You can import older screenshots from your gallery.

Privacy, since screenshots are personal
- No account or email. It starts with an anonymous session.
- Text recognition happens on the device; titles/summaries are generated on our server from that text. A private copy of the image is stored that only you can access.
- Calendar access is add-only; existing events are never read.
- Card numbers on receipts are masked on screen. You can delete all server data from Settings.
- No ads.

Permissions: photos (to detect screenshots), notifications. Calendar is optional.

Google Play: {링크:reddit_androidapps}

Questions I'd especially like answered: Did it miss a date it should have caught? Is one reminder per evening the right amount?
```

### 2-2. r/productivity

토론 글 형식으로만 올려요. 서브레딧에 자기 홍보 전용 스레드가 있으면 **그 스레드에 2-1의 짧은 버전을 댓글로** 다는 쪽이 안전해요.

- **Title (79 / 300):**

```
How do you handle plans you screenshot but never look at again? (I built a fix)
```

- **Body:**

```
Disclosure up front: I'm the solo developer of the app mentioned at the end.

I noticed most of the plans I missed weren't forgotten, they were saved. A clinic appointment in a chat screenshot, an event poster, a coupon with an expiry date. Saving took two seconds. Moving it into a calendar never happened, and the screenshot sank under hundreds of others.

What has worked for me is removing the "later" step entirely:
1. Capture is the only manual action.
2. Anything with a date should land on the calendar without retyping, but vague dates ("next week") should be flagged, not guessed.
3. One reminder the evening before, bundled, so it doesn't turn into notification noise.
4. A short weekly look-back (I do 5 items on Sunday evening) instead of a full inbox review.

I ended up building this as an Android app called Memsum (free, no ads, no sign-up): {링크:reddit_productivity}

But I'm more curious how others handle it. Do you process screenshots on a schedule, use a notes app, or just let them pile up?
```

---

## 3. Hacker News — Show HN

**적합성 판단:** 조건부 적합.
- 규칙상 맞는 점: 직접 만든 제품, 가입 없이 바로 써 볼 수 있음, 실질적인 작업량(네이티브 백그라운드 감지·OCR·서버 처리).
- 걸리는 점: Android 전용이라 써 볼 수 있는 사람이 제한돼요. 소스 비공개, 서버에서 LLM으로 요약하는 구조라 개인정보 질문이 집중될 거예요. "마이너 버전 업데이트" 글은 주제 밖이라 **1.1.0 소식이 아니라 제품 자체로** 올려요. 이전에 Show HN을 올린 적이 있다면 이번엔 올리지 않아요(확인 필요).
- 친구에게 추천·댓글을 부탁하면 안 돼요(규칙 원문: "Please don't ask friends to upvote or comment").
- 권장 시점: Product Hunt 런치와 다른 날, 미국 평일 오전(한국 시간 밤 10시~자정).

- **Title (67 / 80):**

```
Show HN: Memsum – Android app that turns screenshots into reminders
```

- **URL:** `https://play.google.com/store/apps/details?id=app.memsum` (HN 사용자는 추적 파라미터에 민감해서 파라미터 없는 링크를 권장. 측정이 꼭 필요하면 `{링크:hackernews}`를 쓰되 질문이 나오면 솔직히 답해요.)
- **첫 댓글(작성자 본인이 바로 단다):**

```
Hi HN, I built this solo.

I had ~1,800 screenshots and still missed appointments that were in them. Capturing is instant; moving things into a calendar never happens. Memsum tries to make the screenshot itself the only step.

How it works (Android):
- Background detection: a JobScheduler content-URI trigger on MediaStore images catches new screenshots while you're in other apps, and posts a notification asking whether to save it. Non-screenshot photos are ignored; detection can be turned off.
- On "Save", OCR runs on-device (ML Kit). The recognized text (not the image) goes to a Supabase Edge Function that calls gpt-4o-mini for a title, a one-line summary, a category, and any dates.
- Dates are labeled "Date clear" or "Check date". Optional calendar auto-add only uses the clear ones. Calendar scope is add-only; existing events aren't read.
- Home shows upcoming plans by D-day, one bundled reminder the evening before, and a Sunday 7 PM recap of 5 captures worth revisiting. Search covers the OCR text.

Privacy details, since this is the obvious question: no account (anonymous session); a resized copy of the screenshot goes to a private storage bucket under a per-user folder that storage policies restrict to that user; card-like numbers are masked in the UI; "delete my data" in Settings wipes server-side captures, images, and reports. No ads, no ad ID.

Stack: Expo React Native with Kotlin native modules, Supabase (Postgres, Edge Functions, Storage).

Android only right now; iOS is in progress. I'd especially like feedback on date extraction misses and whether a server-side LLM step is a dealbreaker for you.
```

---

## 4. X / Threads 영문 런치 스레드

X 가중치 기준(영문 1, 링크 23). Threads는 같은 글을 그대로 써요(500자 제한 안).

| 순서 | 글자 수(X) | 첨부 |
|---|---|---|
| 1/5 | 185 / 280 | `feed-01.png` 영문판이 있으면 사용, 없으면 `docs/store/images/en-US/phone/02-home.png` |
| 2/5 | 255 / 280 | `docs/store/images/en-US/phone/01-scan.png` |
| 3/5 | 257 / 280 | `docs/store/images/en-US/phone/04-calendar.png` |
| 4/5 | 261 / 280 | `docs/store/images/en-US/phone/05-report.png` |
| 5/5 | 218 / 280 | 없음 |

```
I had 1,800 screenshots in my camera roll and still missed plans that were sitting right there in them.

So I built Memsum, an Android app that remembers your screenshots for you. (1/5)
```

```
How it works: take a screenshot like you always do. Memsum spots it and asks in a notification whether to save it. Tap [Save] and it reads the text, adds a one-line title and summary, and files it into one of six categories, without opening the app. (2/5)
```

```
If there's a date, it becomes an event you can add to Google Calendar in one tap. Clear dates are marked "Date clear". Vague ones like "next week" get "Check date" and are never auto-added. A wrong date on your calendar is worse than a missing one. (3/5)
```

```
Then it nudges you before you miss things:
- Home shows upcoming plans by D-day
- The evening before, one notification lists tomorrow's plans
- Sunday at 7 PM, 5 captures from your week worth a second look

Search also finds words inside your screenshots. (4/5)
```

```
No sign-up, no ads, free. Text is recognized on your device; titles and summaries are generated server-side from that text. Android now, iOS in the works.

Solo dev here, feedback welcome.
{링크:x_en} (5/5)
```

Product Hunt 런치 당일엔 5/5 링크를 PH 페이지 주소로 바꾸고 "Comments on Product Hunt welcome." 정도만 덧붙여요(업보트 요청 금지).
