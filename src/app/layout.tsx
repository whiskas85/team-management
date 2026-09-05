import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zero Dark Team — Gestionale',
  description: 'Gestionale operativo del team softair Zero Dark',
};

export const viewport: Viewport = {
  themeColor: '#050605',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
