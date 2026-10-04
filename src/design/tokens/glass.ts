// Liquid Glass 오버레이 토큰.
//
// 기본 화면은 솔리드, 오버레이(Sheet 상단 등)에만 Liquid Glass를 쓴다.
// expo-glass-effect의 GlassView가 iOS 26+에서 실제 Liquid Glass를 렌더하고,
// 미지원 환경에서는 fallback(반투명 종이/잉크 면)으로 솔리드에 가깝게 표현한다.

/** 글래스 톤 토큰 (라이트/다크). tintColor는 GlassView에, fallback은 미지원 환경 View에 사용. */
export const glass = {
  light: {
    /** GlassView tintColor. 종이색 살짝. */
    tint: 'rgba(242, 243, 240, 0.24)',
    /** 글래스 경계선. */
    border: 'rgba(13, 14, 18, 0.10)',
    /** 미지원 환경 대체 배경(솔리드에 가깝게). */
    fallback: 'rgba(250, 250, 248, 0.94)',
  },
  dark: {
    tint: 'rgba(30, 31, 37, 0.32)',
    border: 'rgba(242, 243, 240, 0.10)',
    fallback: 'rgba(22, 23, 28, 0.94)',
  },
} as const;

export type GlassToken = typeof glass.light;
