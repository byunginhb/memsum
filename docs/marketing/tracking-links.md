# 채널별 추적 링크 — 캠페인 `launch_v110`

> 다른 문서의 `{링크:채널키}` 자리에 아래 "본문에 쓸 링크" 열의 주소를 넣어요.
> Play 링크는 설치 경로 정보(Install Referrer) 형식: `&referrer=` 뒤에 `utm_source%3D...%26utm_medium%3D...%26utm_campaign%3Dlaunch_v110`처럼 `=`는 `%3D`, `&`는 `%26`으로 바꿔 넣어요.
> 웹 링크는 일반 형식: `?utm_source=...&utm_medium=...&utm_campaign=launch_v110`.

## 1. 어느 링크를 쓰나

- **Play 링크:** 읽는 사람 대부분이 Android이거나, 바로 "써 볼 수 있는 곳"으로 보내야 하는 채널(GeekNews Show GN, r/androidapps, 지인 공유).
- **웹 링크:** 아이폰 사용자가 섞인 채널(인스타그램·스레드·X·오픈채팅·보도자료). 아이폰 사용자도 memsum.app에서 iOS 출시 알림을 신청할 수 있어서요.
- 영어권 채널은 웹 링크를 `/en` 경로로 써요.

## 2. 링크 표

| 채널키 | 채널 | source | medium | 본문에 쓸 링크 | 다른 쪽 링크(참고) |
|---|---|---|---|---|---|
| geeknews | GeekNews Show GN | geeknews | community | Play | 웹 |
| disquiet | 디스콰이엇 | disquiet | community | Play | 웹 |
| clien_promo | 클리앙 직접홍보(유료, 선택) | clien | paid_board | Play | 웹 |
| naver_blog | 네이버 블로그 | naver_blog | blog | Play | 웹 |
| brunch | 브런치 | brunch | blog | Play | 웹 |
| kakao_friend | 카카오톡 지인 1:1·단체방 | kakao | messenger | Play | 웹 |
| kakao_openchat | 카카오톡 오픈채팅 | kakao_openchat | messenger | 웹 | Play |
| instagram_bio | 인스타그램 프로필 링크 | instagram | social_bio | 웹 | Play |
| instagram_story | 인스타그램 스토리 링크 스티커 | instagram | social_story | 웹 | Play |
| threads | 스레드(한국어) | threads | social | 웹 | Play |
| x | X(한국어) | x | social | 웹 | Play |
| x_en | X·스레드(영어) | x | social_en | 웹(/en) | Play |
| producthunt | Product Hunt — Google Play 칸 | producthunt | launch_platform | Play | — |
| producthunt_web | Product Hunt — Website 칸 | producthunt | launch_platform | 웹(/en) | — |
| reddit_androidapps | Reddit r/androidapps | reddit_androidapps | community | Play | 웹(/en) |
| reddit_productivity | Reddit r/productivity | reddit_productivity | community | Play | 웹(/en) |
| hackernews | Hacker News(선택 — 파라미터 없는 링크 권장) | hackernews | community | Play | 웹(/en) |
| press | 보도자료·기자 메일 | press | press | 웹 | Play |
| email_signature | 개인 메일 서명 | email | signature | 웹 | Play |

## 3. 완성된 주소

### Play 링크 (Install Referrer)

| 채널키 | 주소 |
|---|---|
| geeknews | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dgeeknews%26utm_medium%3Dcommunity%26utm_campaign%3Dlaunch_v110` |
| disquiet | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Ddisquiet%26utm_medium%3Dcommunity%26utm_campaign%3Dlaunch_v110` |
| clien_promo | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dclien%26utm_medium%3Dpaid_board%26utm_campaign%3Dlaunch_v110` |
| naver_blog | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dnaver_blog%26utm_medium%3Dblog%26utm_campaign%3Dlaunch_v110` |
| brunch | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dbrunch%26utm_medium%3Dblog%26utm_campaign%3Dlaunch_v110` |
| kakao_friend | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dkakao%26utm_medium%3Dmessenger%26utm_campaign%3Dlaunch_v110` |
| kakao_openchat | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dkakao_openchat%26utm_medium%3Dmessenger%26utm_campaign%3Dlaunch_v110` |
| instagram_bio | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial_bio%26utm_campaign%3Dlaunch_v110` |
| instagram_story | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial_story%26utm_campaign%3Dlaunch_v110` |
| threads | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dthreads%26utm_medium%3Dsocial%26utm_campaign%3Dlaunch_v110` |
| x | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dx%26utm_medium%3Dsocial%26utm_campaign%3Dlaunch_v110` |
| x_en | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dx%26utm_medium%3Dsocial_en%26utm_campaign%3Dlaunch_v110` |
| producthunt | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dproducthunt%26utm_medium%3Dlaunch_platform%26utm_campaign%3Dlaunch_v110` |
| reddit_androidapps | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dreddit_androidapps%26utm_medium%3Dcommunity%26utm_campaign%3Dlaunch_v110` |
| reddit_productivity | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dreddit_productivity%26utm_medium%3Dcommunity%26utm_campaign%3Dlaunch_v110` |
| hackernews | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dhackernews%26utm_medium%3Dcommunity%26utm_campaign%3Dlaunch_v110` |
| press | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Dpress%26utm_medium%3Dpress%26utm_campaign%3Dlaunch_v110` |
| email_signature | `https://play.google.com/store/apps/details?id=app.memsum&referrer=utm_source%3Demail%26utm_medium%3Dsignature%26utm_campaign%3Dlaunch_v110` |

