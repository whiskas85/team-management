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
                   Il telefono non riesce a raggiungere il gestionale: di solito è la rete
                   di qui, non il server. Riprova fra un momento.
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

/*
 * Le notifiche che arrivano col gestionale chiuso.
 *
 * Il messaggio porta con sé solo titolo, testo e dove andare a finire: niente
 * nomi, niente numeri, niente dati di nessuno. Una notifica si legge sullo
 * schermo bloccato, e lì può leggerla chiunque abbia in mano il telefono.
 */
self.addEventListener('push', (evento) => {
  let avviso = { titolo: 'Zero Dark', testo: 'C’è una novità.', url: '/dashboard' };
  try {
    if (evento.data) avviso = { ...avviso, ...evento.data.json() };
  } catch {
    /* messaggio malformato: resta l'avviso generico, meglio di niente */
  }

  // I pulsanti si tagliano a due perché Android ne mostra due: mandarne tre
  // non darebbe errore, ne farebbe sparire uno in silenzio — e quello che
  // sparisce sarebbe proprio quello che nessuno andrebbe piu' a cercare.
  const azioni = Array.isArray(avviso.azioni) ? avviso.azioni.slice(0, 2) : [];

  evento.waitUntil(
    self.registration.showNotification(avviso.titolo, {
      body: avviso.testo,
      icon: '/icona-192.png',
      badge: '/icona-192.png',
      tag: avviso.tag,
      actions: azioni.map((a) => ({ action: a.id, title: a.testo })),
      data: { url: avviso.url, azioni },
    }),
  );
});

// Toccandola si va dove serve. Se il gestionale è già aperto da qualche parte
// si porta in primo piano quella scheda invece di aprirne un'altra.
function apri(url) {
  return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((aperte) => {
    for (const c of aperte) {
      if (c.url.includes(url) && 'focus' in c) return c.focus();
    }
    const prima = aperte[0];
    if (prima && 'navigate' in prima) return prima.navigate(url).then((c) => c && c.focus());
    return clients.openWindow(url);
  });
}

/*
 * Rispondere dalla notifica.
 *
 * Una domanda a cui si risponde «ci sono» non merita di far aprire
 * l'applicazione, aspettare il caricamento e cercare il pulsante: a quel punto
 * si risponde dopo, e dopo vuol dire mai. Il pulsante manda la risposta da qui,
 * con il gestionale chiuso.
 *
 * **Chi sei lo dice il cookie di sessione**, non il messaggio: il push viaggia
 * verso un dispositivo, e se bastasse lui a votare basterebbe avere in mano il
 * telefono di un altro. Se la sessione è scaduta non si inventa niente — si
 * apre la pagina, dove si fa l'accesso e si risponde come sempre.
 */
function rispondi(url, opzioneId) {
  const [, sondaggioId] = url.match(/\/sondaggi\/([^/?#]+)/) || [];
  if (!sondaggioId) return apri(url);

  return fetch('/api/voto', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sondaggioId, opzioneId }),
  })
    .then((r) => (r.ok ? r.json() : Promise.reject(r)))
    .then((esito) =>
      self.registration.showNotification('Risposta registrata', {
        body: esito.testo || 'Puoi cambiarla dal gestionale finché il sondaggio è aperto.',
        icon: '/icona-192.png',
        badge: '/icona-192.png',
        tag: 'voto-' + sondaggioId,
        data: { url },
      }),
    )
    // Rete assente, sessione scaduta, sondaggio chiuso nel frattempo: non si
    // finge che sia andata. Si apre la pagina, che sa dire cosa è successo.
    .catch(() => apri(url));
}

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = evento.notification.data?.url || '/dashboard';
  const azione = evento.action;

  evento.waitUntil(azione ? rispondi(url, azione) : apri(url));
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
