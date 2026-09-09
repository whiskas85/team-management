import type { MetadataRoute } from 'next';

/**
 * Il biglietto da visita che serve al telefono per installare il gestionale
 * come applicazione: nome, icone, colori e la pagina da cui parte.
 *
 * `display: standalone` toglie la barra degli indirizzi: aperto dalla schermata
 * iniziale sembra un'app, non un sito dentro un browser. Si parte dalla
 * dashboard e non dalla radice perché chi apre l'icona ha già fatto l'accesso
 * quasi sempre; chi non l'ha fatto viene mandato al login lo stesso.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Zero Dark Ops',
    short_name: 'Zero Dark Ops',
    description: 'Calendario, adesioni, certificati e quote del team Zero Dark',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#050605',
    theme_color: '#050605',
    lang: 'it',
    categories: ['sports', 'productivity'],
    icons: [
      { src: '/icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      // con margine attorno: Android ritaglia l'icona nella forma che preferisce
      { src: '/icona-mascherabile-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Calendario', url: '/calendario' },
      { name: 'Miei pagamenti', url: '/pagamenti' },
    ],
  };
}