### 웹 링크

| 채널키 | 주소 |
|---|---|
| geeknews | `https://memsum.app/?utm_source=geeknews&utm_medium=community&utm_campaign=launch_v110` |
| disquiet | `https://memsum.app/?utm_source=disquiet&utm_medium=community&utm_campaign=launch_v110` |
| clien_promo | `https://memsum.app/?utm_source=clien&utm_medium=paid_board&utm_campaign=launch_v110` |
| naver_blog | `https://memsum.app/?utm_source=naver_blog&utm_medium=blog&utm_campaign=launch_v110` |
| brunch | `https://memsum.app/?utm_source=brunch&utm_medium=blog&utm_campaign=launch_v110` |
| kakao_friend | `https://memsum.app/?utm_source=kakao&utm_medium=messenger&utm_campaign=launch_v110` |
| kakao_openchat | `https://memsum.app/?utm_source=kakao_openchat&utm_medium=messenger&utm_campaign=launch_v110` |
| instagram_bio | `https://memsum.app/?utm_source=instagram&utm_medium=social_bio&utm_campaign=launch_v110` |
| instagram_story | `https://memsum.app/?utm_source=instagram&utm_medium=social_story&utm_campaign=launch_v110` |
| threads | `https://memsum.app/?utm_source=threads&utm_medium=social&utm_campaign=launch_v110` |
| x | `https://memsum.app/?utm_source=x&utm_medium=social&utm_campaign=launch_v110` |
| x_en | `https://memsum.app/en?utm_source=x&utm_medium=social_en&utm_campaign=launch_v110` |
| producthunt_web | `https://memsum.app/en?utm_source=producthunt&utm_medium=launch_platform&utm_campaign=launch_v110` |
| reddit_androidapps | `https://memsum.app/en?utm_source=reddit_androidapps&utm_medium=community&utm_campaign=launch_v110` |
| reddit_productivity | `https://memsum.app/en?utm_source=reddit_productivity&utm_medium=community&utm_campaign=launch_v110` |
| hackernews | `https://memsum.app/en?utm_source=hackernews&utm_medium=community&utm_campaign=launch_v110` |
| press | `https://memsum.app/?utm_source=press&utm_medium=press&utm_campaign=launch_v110` |
| email_signature | `https://memsum.app/?utm_source=email&utm_medium=signature&utm_campaign=launch_v110` |

## 4. 측정상 한계 (꼭 알고 써요)

1. **Play 링크만 지금 바로 측정돼요.** Play Console 획득 보고서의 "추적 채널(UTM)" 항목에서 utm_source·utm_campaign별 스토어 방문자·설치자를 볼 수 있어요. 숫자가 적으면 Google이 "기타"로 묶어 보여 줄 수 있어요.
2. **웹 링크의 utm은 지금은 아무 데도 기록되지 않아요.** `memsum-web/src/lib/analytics.ts`는 페이지에 PostHog나 Google 태그가 있을 때만 이벤트를 넘기는데, 웹 저장소 안에서 그 스크립트를 불러오는 코드를 찾지 못했어요. 또 랜딩의 Google Play 버튼(`site.ts`의 `PLAY_STORE_URL`)은 utm을 넘기지 않아서, 웹을 거쳐 설치한 사람은 Play Console에서 채널이 구분되지 않아요. → 개발 작업 필요(아래 README "개발 요청" 참고).
3. **앱 안 PostHog는 설치 경로를 모르게 되어 있어요.** 앱에 설치 경로 정보(Install Referrer)를 읽는 코드가 없어서, PostHog의 앱 이벤트(`capture_completed` 등)를 채널별로 나눌 수 없어요. 지금은 "언제 설치·활성 사용이 늘었나"를 게시 날짜와 맞춰 보는 정도만 가능해요.
4. 단축 URL 서비스를 쓰면 `referrer` 안의 `%3D`, `%26`이 풀리지 않았는지 한 번 열어 보고 확인해요. 풀리면 Play가 utm을 못 읽어요.
