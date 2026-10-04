# Paywall 설계 스펙 — 검증 후 도입 준비

> **이 문서는 "지금 당장 유료화"가 아니라, 사용 검증 후 도입할 페이월·프라이싱을 설계·준비하는 문서입니다.**  
> 실제 결제 활성화는 활성 사용자/리텐션 지표 확인 후 별도 릴리스로 게이트됩니다.  
> 관련 이슈: [#7 가격·페이월 설계](https://github.com/byunginhb/memsum/issues/7)

---

## 1. 페이월 노출 트리거 — "첫 구해줌"

### 정의

페이월은 **"첫 구해줌(미스 방지) 1회 체험 이후"에만 노출**합니다.  
사용자가 가치를 먼저 경험한 뒤에 지갑을 열 수 있게 합니다.  
(근거: 최가영 인터뷰 "처음부터 돈 내라 하면 안 깔아요", 지유 인터뷰 "무료로 써보고 나서")

### 후보 트리거 이벤트 (둘 중 하나 먼저 충족되면 발동)

| 우선순위 | 이벤트 | 설명 | 코드 훅 위치 |
|---------|--------|------|-------------|
| **1순위** | **첫 캘린더 등록 성공** | 스크린샷에서 감지된 일정이 구글 캘린더에 처음 등록될 때 | `src/stores/calendar-store.ts` — `registerToCalendar()` 성공 분기 끝 |
| **2순위** | **첫 주간 리포트 수령** | 리포트 항목이 1개 이상인 주간 리포트를 처음 열 때 | `src/features/report/WeeklyReportScreen.tsx` — `useEffect([report])` 내 `track(ReportViewed)` 호출 직후 |

### 트리거 발동 조건 (AND)

- 사용자가 아직 페이월을 한 번도 본 적 없음 (`onboarding-store` 또는 `settings-store`에 `paywallShown: boolean` 플래그 추가 예정)
- 결제 상태가 "비구독" 상태임 (도입 시 구독 스토어에서 판별)

### 코드 훅 위치 상세

```typescript
// src/stores/calendar-store.ts — registerToCalendar() 성공 후 (도입 시 추가)
// 현재 위치: registerToCalendar async 함수 내 set({ items: updated }) 직후
// TODO(paywall-activate):
//   if (!subscriptionStore.isSubscribed && !settingsStore.paywallShown) {
//     router.push('/paywall');
//     settingsStore.setPaywallShown(true);
//   }

// src/features/report/WeeklyReportScreen.tsx — useEffect([report]) 내 (도입 시 추가)
// 현재 위치: track(AnalyticsEvent.ReportViewed, ...) 호출 직후
// TODO(paywall-activate):
//   if (report.items.length > 0 && !subscriptionStore.isSubscribed && !settingsStore.paywallShown) {
//     // 리포트 UX 충분히 본 뒤(타이머 또는 스크롤 인터랙션 후) 노출 권장
//     settingsStore.setPaywallShown(true);
//     router.push('/paywall');
//   }
```

---

## 2. 플랜 구조

### 원칙

- **연간 일시납을 기본(디폴트) 강조** — 두 페르소나 모두 월간 거부(최가영·지유 인터뷰)
- **월간은 앵커/보조** — 연간의 가치를 높이기 위한 비교 기준으로만 노출
- **가격 앵커: "커피 한 잔 이하"** — "하루 X원" 카피로 연간 가격을 재구성

### 예시 가격 (검증 후 확정, 출시 전 A/B 테스트 권장)

| 플랜 | 가격 | "하루" 환산 | 카피 방향 |
|------|------|------------|----------|
| 연간 | ₩5,900 / 년 | ≈ ₩16 / 일 | "하루 16원 — 커피 한 잔보다 싸게" |
| 월간 (앵커) | ₩990 / 월 | ₩33 / 일 | 연간 대비 2배 비쌈을 직관적으로 보여줌 |

> **가격 앵커 카피 방향**: "1년 = 커피 한 잔" 프레임. 지유 인터뷰 "커피값은 내요" 직결.

---

## 3. 무료 vs 유료 경계표

> **핵심 원칙**: 원가 0에 가까운 특성상 **핵심 기능 인질화 금지**.  
> 무료 티어에서 핵심 정리·미스방지 기능을 유지하고, 유료는 **부가 가치**만.

### 무료 (영구 무료 유지)

| 기능 | 설명 |
|------|------|
| 스크린샷 자동 정리 | OCR + GPT 분류, 제한 없음 |
| 캘린더 자동 등록 | 일정 감지 → 구글 캘린더 연동 |
| 주간 5줄 리포트 | 매주 일요일 핵심 5개 리마인드 |
| 검색 | 캡처 전문 검색 |
| 택배 추적 | 배송 상태 추적 |

### 유료 (프리미엄 — 부가 가치 중심)

| 기능 | 설명 | 가치 축 |
|------|------|---------|
| **자녀·가정 일정 알림** | 학교 준비물·가정 일정 전용 감지·알림 | 자녀/양육자 스토리 |
| 심화 월간 리포트 | 월간 인사이트 + 카테고리 트렌드 | 정보 가치 |
| 기기 여러 대 동기화 | 폰+태블릿 공유 | 편의 가치 |

> **횟수·저장 제한을 유료 경계로 두지 않는 이유**: 서버 비용이 사실상 0에 가까워 제한 명분이 없음.  
> 제한을 도입하면 "무료로 다 쓰다가 갑자기 막힘" 저항감을 유발해 브랜드 신뢰를 해침.

---

## 4. 자녀·가정 가치 스토리 (페이월 카피 축)

지유 인터뷰: **"'애 준비물 안 놓치게 해주는 앱'이면 커피값은 내요."**

이 감정 축을 페이월 헤드라인과 프리미엄 기능 설명에 적용합니다.

### 페이월 헤드라인 방향

```
아이, 약속, 영수증
한 번도 안 놓치게
```

### 프리미엄 기능 서브카피 방향

- "학교 준비물, 병원 예약, 학원 일정 — 모두 감지해 미리 알려드려요"
- "가족의 일정을 모두 대신 기억해요"

### 유료 전환 감정 트리거 순서

1. **인식**: "Memsum이 이미 내 약속을 구해줬다" (첫 구해줌 체험)
2. **공감**: "우리 아이 준비물도 놓치지 않을 수 있다" (자녀·가정 기능 발견)
3. **결단**: "커피 한 잔 값 — 연간으로 한 번만" (가격 앵커)

---

## 5. "무료" 카피 전환 계획

**이번 이슈에서는 변경하지 않습니다.** 유료화 시점에 아래 표를 따라 교체합니다.

### 변경 대상 위치 및 매핑

| 파일 | 위치 | 현재 카피 (ko) | 유료화 시 변경 카피 (ko) |
|------|------|--------------|----------------------|
| `memsum-web/src/lib/landing-copy.ts` | L225 | "지금 무료로 이용해보세요" | "무료로 시작해보세요" (티어 구조 명시) |
| `memsum-web/src/lib/landing-copy.ts` | L283 | "무료로 시작, 정보는 안전하게" | "핵심 기능 무료, 가족 기능은 프리미엄" |
| `memsum-web/src/lib/landing-copy.ts` | L284 | "지금은 무료로 모든 기능을 써볼 수 있어요…" | "핵심 정리·캘린더·주간리포트는 영구 무료예요" |
| `memsum-web/src/lib/landing-copy.ts` | L353~354 | FAQ "무료인가요? → 네, 지금은 무료로 모든 기능을…" | "핵심 기능은 무료예요. 자녀·가정 기능은 프리미엄 플랜에 있어요." |
| `memsum-web/src/lib/landing-copy.ts` | L374 | "지금 무료로 시작 · 생산성 카테고리" | "무료로 시작 · 핵심 기능 영구 무료" |
| `memsum-web/src/lib/landing-copy.ts` | L484 (en) | "Try it free" | "Start free" |
| `memsum-web/src/lib/landing-copy.ts` | L543~544 (en) | "Free to start…" | "Core features free forever…" |
| `memsum-web/src/lib/landing-copy.ts` | L613~614 (en) | FAQ "Free? → Yes, all features…" | "Core features are free. Family features need Premium." |
| `memsum-web/src/lib/landing-copy.ts` | L634 (en) | "Try free now" | "Start free" |
| `docs/store/play-console-fill.md` | "무료 또는 유료 = 무료" | — | "무료 또는 유료 = 유료(인앱 구매)" + "디지털 구매(IAP) = 있음" |
| `docs/store/listing.ko.md` | 무료 강조 카피 | 전면 무료 | 핵심 무료 / 프리미엄 부가 가치 구조로 |
| `docs/store/listing.en.md` | Free emphasis | "Free for all" | "Core free / Premium add-ons" |
| `memsum-web/src/components/landing/Faq.tsx` | FAQ 컴포넌트 렌더 | 무료 FAQ | 티어 FAQ로 교체 |
| `docs/store/data-safety-and-privacy.md` | 1-B L63 | "금융/결제 정보 = No" | "금융/결제 정보 = Yes (구매 내역)" |

---

## 6. 결제 구현 체크리스트 (검증 후 별도 릴리스)

> 이 체크리스트는 **사용 검증 완료 후** 별도 이슈로 진행합니다.

### 의존성·네이티브 빌드

- [ ] `pnpm add react-native-iap` (CLAUDE.md §2 계획과 일치)
- [ ] `npx expo prebuild --clean` 후 iOS/Android 폴더 재커밋 필수

### iOS 설정

- [ ] StoreKit 상품 ID 정의 (예: `com.memsum.premium.annual`, `com.memsum.premium.monthly`)
- [ ] `Info.plist` SKPaymentQueue 설정
- [ ] Sandbox 테스트 계정으로 구매 시뮬레이션

### Android 설정

- [ ] Google Play Billing 상품 ID 정의
- [ ] `build.gradle` Billing Library 의존성 확인

### 구독 상태 관리

- [ ] `src/stores/subscription-store.ts` 신규 생성 (Zustand)
  - `isSubscribed: boolean`
  - `plan: 'annual' | 'monthly' | null`
  - `expiresAt: string | null`
- [ ] `settings-store.ts`에 `paywallShown: boolean` 플래그 추가

### 서버 영수증 검증 (클라이언트 신뢰 금지)

- [ ] `supabase/functions/verify-purchase/index.ts` 신규 생성
  - iOS: Apple `/verifyReceipt` 또는 App Store Server API
  - Android: Google Play Developer API `purchases.subscriptions.get`
  - 검증 결과를 `user_subscriptions` 테이블에 저장 (RLS 필수)
- [ ] `supabase/migrations/YYYYMMDDHHMMSS_add_subscriptions.sql` 마이그레이션

### 페이월 라우팅 활성화

- [ ] `src/app/paywall.tsx` 신규 생성 (현재 미연결)
  ```tsx
  import { PaywallScreen } from '@/features/paywall/PaywallScreen';
  export default function PaywallRoute() { return <PaywallScreen />; }
  ```
- [ ] 트리거 이벤트(`calendar-store`, `WeeklyReportScreen`)에 라우팅 코드 추가

### 스토어 정보 갱신 (유료 전환 시점)

- [ ] Play Console → 앱 콘텐츠 → 인앱 구매 → "있음"으로 변경
- [ ] 데이터 안전 → "금융/결제 정보 수집 = 예" 표기
- [ ] App Store Connect → App Privacy → "Purchase History = Yes"

---

## 🧑 사용자 GUI 작업 (결제 활성화 시점)

아래는 **Claude Code가 대신 할 수 없는** 사용자 직접 수행 항목입니다.

- [ ] **App Store Connect**: 인앱 구독 상품 생성 (연간 Tier 1 / 월간 Tier 1), 현지화 설명 등록
- [ ] **Google Play Console**: 정기 구독 상품 생성, 기준 가격 설정 (원화 기준, 환율 자동 적용)
- [ ] **Paid Applications 계약**: 세금 정보·은행 계좌(Apple), 지급 프로필(Google) 완료 — 결제 수익 수령 전제 조건
- [ ] **가격 티어 검토**: App Store 가격 티어표 기준 연간 Tier 2(₩6,000), 월간 Tier 1(₩1,000) 수준 검토

---

## 7. 프라이싱 화면 와이어프레임 (텍스트 스케치)

```
┌─────────────────────────────────┐
│                              [X]│  ← 닫기 (no-op until routing)
│                                 │
│    아이, 약속, 영수증           │  ← headline (heading/700)
│    한 번도 안 놓치게            │
│                                 │
│    Memsum이 구해준 순간들을     │  ← subheadline (body/400, textSecondary)
│    이제 가족과 함께 늘려가세요  │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ 연간 플랜         [추천] ★ │ │  ← planCard (bgElevated, border=primary, bw=2)
│ │ ₩5,900 / 년                │ │
│ │ 하루 16원 — 커피 한 잔보다  │ │  ← anchor (primary color)
│ │ 싸게                        │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 월간 플랜          ₩990/월 │ │  ← planCard (bgSurface, border, muted)
│ └─────────────────────────────┘ │
│                                 │
│  무료로 계속 쓸 수 있어요       │  ← section label (caption, textSecondary)
│  ✓ 스크린샷 자동 정리          │
│  ✓ 캘린더 자동 등록            │
│  ✓ 주간 5줄 리포트             │
│                                 │
│  프리미엄으로 더 챙겨요         │  ← section label (caption, primary)
│  ★ 자녀·가정 일정 알림         │
│  ★ 심화 월간 리포트            │
│  ★ 기기 여러 대 동기화         │
│                                 │
│ [      연간 구독 시작하기     ] │  ← Button primary lg (no-op)
│        월간으로 시작하기        │  ← Button ghost sm (no-op)
│                                 │
│  지금은 전 기능을 무료로        │  ← footer (caption, textDisabled)
│  이용하실 수 있어요             │
│  구매 복원                      │  ← underline link (caption, textSecondary)
└─────────────────────────────────┘
```

---

## 8. 디자인 원칙 준수 사항 (design.md §6 Korean Friendly Tone, §5 Always Confirm)

- **Korean Friendly Tone**: "구독"보다 "함께 더 챙겨요", "결제"보다 "시작하기"
- **Always Confirm**: CTA 탭 후 즉시 결제가 아닌, 확인 다이얼로그 → "이렇게 결제할까요?" 후 진행
- **이모지 금지**: lucide 아이콘(`check-circle`, `star`, `x`)으로만 표현
- **색 토큰만**: `colors.primary`, `colors.bgElevated`, `colors.textSecondary` 등 의미 토큰 사용
- **i18n 필수**: 모든 문구 `paywall.*` 키로 관리 (`src/i18n/ko.json` + `src/i18n/en.json`)

---

*최종 업데이트: 2026-07-13 | 이슈 #7 | 담당: Claude Code*
