import { versioneIcona } from '@/lib/icona-app';
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
  const v = await versioneIcona();
  return {
    title: m.nomeGestionale,
    // anche per il browser: i messaggi d'accesso composti lì li leggono
    // (lib/messaggio-accesso)
    applicationName: m.nomeGestionale,
    other: { 'nome-squadra': m.nome },
    description: `Gestionale operativo della squadra ${m.nome}`,
    // installato dalla schermata iniziale si comporta da applicazione: iOS legge
    // queste, Android e desktop leggono il manifest
    appleWebApp: {
      capable: true,
      title: m.nomeGestionale,
      statusBarStyle: 'black-translucent',
    },
    // dal logo della squadra: la scheda del browser e la schermata di iPhone
    icons: {
      icon: [
        { url: `/api/icona/32?v=${v}`, sizes: '32x32', type: 'image/png' },
        { url: `/api/icona/192?v=${v}`, sizes: '192x192', type: 'image/png' },
        { url: `/api/icona/512?v=${v}`, sizes: '512x512', type: 'image/png' },
      ],
      apple: `/api/icona/apple?v=${v}`,
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
