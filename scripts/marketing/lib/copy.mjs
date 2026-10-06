// scripts/marketing/lib/copy.mjs — 홍보 이미지·영상 속 문구.
//
// 새 주장 금지: 모든 문구는 아래 확정 출처에서 그대로 가져왔다(글자 단위 일치, 줄바꿈 위치만 조정).
//   [L] memsum-web/src/lib/landing-copy.ts      [S] scripts/gen-store-screenshots.mjs 캡션
//   [F] scripts/gen-feature-graphic.mjs 문구     [P] docs/store/listings/<lang>/*.txt
//   [D] src/dev/preview.web.ts 앱 예시 데이터(스토어 스크린샷과 같은 장면)
// {…} 는 형광펜 구절(장면당 한 곳). 수치·후기·순위 주장은 넣지 않았다.

export const COPY = {
  ko: {
    brand: 'Memsum',
    // [L] problem.title / bodyLine1 / bodyLine2
    problem: ['사진첩 ‘스크린샷’ 폴더,', '{몇 장이세요?}'],
    problemSub: '계속 찍는데, 다시 보는 일은 거의 없죠.',
    problemList: '영수증, 약속 메시지, 할인 쿠폰, 나중에 읽으려던 글…',
    // [S] 01-scan / 04-calendar / 05-report
    scan: ['스크린샷을 찍으면', '{글자를 읽어} 정리해요'],
    calendar: ['날짜가 보이면', '{구글 캘린더}에 등록해요'],
    report: ['일요일 저녁엔', '{다시 볼 5개}를 골라 줘요'],
    // [L] hero.h1Line1 / h1Line2 ({site} = Memsum)
    hero: ['까먹어도 괜찮아요.', 'Memsum이', '{대신 기억해요.}'],
    // [F] 피처 그래픽 태그라인·기능 줄
    tagline: ['스크린샷 속 약속,', '{놓치지 않게} 기억해요'],
    features: '자동 감지 · 전날 밤 리마인드 · 일요일 5줄 리포트',
    // [L] steps[1].body '…6가지로 자동 분류해요' / features.items 본문 '마케팅·일정·영수증·쇼핑·정보·기타 6가지'
    sort: ['6가지로', '{자동 분류해요}'],
    cats: ['마케팅', '일정', '영수증', '쇼핑', '정보', '기타'],
    // [L] stepsTitle
    stepsTitle: '이렇게 간단해요',
    steps: [
      { title: '찍어요', body: '평소처럼 스크린샷만 찍으세요. 따로 할 일 없어요.' },
      { title: 'Memsum이 읽어요', body: '캡처 속 글자를 추출해(OCR) 제목과 요약을 붙이고, 6가지로 자동 분류해요.' },
      { title: '알아서 정리돼요', body: '일정은 캘린더에, 한 주는 일요일 저녁 5줄 리포트로. 당신은 다시 찾기만 하면 돼요.' },
    ],
    // [L] faq '어떤 기기에서 되나요?' 답 / meta.description 끝 구절
    availability: ['Android는 지금 Google Play에서 받을 수 있어요.', 'iOS는 준비 중이에요.'],
    perks: '가입 없이 바로 시작, 광고 없음.',
    // 의뢰서 지정 CTA(배지 aria 'Google Play에서 다운로드'의 짧은 형태)
    cta: 'Google Play에서 받기',
    ctaTop: 'GET IT ON',
    // [L] appScreens.items[2].caption
    reportCaption: '일요일 저녁, 이번 주 5줄',
    // [D] 앱 화면 예시(캘린더·5줄 리포트) — 스토어 스크린샷 원본과 같은 데이터
    cal: {
      title: '캘린더',
      rows: [
        { mon: '10월', day: '5', dow: '월요일', title: '을지로 돌담식당 예약 확정', meta: '19:00 · 돌담식당 을지로점', state: 'add' },
        { mon: '10월', day: '10', dow: '토요일', title: '지민 ♥ 도윤 결혼식', meta: '12:30 · 달빛정원홀 3층 그랜드홀', state: 'add', hero: true },
      ],
      add: '캘린더에 등록',
      added: '등록됨',
      sure: '날짜 확실',
    },
    reportTitle: '5줄 리포트',
    reportRange: '9월 28일 - 10월 4일',
    reportRows: [
      { t: '토요일 12:30 지민·도윤 결혼식', s: '달빛정원홀 3층. 축의금 계좌는 원본에 있어요.' },
      { t: '내일 19:00 돌담식당 4명', s: '10분 넘게 늦으면 자동 취소돼요.' },
      { t: '화요일 10:30 치과 스케일링', s: '변경은 하루 전까지 전화로.' },
      { t: '세일 쿠폰 10/12까지', s: '5만 원 이상 사면 최대 2만 원 할인.' },
      { t: '읽으려던 회의 줄이기 글', s: '안건 없는 초대 거절, 기본 25분.' },
    ],
    // [P] full.txt "일요일 저녁 7시"
    sunday: 'SUN 19:00',
  },
  en: {
    brand: 'Memsum',
    problem: ['How many screenshots', 'are in your {camera roll?}'],
    problemSub: 'You keep taking them. You almost never look back.',
    problemList: 'Receipts, plans, coupons, that article you meant to read later…',
    scan: ['Take a screenshot.', 'Memsum {reads the text}'],
    calendar: ['Dates go straight', 'to {Google Calendar}'],
    report: ['Every Sunday, {5 captures}', 'worth a second look'],
    hero: ["It's okay to forget.", 'Memsum', '{remembers for you.}'],
    tagline: ['Plans in your screenshots,', '{never missed}'],
    features: 'Auto-detect · Reminders · Sunday 5-line report',
    // [L] steps[1].body 'files it into one of six categories' / [P] full.txt 'marketing, events, receipts, shopping, info and other'
    sort: ['Filed into', '{six categories}'],
    cats: ['Marketing', 'Events', 'Receipts', 'Shopping', 'Info', 'Other'],
    stepsTitle: "It's this simple",
    steps: [
      { title: 'Take it', body: 'Just take a screenshot like you always do. Nothing else to do.' },
      { title: 'Memsum reads it', body: 'It reads the text inside (OCR), adds a title and summary, and files it into one of six categories — automatically.' },
      { title: 'Sorted for you', body: 'Events go to your calendar, and your week comes back as a 5-line recap on Sunday evening. All you do is look it up later.' },
    ],
    availability: ['Android is available now on Google Play.', 'iOS is on the way.'],
    // [P] en full.txt Privacy 항목 두 줄
    perks: 'No sign-up or email needed. No ads.',
    cta: 'Get it on Google Play',
    ctaTop: 'GET IT ON',
    reportCaption: 'Sunday evening, your week in 5 lines',
    // [L] features.items 본문 첫 문장(PH 갤러리 보조 문구)
    body: {
      scan: 'It pulls Korean and English text out of your images and turns it into something searchable.',
      calendar: 'It spots events in screenshots that have a date and time. One tap, whenever you want, adds them to Google Calendar.',
      report: 'From everything you captured this week, it picks the 5 worth a second look and shows them in 5 lines.',
    },
    cal: {
      title: 'Calendar',
      rows: [
        { mon: 'Oct', day: '5', dow: 'Mon', title: 'Dinner at Juniper Kitchen', meta: '19:00 · Juniper Kitchen', state: 'add' },
        { mon: 'Oct', day: '10', dow: 'Sat', title: 'Mia & Daniel’s wedding', meta: '12:30 · The Chapel Hall, 3rd floor', state: 'add', hero: true },
      ],
      add: 'Add to calendar',
      added: 'Added',
      sure: 'Date clear',
    },
    reportTitle: '5-line report',
    reportRange: 'Sep 28 - Oct 4',
    reportRows: [
      { t: 'Sat 12:30 Mia & Daniel’s wedding', s: 'The Chapel Hall, 3rd floor. RSVP details are in the original.' },
      { t: 'Tomorrow 7 PM, Juniper Kitchen for 4', s: 'The table is held for 15 minutes.' },
      { t: 'Tue 10:30 dental cleaning', s: 'Reschedule at least a day ahead.' },
      { t: 'Sale coupon, ends Oct 12', s: 'Up to $20 off orders over $50.' },
      { t: 'The meetings article you saved', s: 'No agenda, no invite. Default to 25 minutes.' },
    ],
    sunday: 'SUN 7 PM',
  },
};
