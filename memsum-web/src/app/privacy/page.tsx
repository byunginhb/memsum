import { LegalPage } from '@/components/LegalPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description: 'Memsum 개인정보처리방침 — 처리 항목·목적·보관·이용자 권리 안내.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalPage contentFile="privacy.ko.md" />;
}
