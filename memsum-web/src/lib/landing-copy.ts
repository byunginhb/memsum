/**
 * 랜딩 페이지 카피 사전 (i18n SSOT).
 *
 * - ko: 현 컴포넌트 한국어 원문 그대로.
 * - en: `landing-en.final.md`의 네이티브 검수 최종형 그대로(짧은 최종형 우선).
 *
 * 모든 랜딩 문구를 이 한 곳에서 관리해 컴포넌트는 `copy`(또는 `lang`)만 받아 렌더한다.
 * 배제 어휘(PKM·second brain·zettelkasten·PARA·backlink·knowledge graph) 0, 이모지 리터럴 0.
 */

export type Lang = 'ko' | 'en';

export type LandingCopy = {
  /** 한국어에서만 `break-keep`(단어 단위 줄바꿈)을 적용하기 위한 플래그. */
  isKorean: boolean;

  /**
   * 로케일별 폰 목업 스크린샷 경로.
   * 화면 속 텍스트가 이미지에 구워져 있어 번역되지 않으므로 로케일마다 별도 PNG를 둔다
   * (en은 `.en.png` — 영어 앱 화면). Hero·FeatureShowcase가 참조.
   */
  shots: {
    home: string;
    report: string;
  };

  meta: {
    titleDefault: string;
    titleTemplate: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    /** JSON-LD MobileApplication.description */
    appJsonLdDescription: string;
  };

  header: {
    privacy: string;
    terms: string;
    /** 스크롤 시 등장하는 컴팩트 CTA("받기"/"Get it"). */
    getIt: string;
  };

  footer: {
    privacy: string;
    terms: string;
    privacyPolicy: string;
    termsOfService: string;
    contact: string;
  };

  /** 헤더 언어 토글. */
  langToggle: {
    ko: string;
    en: string;
    ariaLabel: string;
  };

  hero: {
    eyebrow: string;
    h1Line1: string;
    /** {site}로 브랜드명 치환(ko에서 "Memsum이 알아서." 형태). */
    h1Line2: string;
    subLine1: string;
    subLine2: string;
    helper: string;
    scrollHint: string;
    reportAlt: string;
    homeAlt: string;
  };

  problem: {
    title: string;
    bodyLine1: string;
    bodyLine2: string;
    counterIntro: string;
    counterUnit: string;
    counterClosing: string;
    quote: string;
    underQuote: string;
    leadIn: string;
    coralUnderline: string;
  };

  steps: {
    title: string;
    items: readonly { title: string; body: string }[];
  };

  features: {
    sectionAria: string;
    phoneAlt: string;
    items: readonly { title: string; body: string }[];
  };

  /** 앱 화면 미리보기 섹션 — 기기 목업 이미지 나열. */
  appScreens: {
    title: string;
    subtitle: string;
    items: readonly { src: string; alt: string; caption: string }[];
  };

  audience: {
    title: string;
    items: readonly string[];
    quoteHeadline: string;
    quoteSub: string;
  };

  compare: {
    title: string;
    otherHeader: string;
    memsumHeader: string;
    rows: readonly { label: string; other: string; memsum: string }[];
  };

  faq: {
    title: string;
    items: readonly {
      q: string;
      a: string;
      /** 있으면 답변 아래 NotifyDialog를 여는 인라인 CTA 버튼을 렌더한다. */
      ctaLabel?: string;
    }[];
  };

  finalCta: {
    title: string;
    body: string;
    helper: string;
  };

  storeBadge: {
    appstore: { top: string; bottom: string; aria: string };
    googleplay: { top: string; bottom: string; aria: string };
    /** 데스크톱 배지 리본(넉넉). */
    ribbon: string;
    /** 컴팩트/모바일 바 리본(가장 좁음 → 짧은 최종형). */
    ribbonCompact: string;
  };

  notifyDialog: {
    /** 모달을 여는 외부 CTA 버튼 라벨(스토어 배지 외 별도 버튼). */
    openCta: string;
    formTitle: string;
    formDescription: string;
    emailLabel: string;
    validationError: string;
    submit: string;
    /** 제출 진행 중 버튼 라벨. */
    submitting: string;
    promise: string;
    successTitle: string;
    /** 성공 안내(평문). */
    successDescription: string;
    /** 저장 실패 안내. */
    submitError: string;
    /** 저장 실패 폴백 — {email} 토큰을 지원 메일 mailto 링크로 치환. */
    errorHelp: string;
    close: string;
    closeAria: string;
    mailtoSubject: string;
    /** {email} 토큰을 신청 주소로 치환. */
    mailtoBody: string;
  };

  /**
   * 창작자 스토리 섹션 — 콜드스타트 신뢰 자산.
   * 파운더 이름은 site.ts OPERATOR_NAME과 일치시킨다.
   */
  founder: {
    name: string;
    role: string;
    /** "왜 만들었나" 1~3문장 인용. */
    quote: string;
    photoAlt: string;
    /** 파운더 직접 문의 링크 레이블 — mailto:{SUPPORT_EMAIL}로 연결. */
    contactCta: string;
  };

  /**
   * 미스방지 서사 후기 섹션.
   * 실제 후기 미확보 구간은 isExample:true로 라벨링(허위 후기 정책 준수).
   */
  testimonials: {
    title: string;
    /** 각 카드에 표시할 "경험 예시" / "Experience example" 배지 텍스트. */
    exampleBadge: string;
    items: readonly {
      quote: string;
      context: string;
      /** true = 실제 후기 미확보 · 경험 예시 라벨 표시. */
      isExample: boolean;
    }[];
  };
};

