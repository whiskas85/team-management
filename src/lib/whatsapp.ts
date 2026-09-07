/**
 * Il gestionale parla con il ponte WhatsApp, non con WhatsApp.
 *
 * Il ponte è un servizio a parte (cartella `whatsapp/`) che tiene la sessione
 * aperta come farebbe un telefono collegato. Sta dentro la rete di Docker e non
 * pubblica porte: da fuori non lo raggiunge nessuno.
 *
 * Perché non l'API ufficiale di Meta: quella **non scrive nei gruppi**, e i
 * gruppi sono il posto dove questa squadra si parla. Il prezzo di questa scelta
 * è che si esce dai termini di servizio di WhatsApp — motivo per cui va usato
 * un numero dedicato, non quello personale di chi gestisce il team.
 */

const BASE = process.env.WHATSAPP_URL ?? 'http://whatsapp:3001';
const SEGRETO = process.env.SEGRETO_WHATSAPP ?? '';

export type StatoPonte = {
  collegato: boolean;
  numero: string | null;
  /** Immagine del codice da inquadrare col telefono, finché non è collegato. */
  qr: string | null;
  errore: string | null;
};

export type GruppoWhatsapp = { id: string; nome: string; partecipanti: number };

async function chiama<T>(
  percorso: string,
  opzioni: { metodo?: string; corpo?: unknown } = {},
): Promise<{ ok: true; dati: T } | { ok: false; errore: string }> {
  try {
    const r = await fetch(`${BASE}${percorso}`, {
      method: opzioni.metodo ?? 'GET',
      headers: {
        'x-segreto': SEGRETO,
        ...(opzioni.corpo ? { 'content-type': 'application/json' } : {}),
      },
      body: opzioni.corpo ? JSON.stringify(opzioni.corpo) : undefined,
      // il ponte è in rete locale: se non risponde in fretta è spento
      signal: AbortSignal.timeout(20_000),
    });

    const dati = await r.json().catch(() => null);
    if (!r.ok) {
      return { ok: false, errore: (dati as { errore?: string })?.errore ?? `errore ${r.status}` };
    }
    return { ok: true, dati: dati as T };
  } catch (e) {
    const motivo = (e as Error).name === 'TimeoutError' ? 'non risponde' : (e as Error).message;
    return { ok: false, errore: `Il ponte WhatsApp ${motivo}.` };
  }
}

/** Com'è messo il collegamento: serve alla pagina per sapere cosa mostrare. */
export async function statoPonte(): Promise<StatoPonte> {
  const r = await chiama<StatoPonte>('/stato');
  return r.ok
    ? r.dati
    : { collegato: false, numero: null, qr: null, errore: r.errore };
}

/** I gruppi di cui il numero collegato fa parte, per sceglierne uno. */
export async function gruppiWhatsapp() {
  const r = await chiama<GruppoWhatsapp[]>('/gruppi');
  return r.ok ? r.dati : [];
}

/** `a` è un numero oppure l'id di un gruppo: il ponte capisce da solo. */
export function inviaWhatsapp(a: string, testo: string) {
  return chiama<{ id: string }>('/invia', { metodo: 'POST', corpo: { a, testo } });
}

export function scollegaPonte() {
  return chiama<{ ok: boolean }>('/scollega', { metodo: 'POST' });
}
