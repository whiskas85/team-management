import type { Metadata, Viewport } from 'next';
import './globals.css';
import { RegistraApp } from '@/components/RegistraApp';
import { marchio } from '@/lib/mia-squadra';
import { temaPagina } from '@/lib/tema-server';

/*
 * Il nome viene da «La mia squadra»: la scheda del browser e l'app installata
 * su iPhone si chiamano come il gestionale di questa squadra.
 */
export async function generateMetadata(): Promise<Metadata> {
  const m = await marchio();
  return {
    title: m.nomeGestionale,
    description: `Gestionale operativo della squadra ${m.nome}`,
    // installato dalla schermata iniziale si comporta da applicazione: iOS legge
    // queste, Android e desktop leggono il manifest
    appleWebApp: {
      capable: true,
      title: m.nomeGestionale,
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
}

export async function generateViewport(): Promise<Viewport> {
  const { t } = await temaPagina();
  return {
    // la barra del telefono prende il fondo del tema
    themeColor: t.colori.bg,
    width: 'device-width',
    initialScale: 1,
    // a schermo intero la barra di sistema non deve coprire i contenuti
    viewportFit: 'cover',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Il tema si scrive qui, sul server, in testa alla pagina: arriva già coi
  // suoi colori, senza il lampo del tema di partenza prima di quello giusto.
  const { t, css } = await temaPagina();
  return (
    <html lang="it" data-contrasto={t.forte ? '' : undefined}>
      <head>
        <style id="tema" dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body className="min-h-[100dvh] antialiased">
        <RegistraApp />
        {children}
      </body>
    </html>
  );
}
