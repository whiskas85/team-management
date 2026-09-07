/*
 * Service worker del gestionale.
 *
 * Fa una cosa sola e la fa con prudenza: tiene in cache i file statici — quelli
 * con il nome che cambia a ogni build, quindi non possono diventare vecchi — e
 * lascia passare tutto il resto verso il server.
 *
 * Le pagine NON si mettono in cache di proposito. Qui dentro ci sono elenchi di
 * persone, quote e dati sanitari: una pagina salvata sul telefono resterebbe
 * leggibile dopo la disconnessione e mostrerebbe numeri vecchi come se fossero
 * quelli di adesso. Meglio una schermata che dice "sei offline" che una che
 * mente.
 */

const CACHE = 'zero-dark-statici-v1';

// da qui passa tutto: senza un gestore di fetch il telefono non considera
// l'applicazione installabile
self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request;
  if (richiesta.method !== 'GET') return;

  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;

  const statico =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/logo.jpg' ||
    /^\/(icona-|apple-touch-icon)/.test(url.pathname);

  if (statico) {
    // prima la cache: sono file immutabili, il nome cambia quando cambia il file
    evento.respondWith(
      caches.match(richiesta).then(
        (salvato) =>
          salvato ||
          fetch(richiesta).then((risposta) => {
            if (risposta.ok) {
              const copia = risposta.clone();
              caches.open(CACHE).then((c) => c.put(richiesta, copia));
            }
            return risposta;
          }),
      ),
    );
    return;
  }

  // tutto il resto va al server. Se non risponde, alle sole navigazioni si dà
  // una pagina che spiega cosa succede invece dell'errore del browser
  if (richiesta.mode === 'navigate') {
    evento.respondWith(
      fetch(richiesta).catch(
        () =>
          new Response(
            `<!doctype html><html lang="it"><head><meta charset="utf-8">
             <meta name="viewport" content="width=device-width,initial-scale=1">
             <title>Zero Dark — offline</title></head>
             <body style="background:#050605;color:#d7dbd7;font-family:system-ui,sans-serif;
                          display:flex;min-height:100vh;align-items:center;justify-content:center;
                          margin:0;padding:2rem;text-align:center">
               <div>
                 <p style="font-size:.75rem;letter-spacing:.3em;color:#7bd88f">ZERO DARK</p>
                 <h1 style="font-size:1.25rem;margin-top:1rem">Nessuna connessione</h1>
                 <p style="font-size:.875rem;color:#8b918b;margin-top:.75rem">
                   Il gestionale gira sul computer del team: serve essere sulla rete ZeroTier,
                   e quel computer deve essere acceso.
                 </p>
                 <button onclick="location.reload()"
                   style="margin-top:1.5rem;padding:.5rem 1rem;border-radius:.375rem;
                          border:1px solid #7bd88f;background:transparent;color:#7bd88f">
                   Riprova
                 </button>
               </div>
             </body></html>`,
            { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 },
          ),
      ),
    );
  }
});

// a ogni versione nuova si buttano via le cache vecchie
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomi) => Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('install', () => self.skipWaiting());
