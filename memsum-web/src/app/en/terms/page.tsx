import { LegalPage } from '@/components/LegalPage';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Memsum Terms of Service — service description, accounts, content rights, and liability.',
  alternates: { canonical: '/en/terms' },
};

export default function TermsEnPage() {
  return <LegalPage contentFile="terms.en.md" />;
}
