// 웹 미리보기(개발 전용) 예시 데이터.
//
// 목적: `expo start --web`으로 새 디자인을 눈으로 확인하고 스토어 스크린샷을 찍는다.
// 켜지는 조건: 웹 + 개발 빌드(__DEV__)일 때만. `?preview=0`이면 끈다.
// 네이티브 번들은 preview.ts(null)를 쓰므로 이 파일과 예시 문구는 앱에 들어가지 않는다.
//
// 쿼리 스위치(첫 로드 때만 읽는다):
//   ?onboarding=1        온보딩부터 시작(기본은 온보딩 완료 상태)
//   ?sheet=scan|result|notext|error   캡처 시트를 해당 상태로 띄운다
//   ?calendar=0          구글 캘린더 미연결 상태로 보기(기본은 연결됨)
//   ?preview=0           예시 데이터 끄기(실제 Supabase 설정을 그대로 사용)
//
// 사진은 번들 이미지 없이 SVG로 그린 "있을 법한 스크린샷"을 쓴다.

import type { CaptureEvent } from "@/features/capture/types";
import type { CaptureListItem } from "@/features/captures/types";
import type { CategoryGroup } from "@/features/home/types";
import type { ParcelTrack } from "@/features/parcel/types";
import type { WeeklyReport } from "@/features/report/types";
import type { CategoryKey } from "@/lib/categories";
import { getLocale } from "@/i18n";
import type { CaptureDraftWithBoxes } from "@/stores/capture-store";
import type { OcrBox } from "../../modules/vision-ocr";

import type { PreviewSource } from "./preview-types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** 홈 머리표에 보일 이번 주 캡처 수(예시 목록보다 많게 — 오래된 건 생략했다는 설정). */
const WEEK_COUNT = 38;
/** 기기 언어가 영어면 예시 데이터도 영어로(영문 스토어 스크린샷용). */
const EN = getLocale() === "en";

function readQuery(): URLSearchParams {
  try {
    return new URLSearchParams(globalThis.location?.search ?? "");
  } catch {
    return new URLSearchParams();
  }
}

// ── 시각 도우미 ──────────────────────────────────────────────────────────────

const now = new Date();

/** 오늘 0시 기준 days일 뒤 hh:mm(기기 시간대). */
function dayAt(days: number, hh: number, mm = 0): string {
  const d = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + days,
    hh,
    mm,
  );
  return d.toISOString();
}

function hoursAgo(h: number): string {
  return new Date(now.getTime() - h * HOUR_MS).toISOString();
}

