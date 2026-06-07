---
tags: [design, 컨셉, 디자인시스템, 토큰, 컴포넌트, 에이전트위임]
created: 2026-06-10
version: "v1.0"
status: "에이전트 위임 준비 완료"
컨셉: "Calm Glass"
선행문서: "[[아이디어/Memsum/디자인트렌드|디자인트렌드]] · [[아이디어/Memsum/브랜드|브랜드]] · [[아이디어/Memsum/페르소나|페르소나]]"
구현문서: "[[아이디어/Memsum/디자인시스템|디자인시스템]] (구버전, 본 문서로 대체) · [[아이디어/Memsum/CLAUDE|CLAUDE.md]]"
---

# 🎨 Memsum design.md — 단일 진실 문서 (Single Source of Truth)

> **이 문서는 Memsum 디자인의 모든 것입니다.**
> 디자인 컨셉부터 디자인 토큰·컴포넌트·화면 패턴·에이전트 위임 명세까지 한 문서에.
> 에이전트는 이 문서만 받아 실제 코드 구현·디자인 시스템 확장이 가능해야 합니다.

---

## 📖 목차

- **Part 1. Foundation (컨셉·원칙)** — §1~§5
- **Part 2. Tokens (디자인 토큰)** — §6~§13
- **Part 3. Components (컴포넌트 명세)** — §14~§24
- **Part 4. Patterns (화면 패턴)** — §25~§31
- **Part 5. Platform (플랫폼 적응)** — §32~§36
- **Part 6. For Agent (에이전트 위임 명세)** — §37~§41

---

# Part 1. Foundation — 컨셉과 원칙

## 1. 디자인 비전 — "Calm Glass"

> **한국 토스의 친근한 단순함 위에 iOS 26 Liquid Glass를 외과적으로 얹은 차분한 미니멀리즘.**

### 한 단락 정의
Memsum의 디자인은 페르소나 이수현(노션 다섯 번 접은 디지털 마케터)이 일요일 저녁 9시 사진 앨범을 열어보며 한숨 쉬는 그 감정의 반대편에 있다. 정리하라고 잔소리하지 않고, AI가 똑똑한 척하지 않고, 색이 화려하지 않다. **차분함이 차별점이다.** 화면의 99%는 솔리드 라벤더·아이보리. 1%만 Liquid Glass — 그것도 알림·Sheet·캘린더 확인 모달 같은 "잠깐 떠 있다 사라지는" overlay에만.

### 비전 한 문장
> "정리 안 해도 된다는 안도감을, 시각으로 전달한다."

---

## 2. 5가지 디자인 원칙

### 원칙 1 — **Solid Beneath, Glass Above** (솔리드 위 글래스)
- 기본 화면(홈·자료실·캘린더·설정) = 100% 솔리드
- 오버레이(알림·Sheet·모달) = 연한 Liquid Glass
- 카드·리스트 = 솔리드 화이트 + subtle border
- **블러는 항상 의미가 있을 때만** (그것이 일시적이라는 신호)

### 원칙 2 — **Invisible AI** (AI 안 보이게)
- "AI로 정리됨" 같은 라벨 ❌
- "이번 주 자료 정리" 같은 사람 말투 ✅
- 자동 클러스터 이름도 사람처럼 ("마케팅 자료" O / "Cluster #3" X)
- AI는 결과로만 존재. 과정 자랑 금지

### 원칙 3 — **One Hero Moment a Day** (하루 한 번 화려한 순간)
- 평소엔 정적·차분
- 일요일 저녁 9시 5줄 리포트가 유일한 시각적 하이라이트
- 카드 stagger reveal + 코랄 액센트 + 햅틱
- 이게 일요일을 의식(ritual)으로 만든다

### 원칙 4 — **Korean Friendly Tone** (한국 사용자 톤)
- 친구 말투, "수현 님" 같은 호칭 가능
- 큰 보라 버튼 1개 + 작은 ghost 버튼 1개 (토스 결)
- 빈 상태도 따뜻하게 — "아직 캡처가 없어요. 천천히 시작해도 괜찮아요."

### 원칙 5 — **Always Confirm** (휴먼 인 더 루프 강제)
- 모든 자동 캡처는 1탭 확인
- 캘린더 자동 등록도 [추가] 누름
- 5줄 리포트도 [👍][👎] 피드백
- "AI가 마음대로" 불안감 차단

---

## 3. 페르소나 × 디자인 매핑

| 페르소나 욕구 | 디자인 결정 |
|--------------|------------|
| 차분함 (이수현) | 라벤더 #7C6FE8 + 아이보리 베이스. 고채도 회피 |
| 정리 부담 없음 | "Capture → Done" 단일 흐름. 폴더·태그 UI 없음 |
| 죄책감 해소 | 일요일 5줄 = "나 대신 누가 정리해줬다" 감정 |
| 약속 안 까먹기 | 캘린더 자동 등록 시트의 명확한 시각 (Glass 액센트) |
| AI 불안 | 모든 자동 동작에 [예]/[아니오] 강제 |
| 한국어 자료 | Pretendard Variable + 한국식 날짜 표기 |

---

## 4. Anti-design (의도적 회피 8가지)

| 안 따라가는 것 | 이유 |
|--------------|------|
| 고채도 강렬한 컬러 (2026 트렌드) | "차분함" 욕구와 충돌 |
| 텍스처·질감 (액체 유리·동물 털) | 미니멀 컨셉 파괴 |
| 강한 Neomorphism | 시각 피로 |
| Glassmorphism 전면 적용 | 가독성 저하 |
| AR/Spatial 통합 | 모바일 캡처가 본질 |
| 게이미피케이션 | 이수현 페르소나에 부적합 |
| 강제 푸시 인터럽트 | "정리하라" 잔소리 회피 |
| AI 자랑 라벨·배지 | "AI 스며듦" 한국 트렌드와 정반대 |

---

## 5. 영감 레퍼런스

| 카테고리 | 참고 |
|----------|------|
| **Calm Minimalism** | Bear · iA Writer · Things 3 · Reflect |
| **한국 친근 톤** | 토스 · 당근마켓 · 카카오뱅크 |
| **AI Invisible** | mymind · Mem · Notion AI |
| **iOS 26 Liquid Glass 적용 예시** | Apple Developer Design Gallery |
| **Bottom Sheet 패턴** | iOS 17+ Files · Maps · Apollo |
| **Hero Moment (5줄 결)** | Day One · Stoic · Reflectly |
| **Anti-reference (회피)** | Duolingo · BeReal · TikTok |

---

