import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AccessibilityWidget } from '@/components/AccessibilityWidget';
import { WhatsAppFlutuante } from '@/components/WhatsAppFlutuante';

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  robots: { index: true, follow: true },
  metadataBase: new URL('https://educart.pro'),
  title: 'Portal EducART | Formação, arte e expressão',
  description:
    'Conheça a EducART, Núcleo de Formação de Atores, e sua formação para teatro, cinema e televisão em Salvador.',
  keywords: [
    'Portal EducART',
    'EducART',
    'Oficina de Atores Salvador',
    'Oficina de Atores Salvador',
    'Curso de Teatro Salvador',
    'Interpretação para TV e Cinema',
    'EducART Salvador',
    'Artes Cênicas Bahia',
  ],
  alternates: {
    canonical: 'https://educart.pro',
  },
  openGraph: {
    title: 'Formação em teatro e expressão | Portal EducART',
    description:
      'Formação de atores em Salvador para teatro, cinema e televisão, com expressão, interpretação e desenvolvimento artístico.',
    url: 'https://educart.pro',
    siteName: 'Portal EducART',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('educart_theme');
                  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  var highContrast = localStorage.getItem('educart_high_contrast');
                  if (highContrast === 'true') {
                    document.documentElement.classList.add('high-contrast');
                  }
                  var fontScale = localStorage.getItem('educart_font_size');
                  if (fontScale && fontScale !== '1') {
                    document.documentElement.style.setProperty('--font-scale', fontScale);
                  }
                } catch (e) {}
              })();
            `,
          }}
        ></script>
      </head>
      <body>
        {/* Analytics será ativado em produção somente após avaliação de privacidade e consentimento. */}
        {/* Link "Pular para conteúdo" precisa vir ANTES do conteúdo na ordem do teclado.
            O widget original é compartilhado também por /admin e /admin/login. */}
        <AccessibilityWidget />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <WhatsAppFlutuante />
      </body>
    </html>
  );
}
