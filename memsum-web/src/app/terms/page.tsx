import { LegalPage } from '@/components/LegalPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '이용약관',
  description: 'Memsum 이용약관 — 서비스 내용·계정·콘텐츠 권리·책임 안내.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalPage contentFile="terms.ko.md" />;
}
