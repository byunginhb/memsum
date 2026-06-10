// src/lib/categories.ts
//
// Memsum 캡처 카테고리 단일 진실(SSOT).
// DB enum(0005_category.sql) · process-capture 분류 · 홈 "주제별 묶음" ·
// 검색 카테고리 필터가 모두 이 모듈의 키·매핑을 공유한다.
//
// 왜 SSOT인가: 카테고리 키가 DB check 제약·Edge Function 화이트리스트·UI 라벨/아이콘
// 세 곳에 흩어지면 한 곳만 바꿔도 불일치가 난다. 키 목록·아이콘·i18n 키를 한 파일에
// 모아 한 번만 정의한다. (색은 디자인 토큰 책임이라 여기서 정의하지 않는다.)

import type { IconName } from '@/design/icons/Icon';

/**
 * 캡처 카테고리 키. DB check 제약(0005_category.sql)·process-capture enum과 동일 순서.
 * as const로 리터럴 유니온(CategoryKey)을 파생한다.
 */
export const CATEGORY_KEYS = [
  'marketing',
  'event',
  'receipt',
  'shopping',
  'info',
  'etc',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

/** 미분류 폴백 카테고리. */
const DEFAULT_CATEGORY: CategoryKey = 'etc';

/** 빠른 멤버십 검사용 Set(화이트리스트 검증). */
const CATEGORY_SET: ReadonlySet<string> = new Set(CATEGORY_KEYS);

/**
 * 임의 입력을 안전한 CategoryKey로 정규화한다.
 *
 * - raw가 enum 6종 중 하나면 그대로 사용한다.
 * - 그 외(null·미지정·알 수 없는 값)면 이벤트가 감지됐는지로 추정한다:
 *   이벤트가 있으면 'event', 없으면 'etc'.
 *
 * 왜 hasEvent 폴백인가: 구버전 행이나 분류 누락 시에도 일정이 잡힌 캡처는
 * 최소한 'event' 묶음에 들어가는 편이 UX에 자연스럽다.
 */
export function normalizeCategory(
  raw: string | null | undefined,
  hasEvent: boolean,
): CategoryKey {
  if (typeof raw === 'string' && CATEGORY_SET.has(raw)) {
    return raw as CategoryKey;
  }
  return hasEvent ? 'event' : DEFAULT_CATEGORY;
}

/**
 * 카테고리 → lucide 아이콘 이름(IconName). UI는 색·크기를 Icon에 맡기고
 * 이 매핑으로 아이콘만 고른다(이모지 금지, 디자인시스템.md §6).
 */
export const CATEGORY_ICON: Record<CategoryKey, IconName> = {
  marketing: 'tag',
  event: 'calendar',
  receipt: 'receipt',
  shopping: 'shopping-bag',
  info: 'newspaper',
  etc: 'folder',
};

/**
 * 카테고리 → i18n 키(ko.json/en.json의 home.category.*). 라벨은 표시 측에서
 * t(CATEGORY_I18N_KEY[key])로 가져온다(하드코딩 라벨 금지).
 */
export const CATEGORY_I18N_KEY: Record<CategoryKey, string> = {
  marketing: 'home.category.marketing',
  event: 'home.category.event',
  receipt: 'home.category.receipt',
  shopping: 'home.category.shopping',
  info: 'home.category.info',
  etc: 'home.category.etc',
};