const KO: LandingCopy = {
  isKorean: true,

  shots: {
    home: '/shots/home.png',
    report: '/shots/report.png',
  },

  meta: {
    titleDefault: 'Memsum 멤섬 — 안 까먹게, 스크린샷 속 약속 대신 기억·캘린더·주간 5줄',
    titleTemplate: '%s | Memsum',
    description:
      '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
    ogTitle: '안 까먹게 해드릴게요. 찍기만 하세요.',
    ogDescription:
      '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
    appJsonLdDescription:
      '쌓인 스크린샷을 자동으로 읽어 정리하고, 일정은 캘린더에, 한 주는 5줄 요약으로. 가입 없이 바로 시작, 광고 없음.',
  },

  header: {
    privacy: '개인정보처리방침',
    terms: '이용약관',
    getIt: '받기',
  },

  footer: {
    privacy: '개인정보처리방침',
    terms: '이용약관',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    contact: '문의:',
  },

  langToggle: {
    ko: '한국어',
    en: 'English',
    ariaLabel: 'Change language',
  },

  hero: {
    eyebrow: '안 까먹게 · 약속은 캘린더로 · 일요일 5줄',
    h1Line1: '까먹어도 괜찮아요.',
    h1Line2: '{site}이 대신 기억해요.',
    subLine1: '사진첩에 쌓이기만 하던 스크린샷, 이제 다시 쓸모 있게.',
    subLine2:
      '{site}이 캡처 속 글자를 읽어 정리하고, 일정은 캘린더에 넣고, 한 주는 5줄로 돌려드려요.',
    helper: '지금 무료로 이용해보세요',
    scrollHint: '이렇게 작동해요',
    reportAlt: 'Memsum 주간 리포트 화면 — 이번 주 핵심 5개를 5줄로 보여주는 모습',
    homeAlt: 'Memsum 홈 화면 — 이번 주 캡처가 카드로 자동 정리된 모습',
  },

  problem: {
    title: '사진첩 ‘스크린샷’ 폴더, 몇 장이세요?',
    bodyLine1: '영수증, 약속 메시지, 할인 쿠폰, 나중에 읽으려던 글…',
    bodyLine2: '계속 찍는데, 다시 보는 일은 거의 없죠.',
    counterIntro: '어떤 분의 폴더엔, 이만큼.',
    counterUnit: '장',
    counterClosing: '그런데 다시 본 건 거의 없어요.',
    quote: '“내가 이걸 왜 다 찍었지?”',
    underQuote: '정리하려고 앨범 열었다가, 한 시간 뒤 그냥 닫은 적 있으시죠.',
    leadIn: '노션도 메모 앱도 써봤지만 한 달 만에 방치.',
    coralUnderline: '문제는 당신이 아니에요. 정리를 시키는 도구가 문제였어요.',
  },

  steps: {
    title: '이렇게 간단해요',
    items: [
      {
        title: '찍어요',
        body: '평소처럼 스크린샷만 찍으세요. 따로 할 일 없어요.',
      },
      {
        title: 'Memsum이 읽어요',
        body: '캡처 속 글자를 추출해(OCR) 제목과 요약을 붙이고, 6가지로 자동 분류해요.',
      },
      {
        title: '알아서 정리돼요',
        body: '일정은 캘린더에, 한 주는 일요일 저녁 5줄 리포트로. 당신은 다시 찾기만 하면 돼요.',
      },
    ],
  },

  features: {
    sectionAria: 'Memsum 기능',
    phoneAlt: 'Memsum 앱 화면 — 캡처가 제목·요약과 함께 자동 정리된 모습',
    items: [
      {
        title: '캡처 속 글자를 읽어요',
        body: '이미지 안의 한국어·영어 텍스트를 추출해 검색 가능한 내용으로 바꿔요. 오타와 줄바꿈까지 다듬어 읽기 좋게 정리합니다.',
      },
      {
        title: '제목·요약·분류를 자동으로',
        body: '캡처마다 한 줄 제목과 한 줄 요약을 붙여요. 마케팅·일정·영수증·쇼핑·정보·기타 6가지로 자동 분류해 나중에 찾기 쉽게.',
      },
      {
        title: '일정은 한 번의 탭으로 캘린더에',
        body: '날짜·시간이 담긴 캡처에서 일정을 찾아내요. 원할 때 한 번의 탭이면 구글 캘린더에 추가. 옮겨 적다 약속 까먹는 일, 이제 끝.',
      },
      {
        title: '일요일 저녁, 이번 주 5줄',
        body: '한 주에 모인 캡처 중 다시 볼 만한 5개를 골라 5줄로 보여드려요. 한 주에 무엇을 담아뒀는지 짧게 돌아볼 수 있어요.',
      },
      {
        title: '무료로 시작, 정보는 안전하게',
        body: '지금은 무료로 모든 기능을 써볼 수 있어요. 구글 캘린더 연결 정보는 기기 안에만 안전하게 보관하고, 캘린더 전체를 읽지 않아요.',
      },
    ],
  },

  appScreens: {
    title: '받으면 이렇게 보여요',
    subtitle: '캡처가 정리되고, 글자가 읽히고, 한 주가 5줄로.',
    items: [
      { src: '/store/device-home.png', alt: 'Memsum 홈 화면 — 이번 주 캡처와 최근 캡처가 정리된 모습', caption: '홈 — 이번 주 캡처 한눈에' },
      { src: '/store/device-detail.png', alt: 'Memsum 캡처 상세 — 인식된 텍스트와 정보가 정리된 모습', caption: '캡처 속 글자를 읽어 정리' },
      { src: '/store/device-report.png', alt: 'Memsum 주간 리포트 — 이번 주 핵심 5개', caption: '일요일 저녁, 이번 주 5줄' },
    ],
  },

  audience: {
    title: 'Memsum은 이런 분을 위해 만들었어요',
    items: [
      '사진첩 스크린샷이 수백, 수천 장 쌓여 있는 분',
      '인스타·유튜브에서 좋은 자료를 반사적으로 캡처하는 분',
      '약속·영수증·정보를 찍어두고 다시 못 찾는 분',
      '메모 앱을 따로 켜기 번거로운 분',
    ],
    quoteHeadline: '노션·옵시디언이 안 맞으셨던 분께.',
    quoteSub:
      '정리 시스템을 만들고 싶은 게 아니라, 그냥 안 잃어버리고 싶은 거잖아요.',
  },

  compare: {
    title: '“정리하지 마세요”가 우리 철학이에요',
    otherHeader: '다른 도구',
    memsumHeader: 'Memsum',
    rows: [
      {
        label: '정리 방식',
        other: '폴더·태그·시스템을 내가 만듦',
        memsum: '알아서 제목·분류',
      },
      {
        label: '한국어 캡처',
        other: 'OCR이 약하거나 없음',
        memsum: '한국어 OCR + 오타 교정',
      },
      {
        label: '약속 처리',
        other: '직접 옮겨 적기',
        memsum: '캡처 → 캘린더 한 탭',
      },
      {
        label: '한 주 돌아보기',
        other: '직접 찾아봐야 함',
        memsum: '일요일 5줄 자동',
      },
      {
        label: '시작',
        other: '가입·온보딩',
        memsum: '무료로 바로',
      },
    ],
  },

  faq: {
    title: '자주 묻는 질문',
    items: [
      {
        q: '제 스크린샷을 학습에 쓰나요?',
        a: '아니요. 캡처는 당신 것을 정리하는 데만 써요.',
      },
      {
        q: '무료인가요?',
        a: '네, 지금은 무료로 모든 기능을 써볼 수 있어요. 부담 없이 시작해보세요.',
      },
      {
        q: '캘린더 전체를 읽나요?',
        a: "아니요. 캘린더 권한은 '이벤트 추가'에만 써요. 연결 토큰은 기기 안에만 보관합니다.",
      },
      {
        q: 'OCR이 한국어도 되나요?',
        a: '네. 한국어·영어 텍스트를 추출하고, 오타·줄바꿈을 다듬어 정리해요.',
      },
      {
        q: '어떤 기기에서 되나요?',
        a: 'Android는 지금 Google Play에서 받을 수 있어요. iOS는 준비 중이에요.',
        ctaLabel: 'iOS 출시 알림 신청',
      },
    ],
  },

  founder: {
    name: 'Byungin Song',
    role: '솔로 파운더 · Memsum 만든 사람',
    quote:
      '저도 스크린샷 1,800장을 쌓아두고 약속을 놓치던 사람이었어요. 대신 기억해줄 게 필요했고, 그래서 혼자 Memsum을 만들었어요.',
    photoAlt: 'Memsum을 만든 Byungin Song',
    contactCta: '만든 사람이 직접 답해드려요',
  },

  testimonials: {
    title: '놓칠 뻔한 것들, 이렇게 막았어요',
    exampleBadge: '경험 예시',
    items: [
      {
        quote:
          '카톡으로 받은 병원 예약을 캡처만 해뒀는데, 일요일 5줄에 떠서 안 까먹고 갔어요.',
        context: '병원 예약 · 캘린더 미등록 상황',
        isExample: true,
      },
      {
        quote:
          '청첩장을 캡처했더니 날짜와 장소를 읽어 둬서, 버튼 한 번으로 캘린더에 넣었어요.',
        context: '청첩장 · 캘린더 등록',
        isExample: true,
      },
      {
        quote:
          '반년 전 찍어둔 할인 코드를 검색 한 번으로 찾았어요. 안 보던 스크린샷이 진짜 쓸모 있어졌어요.',
        context: '할인 코드 · 검색 기능',
        isExample: true,
      },
    ],
  },

  finalCta: {
    title: '잊어도 괜찮아요. Memsum이 다시 떠올려드릴게요.',
    body: '찍기만 하세요. 나머지는 Memsum이.',
    helper: '지금 무료로 시작 · 생산성 카테고리',
  },

  storeBadge: {
    appstore: {
      top: 'Download on the',
      bottom: 'App Store',
      aria: '출시 알림 신청 — App Store',
    },
    googleplay: {
      top: 'GET IT ON',
      bottom: 'Google Play',
      aria: 'Google Play에서 다운로드',
    },
    ribbon: '출시 알림 받기',
    ribbonCompact: '알림 받기',
  },

  notifyDialog: {
    openCta: '출시되면 가장 먼저 알림 받기',
    formTitle: '가장 먼저 써보세요',
    formDescription:
      '만든 사람이 직접, 출시되는 날 한 통만 보내드려요. 이메일만 남겨주시면 스팸 없이 출시 알림 하나로 바로 알려드릴게요.',
    emailLabel: '이메일 주소',
    validationError: '올바른 이메일 주소를 입력해 주세요.',
    submit: '제일 먼저 써보기',
    submitting: '신청하는 중…',
    promise:
      '약속: 출시 알림 딱 한 통만 보내고 그 즉시 폐기해요. 스팸·마케팅엔 절대 쓰지 않습니다.',
    successTitle: '신청 완료! 출시되면 가장 먼저 써보실 수 있어요.',
    successDescription:
      '출시되는 날 이 주소로 제일 먼저 소식을 보내드릴게요. 알림을 보낸 뒤 이메일은 폐기합니다.',
    submitError: '잠시 문제가 생겼어요. 다시 시도해 주세요.',
    errorHelp: '계속 안 되면 {email}로 보내주시면 직접 등록해 드릴게요.',
    close: '닫기',
    closeAria: '닫기',
    mailtoSubject: 'Memsum 출시 알림 신청',
    mailtoBody: '출시되면 가장 먼저 써보고 싶어요.\n\n신청 이메일: {email}',
  },
};