# Part 2. Tokens — 디자인 토큰

## 6. 색상 토큰

### 6.1 팔레트 (Raw Colors)

```ts
// src/design/tokens/colors.ts
export const palette = {
  // Brand Lavender
  lavender50:  '#F4F1FD',
  lavender100: '#E5E1F9',
  lavender300: '#B5ABEE',
  lavender500: '#7C6FE8', // Brand Primary
  lavender700: '#5A4FCC',
  lavender900: '#2E2670',

  // Brand Ivory
  ivory50:  '#FFFCF7',
  ivory100: '#FFF8F0', // Brand Base
  ivory200: '#F5EFE4',

  // Brand Coral
  coral400: '#FFB84D', // Accent
  coral600: '#E89A2E',

  // Neutral
  gray50:  '#FAFAFB',
  gray100: '#F2F2F5',
  gray300: '#D4D4DC',
  gray500: '#6D6D80',
  gray700: '#3F3F50',
  gray900: '#2D2D3D',

  // Semantic
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',
} as const;
```

### 6.2 Light Mode 의미 토큰

```ts
export const lightColors = {
  // Brand
  primary:       palette.lavender500,
  primaryMuted:  palette.lavender100,
  primaryHover:  palette.lavender700,
  onPrimary:     '#FFFFFF',

  // Surface
  bgBase:        palette.ivory100,
  bgSurface:     '#FFFFFF',
  bgElevated:    '#FFFFFF',
  bgMuted:       palette.ivory200,

  // Text
  textPrimary:   palette.gray900,
  textSecondary: palette.gray500,
  textOnAccent:  '#FFFFFF',
  textDisabled:  palette.gray300,

  // Border
  border:        palette.gray100,
  borderStrong:  palette.gray300,

  // Accent
  accent:        palette.coral400,
  success:       palette.success,
  danger:        palette.danger,
  warning:       palette.warning,
  info:          palette.info,
} as const;
```

### 6.3 Dark Mode 의미 토큰

```ts
export const darkColors: typeof lightColors = {
  primary:       palette.lavender300,
  primaryMuted:  '#2A2557',
  primaryHover:  palette.lavender500,
  onPrimary:     palette.gray900,

  bgBase:        '#16161E',
  bgSurface:     '#1E1E2A',
  bgElevated:    '#262635',
  bgMuted:       '#2A2A3A',

  textPrimary:   '#F5F5F8',
  textSecondary: '#A0A0B5',
  textOnAccent:  palette.gray900,
  textDisabled:  '#4A4A5A',

  border:        '#2E2E3E',
  borderStrong:  '#3F3F50',

  accent:        palette.coral400,
  success:       '#34D399',
  danger:        '#F87171',
  warning:       '#FBBF24',
  info:          '#60A5FA',
};
```

### 6.4 Liquid Glass Overlay 토큰 (신규)

```ts
// 오버레이 전용. primary content에는 쓰지 않음.
export const glassTokens = {
  light: {
    tint: 'rgba(124, 111, 232, 0.12)',       // 라벤더 12%
    border: 'rgba(255, 255, 255, 0.18)',
    blur: 20,                                  // backdrop-filter
    saturate: 1.4,
  },
  dark: {
    tint: 'rgba(181, 171, 238, 0.16)',
    border: 'rgba(255, 255, 255, 0.08)',
    blur: 24,
    saturate: 1.5,
  },
} as const;
```

### 6.5 사용 규칙
- 컴포넌트는 **의미 토큰만** 참조 (`primary`, `bgSurface` 등)
- Raw palette 직접 참조 금지 (`palette.lavender500` X)
- Glass 토큰은 `Sheet`, `NotificationCard`, `CalendarConfirmModal`만 사용

---

## 7. 타이포그래피

### 7.1 폰트 패밀리

```ts
export const fontFamily = {
  sans:   'Pretendard-Variable',    // 한국어 메인
  sansEn: 'Inter-Variable',          // 영문/숫자
  mono:   'JetBrainsMono-Variable',  // 코드
} as const;
// iOS 폴백: -apple-system, SF Pro Display
// Android 폴백: Roboto, sans-serif
```

### 7.2 타입 스케일

```ts
export const typography = {
  // Caption — 작은 메타 정보 (날짜·라벨)
  caption:  { size: 12, line: 16, weight: '500', tracking: 0 },

  // Body — 본문
  bodySm:   { size: 13, line: 18, weight: '400', tracking: 0 },
  body:     { size: 15, line: 22, weight: '400', tracking: 0 },
  bodyMd:   { size: 16, line: 24, weight: '500', tracking: 0 },

  // Title — 카드 제목·섹션 헤더
  title:    { size: 18, line: 26, weight: '600', tracking: -0.01 },

  // Heading — 화면 제목
  heading:  { size: 22, line: 30, weight: '700', tracking: -0.015 },

  // Display — Hero 모먼트 (5줄 리포트 카드)
  display:  { size: 28, line: 36, weight: '700', tracking: -0.02 },

  // Hero — 숫자 강조 (1,847장)
  hero:     { size: 34, line: 42, weight: '700', tracking: -0.025 },
} as const;
```

### 7.3 변형 룰
- 본문은 weight 400, 강조는 500, 제목 600~700 (**weight 800 금지** — 과한 굵기 회피)
- 숫자 등폭: `font-feature-settings: 'tnum'` 적용 (사용량·날짜 카운터)
- 한국어 행간 1.5~1.6 권장 (영문보다 살짝 크게)

---

## 8. 간격 (4px 그리드)

```ts
export const spacing = {
  none: 0,
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,   // 카드 기본 padding
  xl:   20,
  '2xl': 24,  // 섹션 간격
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
  '6xl': 72,
} as const;
```

### 사용 규칙
- 4px 그리드 위반 금지
- 모든 간격은 토큰 사용
- 컴포넌트 내부 기본 padding: `lg`(16)

---

## 9. 반경 (Radius)

```ts
export const radius = {
  none: 0,
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,    // ⭐ Card·Sheet 기본 (로고 모티프와 일치)
  '2xl': 28,
  full: 9999,
} as const;
```

### 사용 규칙
- 카드·Sheet·모달 = `xl` (20)
- 작은 버튼·태그 = `md` (10)
- 큰 버튼 = `lg` (14)
- pill 형태 = `full`

---

## 10. Elevation (그림자)

