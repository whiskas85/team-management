import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistraApp } from '@/components/RegistraApp';

export const metadata: Metadata = {
  title: 'Zero Dark Ops',
  description: 'Gestionale operativo del team softair Zero Dark',
  // installato dalla schermata iniziale si comporta da applicazione: iOS legge
  // queste, Android e desktop leggono il manifest
  appleWebApp: {
    capable: true,
    title: 'Zero Dark Ops',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icona-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icona-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#050605',
  width: 'device-width',
  initialScale: 1,
  // a schermo intero la barra di sistema non deve coprire i contenuti
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">
        <RegistraApp />
        {children}
      </body>
    </html>
  );
}