function ymd(d: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ── 가짜 스크린샷(SVG) ───────────────────────────────────────────────────────

type ShotSpec = {
  bg: string;
  ink: string;
  bar?: string;
  barInk?: string;
  head?: string;
  lines: readonly string[];
  /** 본문 위에 깔 카드 색(말풍선·티켓 느낌). */
  card?: string;
};

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SHOT_W = 390;
const SHOT_H = 844;

/**
 * shot()이 그린 글자 줄의 대략적 위치(0~1, 좌상단 원점) — 스캔 연출 미리보기용.
 * shot()의 배치(본문 시작 y, 줄 간격 46, 글자 크기 24/18)를 그대로 따른다.
 */
function shotOcrBoxes({ head, lines }: ShotSpec): OcrBox[] {
  const top = head ? 150 : 70;
  return lines.map((line, i) => {
    const size = i === 0 ? 24 : 18;
    const baseline = top + i * 46;
    // 한글은 거의 정사각, 라틴·숫자는 폭이 절반 남짓 — 영어 예시에서 형광펜이 글자보다 길게 삐져나오지 않게.
    const em = [...line].reduce((sum, ch) => sum + (ch.charCodeAt(0) < 0x2000 ? 0.56 : 0.92), 0);
    const width = Math.min(em * size, SHOT_W - 80);
    return {
      x: 40 / SHOT_W,
      y: (baseline - size) / SHOT_H,
      width: width / SHOT_W,
      height: (size * 1.25) / SHOT_H,
    };
  });
}

/** 390×844 세로 스크린샷 한 장. 상태바 + 앱 바 + 본문 줄. */
function shot({ bg, ink, bar, barInk, head, lines, card }: ShotSpec): string {
  const W = SHOT_W;
  const H = SHOT_H;
  const font =
    "font-family='-apple-system, Pretendard, Apple SD Gothic Neo, sans-serif'";
  const parts: string[] = [
    `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'>`,
    `<rect width='${W}' height='${H}' fill='${bg}'/>`,
    `<text x='28' y='34' ${font} font-size='15' font-weight='600' fill='${barInk ?? ink}'>9:41</text>`,
  ];
  let y = 70;
  if (bar) {
    parts.push(`<rect y='0' width='${W}' height='112' fill='${bar}'/>`);
    parts.push(
      `<text x='28' y='34' ${font} font-size='15' font-weight='600' fill='${barInk ?? ink}'>9:41</text>`,
    );
  }
  if (head) {
    parts.push(
      `<text x='28' y='92' ${font} font-size='22' font-weight='700' fill='${barInk ?? ink}'>${escapeXml(head)}</text>`,
    );
    y = 150;
  }
  if (card) {
    parts.push(
      `<rect x='20' y='${y - 30}' width='${W - 40}' height='${lines.length * 46 + 36}' rx='18' fill='${card}'/>`,
    );
  }
  lines.forEach((line, i) => {
    const size = i === 0 ? 24 : 18;
    const weight = i === 0 ? 700 : 400;
    parts.push(
      `<text x='40' y='${y + i * 46}' ${font} font-size='${size}' font-weight='${weight}' fill='${ink}'>${escapeXml(line)}</text>`,
    );
  });
  // 아래쪽 흐린 본문 덩어리 — 실제 스크린샷처럼 보이게.
  const blockTop = y + lines.length * 46 + 60;
  for (let i = 0; i < 6; i += 1) {
    const w = [300, 260, 320, 210, 280, 180][i];
    parts.push(
      `<rect x='40' y='${blockTop + i * 34}' width='${w}' height='12' rx='6' fill='${ink}' opacity='0.12'/>`,
    );
  }
  parts.push("</svg>");
  return `data:image/svg+xml;utf8,${encodeURIComponent(parts.join(""))}`;
}

// ── 캡처 예시 ────────────────────────────────────────────────────────────────

type Seed = {
  id: string;
  title: string;
  summary: string;
  ocrText: string;
  createdAt: string;
  category: CategoryKey;
  event?: CaptureEvent;
  calendarAdded?: boolean;
  image: ShotSpec;
};

const SEEDS_KO: readonly Seed[] = [
  {
    id: "pv-wedding",
    title: "지민 ♥ 도윤 결혼식",
    summary:
      "토요일 낮 12시 30분, 달빛정원홀 3층 그랜드홀. 축의금 계좌는 신랑 측 안내 참고.",
    ocrText:
      "저희 두 사람이 사랑으로 하나 되는 날\n김도윤 · 이지민\n10월 10일 토요일 낮 12시 30분\n달빛정원홀 3층 그랜드홀\n서울 강남구 도화로 120\n마음 전하실 곳: 가온은행 110-482-*****",
    createdAt: hoursAgo(3),
    category: "event",
    event: {
      title: "지민 ♥ 도윤 결혼식",
      starts_at: dayAt(6, 12, 30),
      ends_at: dayAt(6, 14, 0),
      location: "달빛정원홀 3층 그랜드홀",
    },
    image: {
      bg: "#FBF7F0",
      ink: "#3B3128",
      lines: [
        "김도윤 · 이지민",
        "10월 10일 토요일 낮 12시 30분",
        "달빛정원홀 3층 그랜드홀",
        "서울 강남구 도화로 120",
      ],
    },
  },
  {
    id: "pv-coupang",
    title: "오늘배송 배송 출발",
    summary:
      "무선 청소기 필터 2개, 오늘 도착 예정. 한빛택배 운송장 6512-3478-9012.",
    ocrText:
      "[Web발신]\n[오늘배송] 주문하신 상품이 배송을 시작했어요.\n상품: 무선 청소기 교체용 필터 2개\n한빛택배 운송장번호 651234789012\n오늘 도착 예정",
    createdAt: hoursAgo(5),
    category: "shopping",
    image: {
      bg: "#FFFFFF",
      ink: "#1F2329",
      bar: "#F2F3F5",
      head: "오늘배송",
      card: "#E9EBEF",
      lines: [
        "[오늘배송] 배송 시작",
        "무선 청소기 필터 2개",
        "한빛택배 651234789012",
        "오늘 도착 예정",
      ],
    },
  },
  {
    id: "pv-dinner",
    title: "을지로 돌담식당 예약 확정",
    summary: "내일 저녁 7시, 4명. 10분 이상 늦으면 자동 취소돼요.",
    ocrText:
      "예약이 확정되었습니다\n돌담식당 을지로점\n일시: 내일 오후 7:00\n인원: 4명\n10분 이상 지각 시 예약이 자동 취소됩니다.",
    createdAt: hoursAgo(20),
    category: "event",
    event: {
      title: "돌담식당 저녁 예약 (4명)",
      starts_at: dayAt(1, 19, 0),
      ends_at: null,
      location: "돌담식당 을지로점",
    },
    image: {
      bg: "#FFFFFF",
      ink: "#1E1E1E",
      bar: "#1F6F50",
      barInk: "#FFFFFF",
      head: "예약 확정",
      lines: [
        "돌담식당 을지로점",
        "내일 오후 7:00 · 4명",
        "10분 지각 시 자동 취소",
      ],
    },
  },
  {
    id: "pv-dentist",
    title: "맑은미소치과 스케일링",
    summary: "화요일 오전 10시 30분 예약. 변경은 하루 전까지 전화로.",
    ocrText:
      "[맑은미소치과] 이수현님 10/06(화) 오전 10:30 스케일링 예약되었습니다. 변경·취소는 하루 전까지 02-555-0192로 연락 주세요.",
    createdAt: hoursAgo(30),
    category: "event",
    calendarAdded: true,
    event: {
      title: "맑은미소치과 스케일링",
      starts_at: dayAt(2, 10, 30),
      ends_at: dayAt(2, 11, 0),
      location: "맑은미소치과",
    },
    image: {
      bg: "#FFFFFF",
      ink: "#1F2329",
      bar: "#F2F3F5",
      head: "맑은미소치과",
      card: "#E9EBEF",
      lines: ["10/06(화) 오전 10:30", "스케일링 예약", "변경은 하루 전까지"],
    },
  },
  {
    id: "pv-exhibit",
    title: "가람미술관 전시 예매",
    summary: "어제 오후 2시 입장권 2매. 모바일 티켓으로 입장.",
    ocrText:
      "예매 완료\n올해의 작가상 2026\n가람미술관 서울\n어제 14:00 입장 · 2매\n모바일 티켓을 입구에서 보여 주세요",
    createdAt: hoursAgo(54),
    category: "event",
    event: {
      title: "올해의 작가상 2026 관람",
      starts_at: dayAt(-1, 14, 0),
      ends_at: null,
      location: "가람미술관 서울",
    },
    image: {
      bg: "#111111",
      ink: "#F5F5F5",
      head: "모바일 티켓",
      lines: ["올해의 작가상 2026", "가람미술관 서울", "14:00 입장 · 2매"],
    },
  },
  {
    id: "pv-coupon",
    title: "온새미로 가을 세일 20% 쿠폰",
    summary: "10월 12일까지, 5만 원 이상 구매 시. 앱 쿠폰함에 자동 지급.",
    ocrText:
      "가을 세일 20% 쿠폰\n5만 원 이상 구매 시 최대 2만 원 할인\n사용 기한 10월 12일 23:59\n쿠폰함에 자동 지급",
    createdAt: hoursAgo(60),
    category: "marketing",
    image: {
      bg: "#000000",
      ink: "#FFFFFF",
      lines: [
        "가을 세일 20% 쿠폰",
        "5만 원 이상 최대 2만 원",
        "~ 10월 12일 23:59",
      ],
    },
  },
  {
    id: "pv-wifi",
    title: "6층 회의실 와이파이",
    summary: "MEETING-6F, 비밀번호는 원문에서 확인.",
    ocrText:
      "Wi-Fi\n네트워크: MEETING-6F\n비밀번호: autumn-2026!\n게스트용은 GUEST-6F",
    createdAt: hoursAgo(76),
    category: "info",
    image: {
      bg: "#F4F6FA",
      ink: "#1B2430",
      card: "#FFFFFF",
      lines: ["MEETING-6F", "비밀번호 autumn-2026!", "게스트용 GUEST-6F"],
    },
  },
  {
    id: "pv-article",
    title: "회의를 절반으로 줄이는 방법",
    summary: "안건 없는 회의는 받지 않기, 25분 기본값, 결론을 먼저 쓰기.",
    ocrText:
      "회의를 절반으로 줄이는 방법\n1. 안건 없는 초대는 받지 않는다\n2. 기본 길이를 25분으로\n3. 결론을 먼저 문서로 쓴다",
    createdAt: hoursAgo(90),
    category: "info",
    image: {
      bg: "#FFFFFF",
      ink: "#202124",
      lines: [
        "회의를 절반으로",
        "줄이는 방법",
        "1. 안건 없는 초대는 거절",
        "2. 기본 25분",
      ],
    },
  },
  {
    id: "pv-receipt",
    title: "하루로스터스 성수 영수증",
    summary: "카페라테 2, 스콘 1 — 합계 17,300원. 법인카드.",
    ocrText:
      "하루로스터스 성수\n카페 라테 x2 13,000\n스콘 x1 4,300\n합계 17,300원\n법인카드 승인",
    createdAt: hoursAgo(100),
    category: "receipt",
    image: {
      bg: "#FAFAFA",
      ink: "#222222",
      card: "#FFFFFF",
      lines: [
        "하루로스터스 성수",
        "카페 라테 x2  13,000",
        "스콘 x1  4,300",
        "합계 17,300원",
      ],
    },
  },
  {
    id: "pv-flight",
    title: "하늘항공 김포→제주 탑승권",
    summary: "다음 주 금요일 오전 8시 10분 출발, HN 113편.",
    ocrText:
      "모바일 탑승권\nHN 113 김포 → 제주\n08:10 출발 · 게이트 12\n좌석 14C",
    createdAt: hoursAgo(120),
    category: "event",
    event: {
      title: "HN 113 김포 → 제주",
      starts_at: dayAt(12, 8, 10),
      ends_at: dayAt(12, 9, 20),
      location: "김포공항 국내선",
    },
    image: {
      bg: "#2A5BD7",
      ink: "#FFFFFF",
      head: "모바일 탑승권",
      lines: ["HN 113", "김포 → 제주", "08:10 · 게이트 12 · 14C"],
    },
  },
  {
    id: "pv-recipe",
    title: "들기름 막국수 레시피",
    summary: "메밀면 삶아 찬물에 헹구고, 들기름·간장·김가루.",
    ocrText:
      "들기름 막국수\n메밀면 1인분\n들기름 2큰술, 간장 1큰술, 설탕 약간\n김가루·깨 듬뿍",
    createdAt: hoursAgo(130),
    category: "etc",
    image: {
      bg: "#FFF8EC",
      ink: "#3A2A12",
      lines: [
        "들기름 막국수",
        "메밀면 1인분",
        "들기름 2 · 간장 1",
        "김가루 · 깨 듬뿍",
      ],
    },
  },
  {
    id: "pv-fee",
    title: "독서모임 10월 회비",
    summary: "1인 2만 원, 금요일까지 새봄뱅크 모임통장으로.",
    ocrText:
      "10월 독서모임 회비 안내\n1인 20,000원\n새봄뱅크 3333-**-*******\n금요일까지 부탁드려요",
    createdAt: hoursAgo(140),
    category: "etc",
    image: {
      bg: "#CBD5E1",
      ink: "#1B1B1B",
      card: "#FFFFFF",
      lines: ["10월 회비 안내", "1인 20,000원", "금요일까지 부탁드려요"],
    },
  },
];

// 영어 화면용 — 같은 id·날짜·분류, 문구와 그림만 현지화. 실존 상호는 피한다.
const SEEDS_EN: readonly Seed[] = [
  {
    id: "pv-wedding",
    title: "Mia & Daniel’s wedding",
    summary:
      "Saturday 12:30 PM, The Chapel Hall, 3rd floor. RSVP details are in the original.",
    ocrText:
      "Together with their families\nDaniel Kim & Mia Lee\nSaturday, October 10 at 12:30 PM\nThe Chapel Hall, 3rd floor\n1200 Harbor Ave, Brooklyn\nKindly RSVP by October 3",
    createdAt: hoursAgo(3),
    category: "event",
    event: {
      title: "Mia & Daniel’s wedding",
      starts_at: dayAt(6, 12, 30),
      ends_at: dayAt(6, 14, 0),
      location: "The Chapel Hall, 3rd floor",
    },
    image: {
      bg: "#FBF7F0",
      ink: "#3B3128",
      lines: [
        "Daniel Kim & Mia Lee",
        "Saturday, October 10 · 12:30 PM",
        "The Chapel Hall, 3rd floor",
        "1200 Harbor Ave, Brooklyn",
      ],
    },
  },
  {
    id: "pv-coupang",
    title: "Order shipped: vacuum filters",
    summary: "Replacement filters, 2-pack. Arriving today.",
    ocrText:
      "Your order has shipped\nVacuum replacement filter, 2-pack\nArriving today by 8 PM",
    createdAt: hoursAgo(5),
    category: "shopping",
    image: {
      bg: "#FFFFFF",
      ink: "#1F2329",
      bar: "#F2F3F5",
      head: "Messages",
      card: "#E9EBEF",
      lines: [
        "Your order has shipped",
        "Vacuum filter, 2-pack",
        "Arriving today by 8 PM",
      ],
    },
  },
  {
    id: "pv-dinner",
    title: "Dinner at Juniper Kitchen",
    summary: "Tomorrow 7 PM, party of 4. The table is held for 15 minutes.",
    ocrText:
      "Your reservation is confirmed\nJuniper Kitchen\nTomorrow at 7:00 PM\nParty of 4\nWe hold tables for 15 minutes.",
    createdAt: hoursAgo(20),
    category: "event",
    event: {
      title: "Dinner at Juniper Kitchen (4)",
      starts_at: dayAt(1, 19, 0),
      ends_at: null,
      location: "Juniper Kitchen",
    },
    image: {
      bg: "#FFFFFF",
      ink: "#1E1E1E",
      bar: "#1F6F50",
      barInk: "#FFFFFF",
      head: "Confirmed",
      lines: [
        "Juniper Kitchen",
        "Tomorrow 7:00 PM · 4 people",
        "Table held for 15 min",
      ],
    },
  },
  {
    id: "pv-dentist",
    title: "Dental cleaning",
    summary: "Tuesday 10:30 AM. Reschedule at least a day ahead.",
    ocrText:
      "Bright Smile Dental: Hi Sarah, your cleaning is booked for Tue 10/6 at 10:30 AM. To reschedule, call at least 24 hours ahead.",
    createdAt: hoursAgo(30),
    category: "event",
    calendarAdded: true,
    event: {
      title: "Dental cleaning",
      starts_at: dayAt(2, 10, 30),
      ends_at: dayAt(2, 11, 0),
      location: "Bright Smile Dental",
    },
    image: {
      bg: "#FFFFFF",
      ink: "#1F2329",
      bar: "#F2F3F5",
      head: "Bright Smile Dental",
      card: "#E9EBEF",
      lines: [
        "Tue 10/6 · 10:30 AM",
        "Cleaning appointment",
        "Reschedule 24h ahead",
      ],
    },
  },
  {
    id: "pv-exhibit",
    title: "Museum tickets: Modern Light",
    summary: "Yesterday 2 PM, 2 tickets. Show the mobile ticket at the door.",
    ocrText:
      "Tickets confirmed\nModern Light 2026\nCity Museum of Art\nYesterday 2:00 PM entry · 2 tickets\nShow this ticket at the entrance",
    createdAt: hoursAgo(54),
    category: "event",
    event: {
      title: "Modern Light 2026",
      starts_at: dayAt(-1, 14, 0),
      ends_at: null,
      location: "City Museum of Art",
    },
    image: {
      bg: "#111111",
      ink: "#F5F5F5",
      head: "Mobile ticket",
      lines: [
        "Modern Light 2026",
        "City Museum of Art",
        "2:00 PM entry · 2 tickets",
      ],
    },
  },
  {
    id: "pv-coupon",
    title: "Fall sale: 20% off coupon",
    summary:
      "Valid through October 12 on orders over $50. Already in your coupon wallet.",
    ocrText:
      "Fall sale 20% off\nOrders over $50, up to $20 off\nValid through October 12, 11:59 PM\nAdded to your coupon wallet",
    createdAt: hoursAgo(60),
    category: "marketing",
    image: {
      bg: "#000000",
      ink: "#FFFFFF",
      lines: [
        "Fall sale 20% off",
        "Orders over $50, up to $20",
        "Ends Oct 12, 11:59 PM",
      ],
    },
  },
  {
    id: "pv-wifi",
    title: "Wi-Fi, 6th floor meeting room",
    summary: "MEETING-6F. The password is in the original.",
    ocrText:
      "Wi-Fi\nNetwork: MEETING-6F\nPassword: autumn-2026!\nGuests: GUEST-6F",
    createdAt: hoursAgo(76),
    category: "info",
    image: {
      bg: "#F4F6FA",
      ink: "#1B2430",
      card: "#FFFFFF",
      lines: ["MEETING-6F", "Password autumn-2026!", "Guests: GUEST-6F"],
    },
  },
  {
    id: "pv-article",
    title: "How to cut your meetings in half",
    summary:
      "Decline invites with no agenda, default to 25 minutes, write the decision first.",
    ocrText:
      "How to cut your meetings in half\n1. No agenda, no invite\n2. Default to 25 minutes\n3. Write the decision down first",
    createdAt: hoursAgo(90),
    category: "info",
    image: {
      bg: "#FFFFFF",
      ink: "#202124",
      lines: [
        "How to cut your",
        "meetings in half",
        "1. No agenda, no invite",
        "2. Default to 25 min",
      ],
    },
  },
  {
    id: "pv-receipt",
    title: "Harbor Roasters receipt",
    summary: "2 lattes, 1 scone. Total $17.30 on the company card.",
    ocrText:
      "Harbor Roasters\nLatte x2 $11.00\nScone x1 $6.30\nTotal $17.30\nCompany card approved",
    createdAt: hoursAgo(100),
    category: "receipt",
    image: {
      bg: "#FAFAFA",
      ink: "#222222",
      card: "#FFFFFF",
      lines: [
        "Harbor Roasters",
        "Latte x2  $11.00",
        "Scone x1  $6.30",
        "Total $17.30",
      ],
    },
  },
  {
    id: "pv-flight",
    title: "Boarding pass, SFO → SEA",
    summary: "Next Friday, departs 8:10 AM. Gate 12, seat 14C.",
    ocrText:
      "Mobile boarding pass\nCL 113 SFO → SEA\nDeparts 8:10 AM · Gate 12\nSeat 14C",
    createdAt: hoursAgo(120),
    category: "event",
    event: {
      title: "Flight CL 113 SFO → SEA",
      starts_at: dayAt(12, 8, 10),
      ends_at: dayAt(12, 10, 20),
      location: "SFO Terminal 2",
    },
    image: {
      bg: "#2A5BD7",
      ink: "#FFFFFF",
      head: "Boarding pass",
      lines: ["CL 113", "SFO → SEA", "8:10 AM · Gate 12 · 14C"],
    },
  },
  {
    id: "pv-recipe",
    title: "Sesame soba noodles",
    summary:
      "Cook soba, rinse in cold water, toss with sesame oil, soy sauce and seaweed.",
    ocrText:
      "Sesame soba\nSoba noodles, 1 serving\n2 tbsp sesame oil, 1 tbsp soy sauce\nShredded seaweed, sesame seeds",
    createdAt: hoursAgo(130),
    category: "etc",
    image: {
      bg: "#FFF8EC",
      ink: "#3A2A12",
      lines: [
        "Sesame soba",
        "Soba, 1 serving",
        "Sesame oil 2 · soy 1",
        "Seaweed · sesame seeds",
      ],
    },
  },
  {
    id: "pv-fee",
    title: "Book club dues for October",
    summary: "$20 each, please send by Friday.",
    ocrText: "October book club dues\n$20 each\nPlease send by Friday",
    createdAt: hoursAgo(140),
    category: "etc",
    image: {
      bg: "#CBD5E1",
      ink: "#1B1B1B",
      card: "#FFFFFF",
      lines: ["October dues", "$20 each", "Please send by Friday"],
    },
  },
];

const SEEDS: readonly Seed[] = EN ? SEEDS_EN : SEEDS_KO;

function toItem(seed: Seed): CaptureListItem {
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    ocrText: seed.ocrText,
    createdAt: seed.createdAt,
    thumbnailUrl: shot(seed.image),
    imagePath: null,
    hasEvent: Boolean(seed.event),
    event: seed.event ?? null,
    status: seed.calendarAdded ? "calendar_added" : "ocr_done",
    category: seed.category,
    calendarEventId: seed.calendarAdded ? `pv-cal-${seed.id}` : null,
    calendarHtmlLink: null,
  };
}