```ts
import { Platform } from 'react-native';

export const elevation = {
  0: Platform.select({
    ios: { shadowOpacity: 0 },
    android: { elevation: 0 },
  }),
  1: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
    android: { elevation: 1 },
  }),
  2: Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4 },
    android: { elevation: 2 },
  }),
  3: Platform.select({  // Card 기본
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8 },
    android: { elevation: 4 },
  }),
  4: Platform.select({  // Floating 카드
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16 },
    android: { elevation: 8 },
  }),
  5: Platform.select({  // Sheet·Modal
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.16, shadowRadius: 32 },
    android: { elevation: 16 },
  }),
} as const;
```

---

## 11. 모션 (Reanimated)

```ts
import { Easing } from 'react-native-reanimated';

export const motion = {
  duration: {
    instant: 80,
    fast:    150,
    base:    200,    // 기본 트랜지션
    slow:    300,    // 모달·Sheet
    lazy:    500,    // 페이지 전환
    ritual:  1200,   // ⭐ 일요일 5줄 stagger 전용 (5장 × 80ms)
  },

  easing: {
    standard:   Easing.bezier(0.2, 0, 0, 1),
    emphasized: Easing.bezier(0.3, 0, 0, 1),
    decel:      Easing.out(Easing.cubic),
    accel:      Easing.in(Easing.cubic),
  },

  spring: {
    snappy: { damping: 20, stiffness: 300 },   // 빠른 토글
    gentle: { damping: 18, stiffness: 180 },   // ⭐ Sheet·다이얼로그 기본
    bouncy: { damping: 12, stiffness: 220 },   // ⭐ 자동 정리 9점 모션
  },
} as const;
```

### Memsum 핵심 모션 4가지

1. **스크린샷 감지 알림 (slide-in from top)**
   - `translateY: -80 → 0`, `opacity: 0 → 1`
   - duration `slow`(300), easing `decel`
   - 3초 후 자동 dismiss (slide-out `base`)

2. **캡처 확인 Sheet 등장**
   - spring `gentle`
   - 백드롭 opacity `0 → 0.4`, `base`(200)

3. **일요일 5줄 리포트 stagger reveal** ⭐ Hero Moment
   - 5개 카드 각각 `opacity 0 → 1` + `translateY 12 → 0`
   - 스태거 간격 80ms, 각 카드 duration 250ms
   - 마지막 카드 reveal 시 코랄 라인 highlight + 햅틱 `light`

4. **자동 정리 9점 모션** ⭐ 로고 모티프
   - 9개 점이 무작위 → 3×3 그리드 spring 이동
   - 각 점 delay `i * 50ms`, spring `bouncy`
   - 마지막 우하단 점이 화이트 → 코랄 (200ms)
   - 정리 완료 시 햅틱 `light`

---

## 12. 아이콘 시스템

### 채택: `lucide-react-native`

- 1,400+ 아이콘, stroke 1.75 통일, MIT
- 크기: `16`(인라인) / `20`(기본) / `24`(헤더·버튼) / `32`(EmptyState)
- 색상: `currentColor` → 토큰 참조 (`color={tokens.textPrimary}`)
- stroke-width: `1.75` 고정

### Memsum 필수 아이콘 20개

| 용도 | Lucide name |
|---|---|
| 캡처 | `camera` |
| 갤러리 | `images` |
| 캘린더 | `calendar` |
| 검색 | `search` |
| 설정 | `settings` |
| 공유 | `share-2` |
| 알림 | `bell` |
| 유저 | `user` |
| 홈 | `home` |
| 리포트 | `file-text` |
| 별표 | `star` |
| 휴지통 | `trash-2` |
| 편집 | `pencil` |
| 닫기 | `x` |
| 체크 | `check` |
| 우측 화살표 | `chevron-right` |
| 좌측 화살표 | `chevron-left` |
| 더보기 | `more-horizontal` |
| 필터 | `sliders-horizontal` |
| 동기화 | `refresh-cw` |

---

## 13. z-index

```ts
export const zIndex = {
  base:     0,
  dropdown: 1000,
  sticky:   1100,
  overlay:  1200,
  modal:    1300,
  popover:  1400,
  toast:    1500,
  tooltip:  1600,
} as const;
```

---

# Part 3. Components — 컴포넌트 명세

## 14. Button

### Props
```ts
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  onPress: () => void;
  children: React.ReactNode;
};
```

### Variants
| Variant | 용도 | 배경 | 텍스트 |
|---------|------|------|--------|
| `primary` | 메인 액션 | `primary` | `onPrimary` |
| `secondary` | 보조 액션 | `primaryMuted` | `primary` |
| `ghost` | 가벼운 액션 | 투명 | `primary` |
| `destructive` | 삭제·취소 | `danger` | white |
| `accent` | 특별 액션 (Hero CTA) | `accent` (코랄) | `textOnAccent` |

### Size
| Size | Height | Padding | Font |
|------|--------|---------|------|
| `sm` | 36 | 12/16 | `bodySm` |
| `md` | 44 (iOS 최소 탭) | 16/20 | `body` |
| `lg` | 52 | 20/24 | `bodyMd` |

### 플랫폼 처리
- **iOS**: `Pressable` opacity 0.7 + `Haptics.selectionAsync()`
- **Android**: `android_ripple={{ color: tokens.primaryMuted }}`

### 사용 예시
```tsx
<Button variant="primary" size="md" leftIcon={<Camera size={18} />} onPress={capture}>
  지금 캡처
</Button>

<Button variant="ghost" size="sm" onPress={cancel}>
  닫기
</Button>
```

### a11y
- `accessibilityRole="button"`
- `accessibilityState={{ disabled, busy: loading }}`
- `accessibilityLabel` — 아이콘만 있을 때 필수

---

## 15. Card

### Props
```ts
type CardProps = {
  variant?: 'flat' | 'elevated' | 'outlined' | 'highlight';
  padding?: 'compact' | 'normal' | 'spacious';
  onPress?: () => void;
  children: React.ReactNode;
};
```

### Variants
| Variant | 시각 |
|---------|------|
| `flat` | 배경만, 그림자 X |
| `elevated` | `elevation[3]` 적용 (기본 카드) |
| `outlined` | border 1px `border` |
| `highlight` | 좌측 coral 4px 보더 + flat (재발견 표시) ⭐ |

### Padding
| Padding | 값 |
|---------|----|
| `compact` | `md`(12) |
| `normal` | `lg`(16) — 기본 |
| `spacious` | `2xl`(24) |

### Radius
- 항상 `xl`(20) — 로고 모티프와 일치