const EN: LandingCopy = {
  isKorean: false,

  shots: {
    home: '/shots/home.en.png',
    report: '/shots/report.en.png',
  },

  meta: {
    titleDefault: "Memsum — Never miss what's in your screenshots",
    titleTemplate: '%s | Memsum',
    description:
      'Memsum reads the text in your screenshots, sorts them for you, drops events into your calendar, and hands your week back as a 5-line recap. Free to try.',
    ogTitle: 'Never miss it again. Memsum remembers for you.',
    ogDescription:
      'Memsum reads the text in your screenshots, sorts them for you, drops events into your calendar, and hands your week back as a 5-line recap. Free to try.',
    appJsonLdDescription:
      'Memsum reads the text in your screenshots, sorts them for you, drops events into your calendar, and hands your week back as a 5-line recap. Free to try.',
  },

  header: {
    privacy: 'Privacy',
    terms: 'Terms',
    getIt: 'Get it',
  },

  footer: {
    privacy: 'Privacy',
    terms: 'Terms',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    contact: 'Contact:',
  },

  langToggle: {
    ko: '한국어',
    en: 'English',
    ariaLabel: 'Change language',
  },

  hero: {
    eyebrow: 'Never miss it · Plans to calendar · Sunday 5 lines',
    h1Line1: "It's okay to forget.",
    h1Line2: '{site} remembers for you.',
    subLine1: 'Those screenshots piling up in your camera roll? Useful again.',
    subLine2:
      '{site} reads the text inside them, sorts them, adds events to your calendar, and hands your week back in 5 lines.',
    helper: 'Try it free, right now',
    scrollHint: "Here's how it works",
    reportAlt: 'Memsum weekly recap screen — this week’s 5 highlights shown in 5 lines',
    homeAlt: 'Memsum home screen — this week’s screenshots auto-sorted into cards',
  },

  problem: {
    title: 'How many screenshots are in your camera roll?',
    bodyLine1: 'Receipts, plans, coupons, that article you meant to read later…',
    bodyLine2: 'You keep taking them. You almost never look back.',
    counterIntro: "For some people, it's this many.",
    counterUnit: 'shots',
    counterClosing: 'And barely any, looked at twice.',
    quote: '“Why did I even screenshot all this?”',
    underQuote:
      "You've opened your gallery to clean it up, then closed it an hour later. We've all been there.",
    leadIn: "You've tried the note apps too. A month later, untouched.",
    coralUnderline: "It's not you. It's the tools that made you do the sorting.",
  },

  steps: {
    title: "It's this simple",
    items: [
      {
        title: 'Take it',
        body: 'Just take a screenshot like you always do. Nothing else to do.',
      },
      {
        title: 'Memsum reads it',
        body: 'It reads the text inside (OCR), adds a title and summary, and files it into one of six categories — automatically.',
      },
      {
        title: 'Sorted for you',
        body: 'Events go to your calendar, and your week comes back as a 5-line recap on Sunday evening. All you do is look it up later.',
      },
    ],
  },

  features: {
    sectionAria: 'Memsum features',
    phoneAlt: 'Memsum app screen — screenshots auto-sorted with titles and summaries',
    items: [
      {
        title: 'Reads the text in your screenshots',
        body: 'It pulls Korean and English text out of your images and turns it into something searchable. It even cleans up typos and line breaks so it reads nicely.',
      },
      {
        title: 'Titles, summaries, categories — automatic',
        body: 'Every screenshot gets a one-line title and a one-line summary, sorted automatically into six buckets — marketing, plans, receipts, shopping, info, and other — so it’s easy to find later.',
      },
      {
        title: 'Events into your calendar in one tap',
        body: 'It spots events in screenshots that have a date and time. One tap, whenever you want, adds them to Google Calendar. No more missed plans because you forgot to copy them over.',
      },
      {
        title: 'Sunday evening, your week in 5 lines',
        body: 'From everything you captured this week, it picks the 5 worth a second look and shows them in 5 lines — a quick look back at what you held onto.',
      },
      {
        title: 'Free to start, your data kept safe',
        body: 'Right now you can try every feature for free. Your Google Calendar connection stays on your device, and Memsum never reads your whole calendar.',
      },
    ],
  },

  appScreens: {
    title: 'Here’s what you’ll see',
    subtitle: 'Screenshots sorted, text read, your week in 5 lines.',
    items: [
      { src: '/store/device-home.png', alt: 'Memsum home screen — this week’s captures at a glance', caption: 'Home — this week at a glance' },
      { src: '/store/device-detail.png', alt: 'Memsum capture detail — recognized text and info', caption: 'Reads the text in your captures' },
      { src: '/store/device-report.png', alt: 'Memsum weekly report — this week’s top 5', caption: 'Sunday evening, your week in 5 lines' },
    ],
  },

  audience: {
    title: 'Memsum was made for people like you',
    items: [
      'People with hundreds, even thousands, of screenshots piling up',
      'People who reflexively screenshot good stuff from Instagram and YouTube',
      "People who snap plans, receipts, and info — then can't find them again",
      "People who'd rather not open a separate notes app",
    ],
    quoteHeadline: 'For everyone the note apps never quite fit.',
    quoteSub:
      "You don't want to build a sorting system. You just don't want to lose things.",
  },

  compare: {
    title: '“Don’t sort” — that’s our whole philosophy',
    otherHeader: 'Other tools',
    memsumHeader: 'Memsum',
    rows: [
      {
        label: 'Sorting',
        other: 'You build folders, tags, systems',
        memsum: 'Titles & categories, done for you',
      },
      {
        label: 'Korean text',
        other: 'Weak OCR, or none',
        memsum: 'Korean OCR + typo cleanup',
      },
      {
        label: 'Plans',
        other: 'Copy them over by hand',
        memsum: 'Screenshot → calendar, one tap',
      },
      {
        label: 'Looking back',
        other: 'You have to go dig',
        memsum: '5 lines, every Sunday',
      },
      {
        label: 'Getting started',
        other: 'Sign-up & onboarding',
        memsum: 'Free, right away',
      },
    ],
  },

  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Do you use my screenshots to train AI?',
        a: 'No. Your screenshots are only used to organize your own stuff.',
      },
      {
        q: 'Is it free?',
        a: 'Yes — right now you can try every feature for free. Go ahead and start, no pressure.',
      },
      {
        q: 'Do you read my whole calendar?',
        a: 'No. The calendar permission is only used to add events, and your connection token stays on your device.',
      },
      {
        q: 'Does OCR work with Korean?',
        a: 'Yes. It pulls out both Korean and English text, then tidies up typos and line breaks.',
      },
      {
        q: 'Which devices does it work on?',
        a: 'Android is available now on Google Play. iOS is on the way.',
        ctaLabel: 'Sign up for iOS launch alerts',
      },
    ],
  },

  founder: {
    name: 'Byungin Song',
    role: 'Solo founder · built Memsum',
    quote:
      "I used to have 1,800 screenshots piled up and still missed appointments. I needed something to remember for me — so I built Memsum myself.",
    photoAlt: 'Byungin Song, the person who made Memsum',
    contactCta: 'I reply directly',
  },

  testimonials: {
    title: "Things people almost missed — but didn't",
    exampleBadge: 'Experience example',
    items: [
      {
        quote:
          "I'd only captured the appointment message, and it showed up in my Sunday 5 — I actually made it to the doctor.",
        context: 'Doctor appointment · not added to calendar',
        isExample: true,
      },
      {
        quote:
          'I screenshotted a wedding invitation, and Memsum picked out the date and venue. One tap and it was in my calendar.',
        context: 'Wedding invitation · added to calendar',
        isExample: true,
      },
      {
        quote:
          "Found a discount code I'd saved six months ago with one search. Screenshots I'd only hoarded were suddenly useful.",
        context: 'Discount code · search feature',
        isExample: true,
      },
    ],
  },

  finalCta: {
    title: "It's okay to forget. Memsum will bring it back.",
    body: 'Just take the screenshot. Memsum does the rest.',
    helper: 'Free to start · Productivity',
  },

  storeBadge: {
    appstore: {
      top: 'Download on the',
      bottom: 'App Store',
      aria: 'Get notified at launch — App Store',
    },
    googleplay: {
      top: 'GET IT ON',
      bottom: 'Google Play',
      aria: 'Download on Google Play',
    },
    ribbon: 'Get notified',
    ribbonCompact: 'Notify',
  },

  notifyDialog: {
    openCta: 'Get notified at launch',
    formTitle: 'Be the first to use it',
    formDescription:
      "I built Memsum myself, and I'll personally email you the day it launches — just one email, nothing else.",
    emailLabel: 'Email address',
    validationError: 'Please enter a valid email address.',
    submit: 'Get early access',
    submitting: 'Submitting…',
    promise:
      'Our promise: just one launch email, then we delete your address. No spam, no marketing.',
    successTitle: "You're in! You'll be among the first to use Memsum.",
    successDescription:
      "We'll email this address the moment we launch — then delete it.",
    submitError: 'Something went wrong. Please try again.',
    errorHelp: "If it keeps failing, email {email} and we'll add you.",
    close: 'Close',
    closeAria: 'Close',
    mailtoSubject: 'Memsum launch notification request',
    mailtoBody:
      "I'd like to be first to use Memsum when it launches.\n\nMy email: {email}",
  },
};

export const LANDING_COPY: Record<Lang, LandingCopy> = {
  ko: KO,
  en: EN,
};

/** 로케일별 카피 묶음을 반환. */
export function getLandingCopy(lang: Lang): LandingCopy {
  return LANDING_COPY[lang];
}
