import en from './en.json';
import ko from './ko.json';

const dictionaries = { ko, en } as const;
export type Locale = keyof typeof dictionaries;

// Week 1: 한국어 기본. expo-localization 연동은 다음 단계.
let currentLocale: Locale = 'ko';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * 플랫 도트 키 조회. 누락 시 ko 폴백 → 키 문자열 반환(앱이 깨지지 않음).
 */
export function t(key: string): string {
  const dict = dictionaries[currentLocale] as Record<string, string>;
  const fallback = dictionaries.ko as Record<string, string>;
  return dict[key] ?? fallback[key] ?? key;
}