### 사용 예시
```tsx
<Card variant="elevated">
  <Text variant="title">오늘의 캡처</Text>
  <Text variant="body" color="textSecondary">12장 정리됨</Text>
</Card>

{/* 일요일 5줄 — 베스트 카드 */}
<Card variant="highlight" padding="spacious">
  <Text variant="display">코카콜라 글로벌 캠페인</Text>
  <Text variant="body">지역화 + ESG 결합 새 공식</Text>
</Card>
```

---

## 16. Input (TextField)

### Props
```ts
type InputProps = {
  variant?: 'outline' | 'filled' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  secureTextEntry?: boolean;
  multiline?: boolean;
};
```

### Variants
| Variant | 용도 |
|---------|------|
| `outline` | 폼 입력 (기본) |
| `filled` | 미니멀 (설정 화면) |
| `underline` | 검색바 (Sheet 안 sticky) ⭐ |

### State
- default · focused · error · disabled
- focused: border `primary`, label 위로 fly-up
- error: border `danger`, errorText 표시

### a11y
- `accessibilityLabel={label}`
- error 시 `accessibilityInvalid`

---

## 17. ListItem

### Props
```ts
type ListItemProps = {
  leading?: React.ReactNode;          // 아이콘 또는 Avatar
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;         // chevron / Switch / Badge
  onPress?: () => void;
  showDivider?: boolean;
};
```

### Height
- 단일 라인: 56
- 2줄 (title + subtitle): 72
- 3줄: 88

### 플랫폼
- **iOS**: 디바이더 좌측 16px 들여쓰기
- **Android**: 풀 너비 디바이더

### 사용 예시 (설정 화면)
```tsx
<ListItem
  leading={<Icon name="calendar" />}
  title="자동 캘린더 등록"
  subtitle="감지된 일정을 자동 추가"
  trailing={<Switch value={on} onValueChange={setOn} />}
/>
```

---

## 18. Badge

### Props
```ts
type BadgeProps = {
  variant?: 'solid' | 'subtle' | 'dot';
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
};
```

### Tone × Variant 매트릭스
| Tone | Solid 배경 | Subtle 배경 | Solid 텍스트 | Subtle 텍스트 |
|------|-----------|-------------|--------------|---------------|
| neutral | `gray500` | `gray100` | white | `gray700` |
| primary | `primary` | `primaryMuted` | white | `primary` |
| accent | `accent` | rgba(coral, 0.2) | `textOnAccent` | `coral600` |

### 사용 예시
```tsx
<Badge tone="accent" variant="subtle">새 발견</Badge>
<Badge tone="primary" variant="dot" />
```

---

## 19. Avatar

### Props
```ts
type AvatarProps = {
  source?: { uri: string };
  fallback?: string;                  // 이니셜
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  badge?: React.ReactNode;            // 우하단 dot/badge
};
```

### Size
| Size | 값 |
|------|-----|
| xs | 24 |
| sm | 32 |
| md | 40 (기본) |
| lg | 56 |
| xl | 80 |

### Fallback
- 이미지 없으면 이니셜 + `primaryMuted` 배경 + `primary` 텍스트
- Badge slot 우하단 — 로고 코랄 점과 시각적 일관

---

## 20. Sheet (Bottom Sheet) ⭐ 시그니처

### Props
```ts
type SheetProps = {
  snapPoints?: string[];              // ['60%'] 기본
  initialSnap?: number;
  onChange?: (index: number) => void;
  enableLiquidGlass?: boolean;        // ⭐ Memsum 시그니처
  children: React.ReactNode;
};
```

### 라이브러리
- `@gorhom/bottom-sheet`

### 시각 명세
- **snapPoints**: `['25%', '60%', '90%']`
- **백드롭**: `rgba(0,0,0,0.4)` + tap to dismiss
- **모션**: spring `gentle` (damping: 18, stiffness: 220)
- **핸들**: 상단 36×4 라운드 바, `borderStrong` 색
- **Liquid Glass 영역 (옵션)**:
  - 상단 64px만 Glass tint 적용
  - `backdrop-filter: blur(20px) saturate(140%)`
  - 의도: "잠깐 떠 있다 사라진다"는 시각 신호

### 구조
```tsx
<Sheet ref={sheetRef} snapPoints={['60%']} enableLiquidGlass>
  <Sheet.Header title="이 캡처 저장할까요?" />
  <Sheet.Body>
    {/* 이미지 미리보기 · OCR 텍스트 · 이벤트 감지 */}
  </Sheet.Body>
  <Sheet.Footer>
    <Button variant="ghost">버리기</Button>
    <Button variant="primary">캘린더에 추가</Button>
  </Sheet.Footer>
</Sheet>
```

---

## 21. Toast / Snackbar

### Props
```ts
type ToastProps = {
  tone: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
  duration?: 'short' | 'long';        // 2000ms / 4000ms
  action?: { label: string; onPress: () => void };
};
```

### 위치
- **iOS**: 상단 (statusBar + 12) — Dynamic Island 회피
- **Android**: 하단 (Material 결, navigation bar 위 16)

### 모션
- 진입: slide + fade `base`(200)
- 퇴장: fade `fast`(150)

### 사용 예시
```tsx
toast.show({
  tone: 'success',
  title: '5건 정리됨',
  action: { label: '보기', onPress: navigateToReport }
});
```

---

## 22. Header (Navigation Bar)

### Props
```ts
type HeaderProps = {
  title: string;
  large?: boolean;                    // iOS large title
  left?: React.ReactNode;
  right?: React.ReactNode[];          // 최대 2개
  scrolled?: boolean;                 // scroll 시 border 표시
};
```

### 플랫폼
- **iOS**: large=true 시 34pt → 스크롤 시 17pt 자동 축소
- **Android**: 고정 56dp + Title 20sp, 좌측 정렬

### 배경
- `bgBase` + 스크롤 시 하단 1px `border`

---

## 23. EmptyState

### Props
```ts
type EmptyStateProps = {
  illustration?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
};
```

### 기본 일러스트
- **9점 그리드** 일러스트 (로고 모티프)
- 라벤더 점 8개 + 코랄 점 1개
- `src/design/illustrations/DotsGrid.tsx`

### 한국어 톤 (예시)
- "아직 캡처가 없어요. 천천히 시작해도 괜찮아요."
- "이번 주 일정이 비어있어요."
- "검색 결과가 없네요. 다른 단어로 찾아볼까요?"

---

## 24. NotificationCard ⭐ Liquid Glass 적용 (신규)

### 용도
스크린샷 감지 후 화면 상단에서 슬라이드 인하는 알림 카드.