const captures = SEEDS.map(toItem);

function groupsOf(items: readonly CaptureListItem[]): CategoryGroup[] {
  const counts = new Map<CategoryKey, number>();
  items.forEach((i) =>
    counts.set(i.category, (counts.get(i.category) ?? 0) + 1),
  );
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

// ── 5줄 리포트 ───────────────────────────────────────────────────────────────

function buildReport(): WeeklyReport {
  const day = now.getDay();
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (day === 0 ? 6 : day - 1),
  );
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const pick = (id: string): CaptureListItem =>
    captures.find((c) => c.id === id) ?? captures[0];
  const lines: { id: string; title: string; summary: string }[] = EN
    ? [
        {
          id: "pv-wedding",
          title: "Sat 12:30 Mia & Daniel’s wedding",
          summary:
            "The Chapel Hall, 3rd floor. RSVP details are in the original.",
        },
        {
          id: "pv-dinner",
          title: "Tomorrow 7 PM, Juniper Kitchen for 4",
          summary: "The table is held for 15 minutes.",
        },
        {
          id: "pv-dentist",
          title: "Tue 10:30 dental cleaning",
          summary: "Reschedule at least a day ahead.",
        },
        {
          id: "pv-coupon",
          title: "Sale coupon, ends Oct 12",
          summary: "Up to $20 off orders over $50.",
        },
        {
          id: "pv-article",
          title: "The meetings article you saved",
          summary: "No agenda, no invite. Default to 25 minutes.",
        },
      ]
    : [
        {
          id: "pv-wedding",
          title: "토요일 12:30 지민·도윤 결혼식",
          summary: "달빛정원홀 3층. 축의금 계좌는 원본에 있어요.",
        },
        {
          id: "pv-dinner",
          title: "내일 19:00 돌담식당 4명",
          summary: "10분 넘게 늦으면 자동 취소돼요.",
        },
        {
          id: "pv-dentist",
          title: "화요일 10:30 치과 스케일링",
          summary: "변경은 하루 전까지 전화로.",
        },
        {
          id: "pv-coupon",
          title: "세일 쿠폰 10/12까지",
          summary: "5만 원 이상 사면 최대 2만 원 할인.",
        },
        {
          id: "pv-article",
          title: "읽으려던 회의 줄이기 글",
          summary: "안건 없는 초대 거절, 기본 25분.",
        },
      ];
  return {
    weekStart: ymd(monday),
    weekEnd: ymd(sunday),
    totalCaptures: WEEK_COUNT,
    items: lines.map((line, i) => {
      const c = pick(line.id);
      return {
        captureId: c.id,
        rank: i + 1,
        title: line.title,
        summary: line.summary,
        imagePath: null,
        thumbnailUrl: c.thumbnailUrl,
        feedback: null,
      };
    }),
  };
}

