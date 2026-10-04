import { Children } from 'react';
import type { ReactNode } from 'react';
import { Platform, Text as RNText } from 'react-native';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';

import { useFontsReady } from '@/design/theme/fonts';
import { useTheme } from '@/design/theme/useTheme';
import { fontFamily, letterSpacingFor, typography } from '@/design/tokens';
import type { SemanticColorName, TextVariant } from '@/design/tokens';

import { keepHangulWords } from './keep-hangul-words';

export type TextProps = RNTextProps & {
  /** 명세 §3 타입 스케일. 기본 body. */
  variant?: TextVariant;
  /** 의미 색 토큰 키. 기본 textPrimary. */
  color?: SemanticColorName;
  children?: ReactNode;
};

const MONO_VARIANTS: ReadonlySet<TextVariant> = new Set(['mono', 'monoLg']);

/** 폰트 미로딩 시 mono 대체 서체(시스템 기본 고정폭). */
const SYSTEM_MONO = Platform.select({ ios: 'Menlo', default: 'monospace' });

// 한글 연속 구간(사이 공백 포함). JetBrains Mono에는 한글 글리프가 없다.
// U+2060(keepHangulWords가 음절 사이에 넣는 WORD JOINER)도 구간 안 글자로 친다.
const HANGUL_RUN =
  /([\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u2060]+(?:\s+[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF\u2060]+)*)/;

/**
 * 한글 단어 중간 줄바꿈("결/혼식") 방지는 플랫폼마다 기본 수단을 쓴다.
 * - iOS: lineBreakStrategyIOS="hangul-word".
 * - 웹: CSS word-break: keep-all(긴 문자열은 RNW 기본 overflow-wrap: break-word가 넘침을 막는다).
 *   글자를 바꾸지 않으니 찾기(Ctrl+F)·접근성 이름도 원문 그대로다.
 * - 안드로이드: RN이 단어 단위 옵션을 노출하지 않아, 문자열 자식의 한글 음절 사이에 U+2060을 넣는다.
 *   U+2060은 폭·소리가 없는 서식 문자라 TalkBack이 무시한다 — accessibilityLabel을 따로 둘 필요 없다.
 */
const NEEDS_WORD_JOINER = Platform.OS === 'android';
// TextStyle 타입에 없는 웹 전용 CSS 속성이라 단언한다(RNW는 모르는 속성을 CSS로 그대로 넘긴다).
const WEB_KEEP_ALL = Platform.OS === 'web' ? ({ wordBreak: 'keep-all' } as unknown as TextStyle) : null;

function joinHangulWords(children: ReactNode): ReactNode {
  if (typeof children === 'string') return keepHangulWords(children);
  return Children.map(children, (child) => (typeof child === 'string' ? keepHangulWords(child) : child));
}

/**
 * mono 텍스트 속 한글 구간만 Wanted Sans로 감싼다. 예: "09:41 · 택배" → 숫자는 mono, "택배"는 sans.
 * 문자열이 아닌 자식(중첩 요소)은 그대로 둔다.
 */
function splitHangulRuns(children: ReactNode, hangulStyle: TextStyle): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string' || !HANGUL_RUN.test(child)) return child;
    // split에 캡처 그룹이 있으면 홀수 인덱스가 한글 구간이다.
    return child.split(HANGUL_RUN).map((part, i) =>
      i % 2 === 1 ? (
        <RNText key={i} style={hangulStyle}>
          {part}
        </RNText>
      ) : (
        part
      ),
    );
  });
}

/**
 * variant의 글꼴 스타일(크기·행간·자간·서체)을 돌려준다. 서체 로드 전/실패면 시스템 폰트 + fontWeight.
 * TextInput처럼 공용 Text를 못 쓰는 곳에서 쓴다(TextInput에는 lineHeight를 빼고 쓸 것 — 안드로이드 잘림).
 */
export function useTypeStyle(variant: TextVariant): TextStyle {
  const fontsReady = useFontsReady();
  const scale = typography[variant];
  const isMono = MONO_VARIANTS.has(variant);
  return {
    fontSize: scale.size,
    lineHeight: scale.line,
    letterSpacing: letterSpacingFor(variant),
    ...(fontsReady
      ? { fontFamily: scale.family }
      : { fontFamily: isMono ? SYSTEM_MONO : undefined, fontWeight: scale.weight }),
  };
}

/**
 * 공용 Text — 화면 코드에서 RN Text 대신 쓴다.
 *
 * - 굵기별 fontFamily를 숨긴다(안드로이드는 fontWeight로 굵기를 못 고름).
 * - 서체 로드 전/실패 시엔 fontFamily를 빼고 시스템 폰트 + fontWeight로 그려 깨지지 않는다.
 * - mono 계열 속 한글 구간은 JetBrains Mono에 글리프가 없으므로 Wanted Sans SemiBold로 감싼다.
 * - style prop이 마지막에 붙어 개별 덮어쓰기가 가능하다.
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  style,
  children,
  ...rest
}: TextProps): ReactNode {
  const { colors } = useTheme();
  const fontsReady = useFontsReady();
  const typeStyle = useTypeStyle(variant);

  // 선택·복사 가능한 글은 원문 그대로 둔다(복사본에 보이지 않는 U+2060이 섞이지 않게).
  const joined = NEEDS_WORD_JOINER && !rest.selectable ? joinHangulWords(children) : children;
  // 시스템 고정폭(Menlo 등)은 OS가 한글을 대체해 주므로 커스텀 서체일 때만 구간을 나눈다.
  const content =
    MONO_VARIANTS.has(variant) && fontsReady
      ? splitHangulRuns(joined, { fontFamily: fontFamily.semibold })
      : joined;

  return (
    // iOS: 한글 단어 중간 줄바꿈("결/혼식") 방지. 웹·안드로이드는 위 WEB_KEEP_ALL·joinHangulWords가 맡는다.
    <RNText lineBreakStrategyIOS="hangul-word" {...rest} style={[typeStyle, WEB_KEEP_ALL, { color: colors[color] }, style]}>
      {content}
    </RNText>
  );
}