### Props
```ts
type NotificationCardProps = {
  thumbnail?: { uri: string };
  title: string;                      // "방금 찍은 스크린샷"
  body: string;                       // OCR 미리보기 (3줄)
  event?: {                            // 이벤트 감지 시
    date: string;
    location?: string;
  };
  actions: [
    { label: string; variant: 'primary' | 'ghost' }
  ];
  onDismiss: () => void;
  autoHideAfter?: number;             // ms, 기본 3000
};
```

### 시각 명세
- **배경**: Liquid Glass tint `rgba(124, 111, 232, 0.12)` + `backdrop-filter: blur(20px) saturate(140%)`
- **border**: `rgba(255, 255, 255, 0.18)` 1px
- **radius**: `xl`(20)
- **width**: `screen.width - 32` (좌우 16 margin)
- **position**: top + safeArea + 12
- **z-index**: `toast`(1500)

### 모션
- 진입: `translateY: -100 → 0` + `opacity: 0 → 1`, duration `slow`(300), easing `decel`
- 퇴장: 위 반대, `base`(200)
- 햅틱: 진입 시 `light`

### 이벤트 감지 시 추가 UI
- 캘린더 아이콘 + "📅 6/15 (토) 14:00 코엑스" 한 줄
- 액센트 배지 `<Badge tone="accent" variant="subtle">이벤트 감지</Badge>`

---

# Part 4. Patterns — 화면 패턴

## 25. 캡처 확인 다이얼로그 (시그니처 화면)

### 사용 시점
스크린샷 자동 감지 후 사용자가 푸시 알림을 탭했을 때.

### 와이어프레임
```
┌────────────────────────────────────┐
│  [상단 64px: Liquid Glass 영역]      │ ← blur 20px, lavender 12%
│        ━━━━━━━ (핸들 36×4)          │
├────────────────────────────────────┤
│  [솔리드 영역]                       │
│                                      │
│  📷 스크린샷 미리보기 (정사각형)       │ ← 290×290
│                                      │
│  ─────────────────                  │
│                                      │
│  OCR 텍스트 (3줄 미리보기)           │
│  ─────────────────                  │
│                                      │
│  ▣ Badge: 이벤트 감지됨 ⭐           │ ← coral accent (조건부)
│  📅 6/15 (토) 14:00 코엑스          │
│                                      │
│  ─────────────────                  │
│                                      │
│  [   닫기   ]  [ 캘린더에 추가 ]    │ ← ghost + primary
└────────────────────────────────────┘
```

### 컴포넌트 조합
- Sheet (snapPoints: ['60%'], enableLiquidGlass)
- Card (variant: outlined, 이미지 미리보기)
- Badge (tone: accent, variant: subtle) — 이벤트 감지 시
- Button × 2 (ghost + primary)

### 상호작용
- 사용자 [캘린더에 추가] 탭 → Google Calendar API 호출 → Toast(success)
- 사용자 [닫기] 탭 → Sheet dismiss, 스크린샷은 사진 앨범에만 남음
- 백드롭 탭 → Sheet dismiss

---

## 26. 메인 홈 (대시보드)

### 와이어프레임
```
┌────────────────────────────────────┐
│  [Header large: 안녕 수현 님 👋]    │ ← Pretendard 700, 22pt
│                                      │
│  ─────────────────                  │
│                                      │
│  ┌──────────────────────────────┐  │
│  │ 이번 주 캡처                  │  │ ← Card elevated
│  │ 23장                          │  │
│  │ ▓▓▓▓▓▓▓▓▓░░░ 23/30          │  │
│  └──────────────────────────────┘  │
│                                      │
│  ─────────────────                  │
│                                      │
│  최근 캡처                          │
│  ┌──┬──┬──┐                        │
│  │📷│📷│📷│ ← 그리드 (3 columns)   │
│  ├──┼──┼──┤                        │
│  │📷│📷│📷│                        │
│  └──┴──┴──┘                        │
│                                      │
│  ─────────────────                  │
│                                      │
│  주제별 묶음                        │
│  ▣ 마케팅 자료 (8장)               │ ← ListItem
│  ▣ 약속·이벤트 (3장)               │
│  ▣ 영수증 (2장)                    │
│                                      │
└────────────────────────────────────┘
[ 🏠  🔍  ➕  📅  ⚙️ ]                 ← Bottom Bar (FAB X)
```

### Layout Personalization (V2)
- 사용 패턴 학습 → 자주 보는 섹션 상단 노출
- 예: 약속이 많으면 "캘린더 위젯" 상단
- 예: 자료 검색이 많으면 "주제별 묶음" 상단

---

## 27. 일요일 5줄 리포트 (Hero Moment) ⭐

### 와이어프레임
```
┌────────────────────────────────────┐
│  📅 2026.05.22 ~ 28                │ ← Caption
│                                      │
│  이번 주 핵심 5개                   │ ← Heading 700
│  수현 님이 던지신 23개 중            │ ← Body, textSecondary
│                                      │
│  ─────────────────                  │
│                                      │
│  ┌──────────────────────────────┐  │ ← Card highlight ⭐ (1번 = 베스트)
│  │ 1                             │  │   coral 좌측 4px
│  │ 코카콜라 글로벌 캠페인          │  │
│  │ 지역화 + ESG 결합 새 공식       │  │
│  │ [원본 보기]   [👍][👎]         │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │ ← Card elevated (2~5번)
│  │ 2 디지털 마케팅 트렌드 리포트  │  │
│  │ AI 자동화 80% 도달            │  │
│  └──────────────────────────────┘  │
│  ... (3, 4, 5)                     │
│                                      │
│  ─────────────────                  │
│                                      │
│  좋아 보여요? 비슷한 자료가         │
│  더 있어요. [자료실 보기]          │
└────────────────────────────────────┘
```

### 모션 (Hero Moment)
- 5개 카드 stagger reveal (80ms 간격)
- 각 카드 `opacity 0 → 1` + `translateY 12 → 0`
- 1번 카드 reveal 완료 시점에 햅틱 `light` 1회
- 마지막 카드 reveal 후 coral 좌측 보더 200ms transition

### 카피 톤 (이수현 어휘)
- "수현 님이 던지신 23개 중" (친구 말투)
- "이번 주 핵심 5개" (단순)
- "좋아 보여요?" (친근)

---

## 28. 자동 정리 모션 (앱 첫 진입 시 1회) ⭐

### 시점
온보딩 첫 화면 또는 사용자가 "AI가 어떻게 정리하나" 궁금해할 때.

