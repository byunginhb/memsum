// Liquid Glass 오버레이 토큰 — design.md §6.4 (Calm Glass 컨셉)
//
// "Solid Beneath, Glass Above": 기본 화면은 솔리드, 오버레이(Sheet 상단·NotificationCard·
// 캘린더 확인 모달)에만 Liquid Glass를 외과적으로 적용한다.
// expo-glass-effect의 GlassView가 iOS 26+에서 실제 Liquid Glass를 렌더하고,
// 미지원 환경에서는 아래 fallback(반투명 tint)으로 솔리드에 가깝게 표현한다.

/** 글래스 톤 토큰 (라이트/다크). tintColor는 GlassView에, fallback은 미지원 환경 View에 사용. */
export const glass = {
  light: {
    /** GlassView tintColor + 미지원 fallback 배경. 라벤더 12% 알파. */
    tint: 'rgba(124, 111, 232, 0.12)',
    /** 글래스 경계선(상단 하이라이트). */
    border: 'rgba(255, 255, 255, 0.18)',
    /** 미지원 환경 fallback 배경(불투명도 더 높여 솔리드에 가깝게). */
    fallback: 'rgba(244, 241, 253, 0.92)',
  },
  dark: {
    tint: 'rgba(181, 171, 238, 0.16)',
    border: 'rgba(255, 255, 255, 0.08)',
    fallback: 'rgba(38, 38, 53, 0.92)',
  },
} as const;

export type GlassToken = typeof glass.light;
