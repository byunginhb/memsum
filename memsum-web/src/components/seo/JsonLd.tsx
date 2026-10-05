import { serializeJsonLd } from '@/lib/structured-data';

/** 구조화 데이터 스크립트 — 서버에서 정적으로 렌더돼 JS 없이도 크롤러가 읽는다. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // 직접 만든 정적 객체를 직렬화(< 이스케이프)한 값이라 외부 입력이 섞이지 않는다.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
