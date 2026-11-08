import type { Metadata, Viewport } from 'next';
import { Manrope, Unbounded } from 'next/font/google';
import './globals.css';

const manrope = Manrope({ subsets: ['latin', 'cyrillic'], variable: '--font-manrope' });
const unbounded = Unbounded({ subsets: ['latin', 'cyrillic'], variable: '--font-unbounded', weight: ['500', '700'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#090b0e',
};

export const metadata: Metadata = {
  applicationName: 'PDRForge',
  title: 'PDRForge — CRM для PDR и кузовных мастерских',
  description: 'Заявки, конструктор повреждений, календарь мастеров и документы в одном кабинете.',
  appleWebApp: {
    capable: true,
    title: 'PDRForge',
    statusBarStyle: 'black',
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${manrope.variable} ${unbounded.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
