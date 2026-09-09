import { NextResponse } from 'next/server';
import { conIdentita } from '@/lib/identita';
import { chiPresenta, segnaUso } from '@/lib/mcp/chiavi';
import { strumentiPer, strumentoDetto } from '@/lib/mcp/strumenti';
import { VERSIONE } from '@/lib/versione';

/**
 * La porta da cui entrano gli assistenti (MCP).
 *
 * Parla JSON-RPC 2.0 su una sola richiesta HTTP per volta: niente sessioni da
 * tenere aperte, niente stato da ricordare fra una chiamata e l'altra. Bastano
 * i quattro metodi che un assistente usa davvero — si presenta, chiede cosa può
 * fare, lo fa — e una porta che non tiene stato è una porta che non si rompe
 * quando l'applicazione si riavvia.
 *
 * L'autorizzazione è una chiave personale, e da lì in poi si lavora **per conto
 * di quella persona**: i permessi sono i suoi, controllati dallo stesso codice
 * che li controlla nelle pagine.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Versione del protocollo che sappiamo parlare. */
const PROTOCOLLO = '2025-06-18';

type Richiesta = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

const risposta = (id: string | number | null | undefined, result: unknown) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  result,
});

const errore = (id: string | number | null | undefined, code: number, message: string) => ({
  jsonrpc: '2.0',
  id: id ?? null,
  error: { code, message },
});

/** Il testo che l'assistente legge. Gli oggetti viaggiano come JSON leggibile. */
const contenuto = (valore: unknown) => ({
  content: [
    {
      type: 'text',
      text: typeof valore === 'string' ? valore : JSON.stringify(valore, null, 2),
    },
  ],
});

export async function POST(req: Request) {
  const autorizzazione = req.headers.get('authorization') ?? '';
  const token = autorizzazione.replace(/^Bearer\s+/i, '').trim();

  const chi = token ? await chiPresenta(token) : null;
  if (!chi) {
    // 401 con l'intestazione: è così che un client capisce che deve chiedere
    // una chiave invece di riprovare all'infinito
    return NextResponse.json(
      errore(null, -32001, 'Chiave mancante, revocata o non valida.'),
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="Zero Dark"' } },
    );
  }

  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json(errore(null, -32700, 'JSON non valido.'), { status: 400 });
  }

  // il protocollo ammette anche un elenco di chiamate in un colpo solo
  const richieste: Richiesta[] = Array.isArray(corpo) ? corpo : [corpo as Richiesta];

  const risposte = await conIdentita(chi.utente, async () => {
    const fatte = [];
    for (const r of richieste) {
      const esito = await eseguiUna(r, chi);
      if (esito) fatte.push(esito);
    }
    return fatte;
  });

  await segnaUso(chi.chiaveId);

  // le notifiche non hanno risposta: se erano tutte notifiche non si risponde
  // niente, e 202 dice "preso in carico" senza inventarsi un corpo
  if (risposte.length === 0) return new NextResponse(null, { status: 202 });

  return NextResponse.json(Array.isArray(corpo) ? risposte : risposte[0]);
}

async function eseguiUna(r: Richiesta, chi: Awaited<ReturnType<typeof chiPresenta>>) {
  if (!chi) return null;
  const me = chi.utente;
  const metodo = r.method ?? '';

  // le notifiche si riconoscono dal non avere id: si accettano e basta
  if (metodo.startsWith('notifications/')) return null;

  switch (metodo) {
    case 'initialize':
      return risposta(r.id, {
        protocolVersion: PROTOCOLLO,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'zero-dark-gestionale', version: VERSIONE },
        instructions:
          `Stai lavorando dentro il gestionale della squadra Zero Dark, per conto di ` +
          `${me.nome} ${me.cognome}${me.callsign ? ` (${me.callsign})` : ''}. ` +
          `Puoi fare solo ciò che potrebbe fare questa persona con il suo account: ` +
          `gli strumenti che non le competono non compaiono nemmeno. ` +
          `Gli strumenti che cambiano i dati agiscono a suo nome — prima di usarli, chiedile conferma.`,
      });

    case 'ping':
      return risposta(r.id, {});

    case 'tools/list':
      return risposta(r.id, {
        tools: strumentiPer(me).map((s) => ({
          name: s.nome,
          description: s.descrizione,
          inputSchema: s.parametri,
        })),
      });

    // dichiariamo solo gli strumenti, ma certi client chiedono lo stesso:
    // un elenco vuoto è una risposta, un errore sarebbe un allarme per niente
    case 'resources/list':
      return risposta(r.id, { resources: [] });
    case 'prompts/list':
      return risposta(r.id, { prompts: [] });

    case 'tools/call': {
      const params = (r.params ?? {}) as { name?: string; arguments?: Record<string, unknown> };
      const strumento = strumentoDetto(params.name ?? '', me);
      if (!strumento) {
        return risposta(r.id, {
          ...contenuto(
            `Lo strumento "${params.name}" non esiste, oppure non è fra quelli che ${me.nome} può usare.`,
          ),
          isError: true,
        });
      }

      try {
        const esito = await strumento.esegui(me, params.arguments ?? {});
        return risposta(r.id, contenuto(esito));
      } catch (e) {
        // un rifiuto del gestionale ("Posti esauriti") non è un guasto: torna
        // come esito dello strumento, così l'assistente può spiegarlo
        const motivo = e instanceof Error ? e.message : 'Operazione non riuscita.';
        return risposta(r.id, { ...contenuto(motivo), isError: true });
      }
    }

    default:
      return errore(r.id, -32601, `Metodo non gestito: ${metodo}`);
  }
}

/** Un GET serve solo a capire se si è bussato alla porta giusta. */
export async function GET() {
  return NextResponse.json(
    {
      nome: 'Zero Dark Ops',
      protocollo: PROTOCOLLO,
      versione: VERSIONE,
      come: 'POST JSON-RPC 2.0 con intestazione Authorization: Bearer <chiave personale>.',
    },
    { status: 200 },
  );
}