// ── 택배 ─────────────────────────────────────────────────────────────────────

function stamp(iso: string): string {
  const d = new Date(iso);
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${ymd(d)} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function buildParcels(): ParcelTrack[] {
  const events = [
    {
      level: 2,
      kind: "집화처리",
      where: "이천MP",
      timeString: stamp(dayAt(-1, 18, 42)),
    },
    {
      level: 3,
      kind: "간선상차",
      where: "곤지암Hub",
      timeString: stamp(dayAt(-1, 23, 5)),
    },
    {
      level: 4,
      kind: "배송지 도착",
      where: "서울성동",
      timeString: stamp(dayAt(0, 6, 31)),
    },
    {
      level: 5,
      kind: "배송출발",
      where: "서울성동 성수2가",
      timeString: stamp(dayAt(0, 8, 12)),
    },
  ];
  return [
    {
      id: "pv-parcel-1",
      captureId: "pv-coupang",
      carrierCode: "04",
      carrierName: "한빛택배",
      invoiceNo: "651234789012",
      level: 5,
      statusText: "배송출발",
      lastWhere: "서울성동 성수2가",
      estimate: "14~16시",
      events,
      lastEventAt: dayAt(0, 8, 12),
      lastCheckedAt: hoursAgo(0.5),
      deliveredAt: null,
      state: "active",
      notifiedOutForDelivery: true,
      notifiedDelivered: false,
      createdAt: hoursAgo(5),
    },
  ];
}

// ── 캡처 시트 ────────────────────────────────────────────────────────────────

function buildSheetDraft(kind: string | null): CaptureDraftWithBoxes | null {
  if (!kind) return null;
  const seed = SEEDS[0];
  const base: CaptureDraftWithBoxes = {
    id: "pv-sheet",
    sourcePlatform: "ios",
    imageUri: shot(seed.image),
    stage: "processing",
  };
  // 글자를 찾은 상태(scan·result)에만 상자를 싣는다.
  const ocrBoxes = shotOcrBoxes(seed.image);
  switch (kind) {
    case "scan":
      return { ...base, ocrBoxes };
    case "notext":
      return { ...base, stage: "error", errorCode: "noText" };
    case "error":
      return { ...base, stage: "error", errorCode: "generic" };
    case "result":
      return {
        ...base,
        stage: "done",
        ocrText: seed.ocrText,
        ocrBoxes,
        result: {
          capture_id: seed.id,
          clean_text: seed.ocrText,
          title: seed.title,
          summary: seed.summary,
          event: seed.event ?? null,
        },
      };
    default:
      return null;
  }
}

// ── 영속 상태 미리 채우기 ────────────────────────────────────────────────────

/**
 * 스토어가 AsyncStorage(웹 = localStorage)에서 복원되기 전에 값을 넣어 둔다.
 * 온보딩 완료 여부·택배 추적 켜짐·호칭을 예시 상태로 맞춘다.
 */
function seedPersisted(onboarding: boolean): void {
  const merge = (key: string, patch: Record<string, unknown>): void => {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      const parsed = raw
        ? (JSON.parse(raw) as {
            state?: Record<string, unknown>;
            version?: number;
          })
        : {};
      const next = {
        state: { ...(parsed.state ?? {}), ...patch },
        version: parsed.version ?? 0,
      };
      globalThis.localStorage?.setItem(key, JSON.stringify(next));
    } catch {
      // 저장소를 못 쓰면 기본값으로 진행한다.
    }
  };
  merge("memsum-onboarding", {
    completed: !onboarding,
    reportCoachmarkSeen: true,
  });
  // 택배 조회는 국내 택배사만 지원 — 영어 화면에는 택배를 보이지 않는다.
  merge("memsum-settings", {
    nickname: EN ? "Sarah" : "수현",
    parcelTracking: !EN,
    parcelOnboarded: true,
  });
}

function create(): PreviewSource | null {
  const query = readQuery();
  if (query.get("preview") === "0") return null;
  seedPersisted(query.get("onboarding") === "1");
  return {
    captures,
    categoryGroups: groupsOf(captures),
    weekCount: WEEK_COUNT,
    report: buildReport(),
    parcels: EN ? [] : buildParcels(),
    calendarEmail:
      query.get("calendar") === "0"
        ? null
        : EN
          ? "sarah.kim@example.com"
          : "suhyun.lee@example.com",
    sheetDraft: buildSheetDraft(query.get("sheet")),
  };
}

/** 웹 + 개발 빌드에서만 예시 데이터. 웹 출시 빌드(__DEV__ = false)에서는 null. */
export const preview: PreviewSource | null = __DEV__ ? create() : null;
