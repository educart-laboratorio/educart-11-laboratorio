import type { Metadata } from 'next';
export const metadata: Metadata = { alternates: { canonical: 'https://educart.pro/formacao' } };
export default function FormacaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