### 모션 시퀀스
```
1. 9개 점이 화면 무작위 위치에서 시작
   (각 점: 라벤더 보라 #7C6FE8, 직경 16px)

2. 각 점이 spring 이동 (bouncy)
   - 1번 점: delay 0ms
   - 2번 점: delay 50ms
   - 3번 점: delay 100ms
   - ... (i × 50ms)

3. 모든 점이 3×3 그리드 정렬 완료
   - 그리드 중앙: 화면 정중앙
   - 점 간격: 32px

4. 우하단 점 (9번)이 흰색 → 코랄 #FFB84D
   - duration 200ms

5. 캡션 fade-in:
   "정리는 Memsum이 합니다.
    수현 님은 그냥 던지기만 하세요."

6. 햅틱 light 1회 (완료 시)
```

### 코드 스니펫
```tsx
const dots = useRef(Array.from({ length: 9 }, () => ({
  x: useSharedValue(Math.random() * width),
  y: useSharedValue(Math.random() * height),
  color: useSharedValue(0), // 0=white, 1=coral (9번만)
}))).current;

useEffect(() => {
  dots.forEach((dot, i) => {
    const targetX = gridX + (i % 3) * 32;
    const targetY = gridY + Math.floor(i / 3) * 32;

    dot.x.value = withDelay(i * 50, withSpring(targetX, motion.spring.bouncy));
    dot.y.value = withDelay(i * 50, withSpring(targetY, motion.spring.bouncy));

    if (i === 8) {
      dot.color.value = withDelay(450, withTiming(1, { duration: 200 }));
    }
  });

  setTimeout(() => Haptics.selectionAsync(), 700);
}, []);
```

---

## 29. 검색·자료실

### 와이어프레임
```
┌────────────────────────────────────┐
│  [Header: 자료실]                   │
│                                      │
│  [🔍 검색 (underline variant)]      │ ← sticky
│                                      │
│  ─────────────────                  │
│                                      │
│  자동 클러스터 (AI 안 보이게)        │
│  ▣ 마케팅 자료 (8장)               │ ← ListItem, leading icon
│  ▣ 약속·이벤트 (3장)               │
│  ▣ 영수증 (2장)                    │
│  ▣ 카페·맛집 (5장)                 │
│                                      │
│  ─────────────────                  │
│                                      │
│  최근 캡처 23장                     │
│  [그리드 또는 리스트]               │
│                                      │
└────────────────────────────────────┘
```

### 검색 결과 화면 ("코카콜라" 입력 후)
```
┌────────────────────────────────────┐
│  [← 코카콜라        검색          ]  │ ← Header
│                                      │
│  "코카콜라" 관련 8개                │
│                                      │
│  ┌──────────────────────────────┐  │
│  │ 📷 코카콜라 글로벌 캠페인     │  │ ← Card elevated
│  │    2026.05.22 · 마케팅 자료   │  │
│  │    [캘린더에 등록됨]          │  │
│  └──────────────────────────────┘  │
│  ...                                │
│                                      │
│  비슷한 주제                        │
│  • 음료 브랜드 (3개)               │
│  • ESG 캠페인 (5개)                │
└────────────────────────────────────┘
```

### 카피 (한국어 친근)
- "Memsum이 자료를 찾고 있어요…"
- "8개를 찾았어요"
- "비슷한 주제도 있어요" (Mem·mymind 결)

---

## 30. 설정

### 섹션 구성
```
┌────────────────────────────────────┐
│  [Header: 설정]                     │
│                                      │
│  계정                                │
│  ▣ 수현 님 (su@example.com)        │ ← ListItem leading: Avatar
│  ▣ 로그아웃                         │
│                                      │
│  ─────────────────                  │
│                                      │
│  권한                                │
│  ▣ 사진 자동 감지         [✓]      │ ← Switch trailing
│  ▣ 캘린더 자동 등록       [✓]      │
│  ▣ 일요일 5줄 리포트      [✓]      │
│                                      │
│  ─────────────────                  │
│                                      │
│  스타일                              │
│  ▣ 다크 모드        시스템 ▾       │
│  ▣ 톤                정중 / 친근    │ ← Memsum 특화
│                                      │
│  ─────────────────                  │
│                                      │
│  데이터                              │
│  ▣ 백업 (구글 드라이브)            │
│  ▣ 내보내기                         │
│  ▣ 계정 삭제                        │
└────────────────────────────────────┘
```

### Memsum 특화: 톤 옵션
- "정중" — "수현 님께서 캡처하신 자료를 확인해드릴까요?"
- "친근" — "수현 님 캡처한 거 정리했어요!"
- 기본: 친근

---

## 31. 빈 상태 (Empty States)

### 자료실 비어있음
```
┌────────────────────────────────────┐
│                                      │
│     [9점 그리드 일러스트]            │
│         · · ·                       │
│         · · ·                       │
│         · · 🟠                      │
│                                      │
│  아직 캡처가 없어요                  │
│  천천히 시작해도 괜찮아요.           │
│                                      │
│  [예시 캡처 보기]                   │
└────────────────────────────────────┘
```

### 캘린더 비어있음
- "이번 주 일정이 비어있어요. 약속을 캡처하면 자동으로 등록할게요."

### 검색 결과 없음
- "검색 결과가 없네요. 다른 단어로 찾아볼까요?"

### 일요일 5줄 (캡처 부족)
- "이번 주는 캡처가 적네요. 다음 주를 기대해요. 💜"

---

# Part 5. Platform — 플랫폼 적응

## 32. iOS vs Android 차이

| 영역 | iOS | Android |
|---|---|---|
| 네비게이션 | 좌측 chevron + Pop 제스처 | 시스템 Back + 상단 좌측 화살표 |
| 모달 | Sheet (Half/Full) | BottomSheet + FullScreenDialog |
| 폰트 폴백 | `-apple-system`, SF Pro | `Roboto`, `sans-serif` |
| 햅틱 | Taptic Engine | `Vibration.vibrate()` |
| 상태바 | light/dark content | `translucent` + `bgBase` |
| 권한 UI | Apple 시스템 다이얼로그 | Material 다이얼로그 + 사전 설명 화면 |
| 탭바 | 49pt SafeArea 포함 | 56dp BottomNavigation |
| 스위치 | iOS 스타일 토글 | Material 트랙 |
| Material You | 미적용 | Android 12+ 동적 색 옵션 |

### 헬퍼 함수
```ts
// src/design/theme/platform.ts
import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';

export const haptic = (level: 'light' | 'medium' | 'heavy') => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(
      level === 'light' ? Haptics.ImpactFeedbackStyle.Light :
      level === 'medium' ? Haptics.ImpactFeedbackStyle.Medium :
      Haptics.ImpactFeedbackStyle.Heavy
    );
  } else {
    Vibration.vibrate(level === 'light' ? 8 : level === 'medium' ? 16 : 32);
  }
};
```

