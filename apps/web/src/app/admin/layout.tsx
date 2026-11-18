import type { Metadata } from 'next';
import './admin.css';
import './houston95.css';

export const metadata: Metadata = {
  title: 'Painel Administrativo | EducART',
  manifest: '/images/educart-gestao.webmanifest',
  applicationName: 'EducART Gestão',
  appleWebApp: { capable: true, title: 'EducART Gestão', statusBarStyle: 'black-translucent' },
  icons: { icon: '/images/oficina-atores-simbolo.svg', apple: '/images/oficina-atores-simbolo.svg' },
  description: 'Gestão de inscrições, candidaturas e métricas do Portal EducART',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout-root">
      {children}
    </div>
  );
}
