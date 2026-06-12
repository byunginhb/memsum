import { LegalPage } from '@/components/LegalPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Memsum Privacy Policy — what we process, why, retention, and your rights.',
  alternates: { canonical: '/en/privacy' },
};

export default function PrivacyEnPage() {
  return <LegalPage contentFile="privacy.en.md" />;
}
