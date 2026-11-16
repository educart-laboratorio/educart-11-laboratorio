import type { Metadata } from 'next';
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: 'https://educart.pro/niveis-demo' },
};
export default function NiveisDemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
