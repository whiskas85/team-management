import { tavolozza } from '@/lib/tema';
import { temaSquadra } from '@/lib/tema-server';
import type { MetadataRoute } from 'next';
import { marchio } from '@/lib/mia-squadra';
import { versioneIcona } from '@/lib/icona-app';

// il nome si legge da «La mia squadra» a ogni richiesta
export const dynamic = 'force-dynamic';

/**
 * Il biglietto da visita che serve al telefono per installare il gestionale
 * come applicazione: nome, icone, colori e la pagina da cui parte.
 *
 * `display: standalone` toglie la barra degli indirizzi: aperto dalla schermata
 * iniziale sembra un'app, non un sito dentro un browser. Si parte dalla
 * dashboard e non dalla radice perché chi apre l'icona ha già fatto l'accesso
 * quasi sempre; chi non l'ha fatto viene mandato al login lo stesso.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // il fondo del tema della squadra: è il colore con cui l'app si apre
  const fondo = tavolozza(await temaSquadra()).colori.bg;
  const m = await marchio();
  const v = await versioneIcona();
  return {
    name: m.nomeGestionale,
    short_name: m.nomeGestionale,
    description: `Calendario, adesioni, certificati e quote della squadra ${m.nome}`,
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: fondo,
    theme_color: fondo,
    lang: 'it',
    categories: ['sports', 'productivity'],
    // dal logo della squadra (src/lib/icona-app.ts); ?v= cambia col logo
    icons: [
      { src: `/api/icona/192?v=${v}`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `/api/icona/512?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      // con margine attorno: Android ritaglia l'icona nella forma che preferisce
      { src: `/api/icona/maskable-512?v=${v}`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Nel menu «Condividi» del telefono: dall'app PayPal, Satispay o della
    // banca si condivide il proprio link (o l'IBAN) e si arriva già nel
    // modulo del metodo per essere pagati, compilato. Android sì, iPhone no:
    // Safari non lo supporta.
    share_target: {
      action: '/condividi',
      method: 'GET',
      params: { title: 'titolo', text: 'testo', url: 'link' },
    },
    shortcuts: [
      { name: 'Calendario', url: '/calendario' },
      { name: 'Miei pagamenti', url: '/pagamenti' },
    ],
  };
}