---

## 33. iOS 26 Liquid Glass 적용 규칙

### Memsum의 Liquid Glass 보수적 적용

**적용 위치 (4곳만)**
1. `Sheet` 상단 64px 핸들 영역
2. `NotificationCard` 전체
3. 캘린더 자동 등록 확인 모달
4. (V2) AI Q&A "Ask Your Brain" 결과 카드

**비적용 위치 (Liquid Glass 금지)**
- 메인 홈 배경
- 자료실 그리드
- 모든 Card·ListItem
- Button
- Input

### 강도 조절
- iOS 26 기본 강도의 **60%**
- `backdrop-filter: blur(20px) saturate(140%)`
- 라벤더 tint 12% (강한 색 회피)

### iOS 26 미만 폴백
```tsx
const isIOS26Plus = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26;

<Sheet enableLiquidGlass={isIOS26Plus}>
  {/* iOS 26 미만은 솔리드 라벤더 */}
</Sheet>
```

---

## 34. 다크 모드

### 자동 추적
```ts
import { useColorScheme } from 'react-native';

function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [userPref, setUserPref] = useState<'system' | 'light' | 'dark'>('system');
  const scheme = userPref === 'system' ? systemScheme : userPref;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  // ...
}
```

### 설정 화면 옵션
- `system` (기본) / `light` / `dark` 3택
- AsyncStorage 저장

### Memsum 특화
- 캡처 썸네일 위 `rgba(255,255,255,0.04)` 오버레이 (OLED 번-인 완화)
- 코랄 액센트 다크모드에서 살짝 채도 낮춤 (`#F5AE45`)

### WebView 동기화
- 네이티브 → WebView로 `postMessage({type: 'theme', value: 'dark'})`
- Tailwind `dark:` 클래스 활성화

---

## 35. 접근성 (a11y)

### 필수 요구사항
- 모든 인터랙티브 요소에 `accessibilityRole` + `accessibilityLabel`
- 색상 외 정보 전달 (아이콘 + 텍스트)
- 다이내믹 타입 지원 (사용자 폰트 크기 설정 반영)
- 최소 탭 영역 44×44pt(iOS) / 48×48dp(Android)
- 다크 모드 완전 지원
- 대비 4.5:1 이상 (텍스트 기준)
- VoiceOver / TalkBack 동작 확인

### Memsum 한국어 a11y 우선
- 모든 UI 텍스트가 i18n 키 → VoiceOver 한국어 자연
- 숫자 읽기: "1,847장" → "천팔백사십칠 장"
- 이벤트 감지 알림: 풀 텍스트 라벨 ("6월 15일 토요일 오후 2시 코엑스 일정이 감지됐어요")

---

## 36. 한국 사용자 톤 가이드

### 카피 원칙
1. **친구 말투** — "수현 님" 같은 호칭 가능
2. **명확함** — 두 번 읽지 않게
3. **따뜻함** — "괜찮아요", "천천히"
4. **자랑 금지** — "AI가" 같은 시스템 자랑 X

### 좋은 예시 vs 나쁜 예시

| 상황 | ❌ 나쁜 예 | ✅ 좋은 예 |
|------|----------|----------|
| 빈 상태 | "No captures available" | "아직 캡처가 없어요" |
| 자동 등록 | "AI가 캘린더에 자동 등록했습니다" | "캘린더에 추가됐어요" |
| 5줄 리포트 헤더 | "Weekly AI Summary Report" | "이번 주 핵심 5개" |
| 권한 요청 | "Allow photo access for screenshot detection feature" | "스크린샷을 자동으로 알아채려면 사진 권한이 필요해요" |
| 에러 | "An error occurred" | "잠시 후 다시 시도해주세요" |

### 톤 옵션 (설정)
- **친근** (기본): "수현 님 캡처한 거 정리했어요!"
- **정중**: "수현 님께서 캡처하신 자료를 정리해드렸습니다."

---

# Part 6. For Agent — 에이전트 위임 명세

## 37. 라이브러리 채택

### UI 라이브러리
**채택**: `gluestack-ui v2` + `NativeWind`

**채택 이유**
1. WebView가 `shadcn/ui` → 시각 언어 일관 (gluestack v2 = shadcn 결의 RN 포팅)
2. `NativeWind`로 Tailwind 클래스를 RN·웹 동일 사용
3. iOS·Android 일급 지원 + 다크모드 토큰 스왑 내장
4. 1인 개발 속도 우선

### 보조 라이브러리
| 용도 | 라이브러리 |
|------|-----------|
| 애니메이션 | `react-native-reanimated` v3 |
| 제스처 | `react-native-gesture-handler` |
| Bottom Sheet | `@gorhom/bottom-sheet` |
| 햅틱 | `expo-haptics` |
| 아이콘 | `lucide-react-native` |
| 폰트 | `expo-font` + Pretendard Variable |

### 설치 명령
```bash
npm install @gluestack-ui/themed nativewind
npm install react-native-reanimated react-native-gesture-handler
npm install @gorhom/bottom-sheet
npm install expo-haptics expo-font
npm install lucide-react-native
```

---

## 38. 폴더 구조

```
memsum/
└── src/
    └── design/
        ├── tokens/
        │   ├── colors.ts
        │   ├── typography.ts
        │   ├── spacing.ts
        │   ├── radius.ts
        │   ├── elevation.ts
        │   ├── motion.ts
        │   ├── zIndex.ts
        │   ├── glass.ts          # Liquid Glass 토큰 (신규)
        │   └── index.ts          # 배럴 export
        ├── theme/
        │   ├── ThemeProvider.tsx
        │   ├── gluestack.config.ts
        │   ├── platform.ts       # haptic·statusBar 헬퍼
        │   └── useTheme.ts
        ├── components/
        │   ├── Button/
        │   │   ├── Button.tsx
        │   │   ├── Button.types.ts
        │   │   ├── Button.stories.tsx
        │   │   └── index.ts
        │   ├── Card/
        │   ├── Input/
        │   ├── ListItem/
        │   ├── Badge/
        │   ├── Avatar/
        │   ├── Sheet/
        │   ├── Toast/
        │   ├── Header/
        │   ├── EmptyState/
        │   ├── NotificationCard/     # Liquid Glass (신규)
        │   └── index.ts          # 배럴 export
        ├── icons/
        │   ├── Icon.tsx          # lucide 래퍼 + 토큰 색
        │   └── index.ts
        ├── illustrations/
        │   ├── DotsGrid.tsx      # 9점 그리드 (로고 모티프)
        │   ├── EmptyCaptures.tsx
        │   └── index.ts
        └── patterns/             # 화면 패턴 (조합 컴포넌트)
            ├── CaptureConfirmSheet.tsx
            ├── WeeklyReportScreen.tsx
            ├── AutoOrganizeAnimation.tsx
            └── index.ts
```

