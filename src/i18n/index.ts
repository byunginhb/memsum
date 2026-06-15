import { getLocales } from 'expo-localization';

import en from './en.json';
import ko from './ko.json';

const dictionaries = { ko, en } as const;
export type Locale = keyof typeof dictionaries;

/**
 * 기기(시스템) 언어로 초기 로케일을 정한다 — 한국어면 'ko', 그 외는 'en'.
 * why: 사용자는 별도 언어 설정 없이 시스템 언어를 따라가길 원한다(설정에 언어 토글 없음).
 * getLocales()는 동기 호출(캐시된 기기 로케일)이라 모듈 로드 시점에 안전하게 읽는다.
 * 실패(드묾) 시 1차 시장인 한국어로 폴백한다.
 */
function detectSystemLocale(): Locale {
  try {
    const code = getLocales()[0]?.languageCode;
    return code === 'ko' ? 'ko' : 'en';
  } catch {
    return 'ko';
  }
}

let currentLocale: Locale = detectSystemLocale();

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/** 보간 파라미터. 값은 문자열/숫자만 받는다(사용자 대면 문구 안전). */
export type TParams = Record<string, string | number>;

/**
 * 플랫 도트 키 조회 + 보간. 누락 시 ko 폴백 → 키 문자열 반환(앱이 깨지지 않음).
 *
 * 보간: `{name}`·`{{name}}` 두 형태를 모두 치환한다(design.md §39는 `{{name}}` 사용).
 * 누락 파라미터는 원문 placeholder를 남겨 디버깅을 돕는다.
 */
export function t(key: string, params?: TParams): string {
  const dict = dictionaries[currentLocale] as Record<string, string>;
  const fallback = dictionaries.ko as Record<string, string>;
  const template = dict[key] ?? fallback[key] ?? key;
  if (!params) return template;
  return Object.keys(params).reduce((acc, name) => {
    const value = String(params[name]);
    // {{name}} 먼저, 그다음 {name} 치환(전역).
    return acc
      .split(`{{${name}}}`)
      .join(value)
      .split(`{${name}}`)
      .join(value);
  }, template);
}
