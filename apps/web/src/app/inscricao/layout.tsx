import type { Metadata } from 'next';
export const metadata: Metadata = {
  alternates: { canonical: 'https://educart.pro/inscricao' },
  robots: { index: true, follow: true },
};
export default function InscricaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