---

## 39. Claude Code 작업 룰

### "Button 만들어줘" 요청 시 체크리스트
1. `src/design/components/Button/`에 이미 있는지 확인
2. 없으면 §14 명세 그대로 구현 (5 variants, 3 sizes, loading, disabled)
3. 색은 `useTheme()`에서 의미 토큰만 (`#7C6FE8` 하드코딩 금지)
4. 다크모드 자동 동작 확인 (light/dark 둘 다 스크린샷)
5. iOS: `Pressable` + `Haptics.selectionAsync()`
6. Android: `android_ripple={{ color: tokens.primaryMuted }}`
7. a11y props (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`)
8. 텍스트는 i18n 키 (`t('button.capture')`)

### "캡처 확인 다이얼로그 만들어줘" 요청 시
1. `src/design/patterns/CaptureConfirmSheet.tsx` 생성
2. Sheet (snapPoints: ['60%'], enableLiquidGlass: true)
3. Card + Badge(accent) + Button × 2 조합
4. §25 와이어프레임 그대로
5. 이벤트 감지 시 Badge 표시 (조건부)

### 절대 금지
- 색·간격·폰트 매직 넘버
- `Platform.OS === 'ios' ? ... : ...` 인라인 분기 (헬퍼로 추상화)
- 다크 모드 미고려 PR
- a11y 라벨 없는 인터랙티브
- 인라인 한국어 (i18n 키로)
- AI 자랑 라벨 (Anti-design §4)

### i18n 키 구조
```json
// src/i18n/ko.json
{
  "common": { "ok": "확인", "cancel": "취소", "save": "저장", "close": "닫기" },
  "capture": {
    "confirmTitle": "이 캡처 저장할까요?",
    "addToCalendar": "캘린더에 추가",
    "discard": "버리기",
    "eventDetected": "이벤트 감지됨"
  },
  "report": {
    "weekly": "이번 주 핵심 5개",
    "weeklySubtitle": "{{name}} 님이 던지신 {{total}}개 중"
  },
  "empty": {
    "captures": "아직 캡처가 없어요",
    "capturesDescription": "천천히 시작해도 괜찮아요.",
    "showSample": "예시 캡처 보기"
  }
}
```

키 구조: `feature.component.action` 3단 계층. en.json 1:1 매칭.

---

## 40. PR 머지 전 체크리스트 (15항목)

- [ ] 모든 색이 의미 토큰 참조 (raw palette 직접 사용 0건)
- [ ] 모든 간격이 `spacing.*` (4px 그리드 위반 0건)
- [ ] 모든 텍스트가 `typography.*` 스케일 안
- [ ] 모든 라운드가 `radius.*` 토큰
- [ ] 다크모드 자동 전환 + 대비 4.5:1
- [ ] iOS 빌드 성공 (`expo run:ios`)
- [ ] Android 빌드 성공 (`expo run:android`)
- [ ] WebView 시각 일관성 확인
- [ ] 모든 인터랙티브에 a11y 라벨·역할·상태
- [ ] 최소 탭 영역 44×44(iOS) / 48×48(Android)
- [ ] 모션이 `motion.*` 토큰만 사용
- [ ] 인라인 한국어 없음 (i18n 키)
- [ ] 로딩·에러·빈 상태 3종 UI 정의
- [ ] Pretendard 로드 실패 시 폴백 동작
- [ ] Storybook/데모 화면 등록

---

## 41. 우선 구현 순서 (W4~W12)

| 주차 | 구현 대상 | 산출물 |
|------|---------|--------|
| **W4** | 토큰 + ThemeProvider + Button + Card | tokens 전체, Button 5 variants 동작 |
| **W5** | Input + ListItem + Badge + Header + 캡처 확인 Sheet (시그니처) | CaptureConfirmSheet 동작 |
| **W6** | Avatar + Toast + EmptyState + 9점 일러스트 | 빈 상태 화면 완성 |
| **W7** | 검색 UI + 자동 클러스터 ListItem 패턴 | SearchScreen 동작 |
| **W8** | NotificationCard (Liquid Glass) + 캘린더 등록 시트 | 시그니처 NotificationCard 동작 |
| **W9** | 캘린더 자동 등록 흐름 UI | CalendarConfirmModal 동작 |
| **W10** | 자동 정리 9점 모션 (온보딩) | AutoOrganizeAnimation 첫 진입 |
| **W11** | 일요일 5줄 리포트 (Hero Moment) | WeeklyReportScreen + stagger reveal + 햅틱 |
| **W12** | 설정·결제·전체 흐름 마무리 | App Store 제출 준비 |

---

## 📌 에이전트 위임 시 사용법

### 1. 에이전트에 이 문서 전체 전달
```
"이 design.md를 읽고 W4 산출물(토큰 + ThemeProvider + Button + Card)을 구현해줘.
Memsum 프로젝트는 Expo React Native + TypeScript + gluestack-ui v2 + NativeWind 기반.
CLAUDE.md의 폴더 구조·코딩 컨벤션 그대로 따라.
완성 후 light/dark 양쪽 스크린샷 보여줘."
```

### 2. 에이전트가 자동 참조해야 할 다른 문서
- [[아이디어/Memsum/CLAUDE|CLAUDE.md]] — 프로젝트 구조·명령어·컨벤션
- [[아이디어/Memsum/디자인트렌드|디자인트렌드.md]] — 컨셉 배경
- [[아이디어/Memsum/페르소나|페르소나.md]] — 이수현 (카피 톤 검증용)
- [[아이디어/Memsum/브랜드|브랜드.md]] — 로고·색상 원본

### 3. 검증 흐름
- 에이전트가 구현 → PR 형태로 보고
- 오케스트레이터(Claude)가 §40 체크리스트 15항목 검토
- 페르소나 톤 검증 → 이수현이 보고 "차분하다" 느낄지

### 4. 우선 위임 단위 추천
- 한 번에 W1주 분량 (3~5개 컴포넌트)
- 너무 큰 단위는 일관성 저하
- 너무 작은 단위는 호출 비용

---

**문서 버전**: v1.0 (2026-06-10) · **컨셉**: Calm Glass · **오너**: Memsum (1인 풀스택 — Ben)
