import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { mittente } from '@/lib/federazione';
import { diffondiEvento } from '@/lib/eventi-condivisi';

export const dynamic = 'force-dynamic';

const testo = (v: unknown, max: number) =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const data = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Una squadra ospite a cui abbiamo dato la **gestione** ha cambiato la nostra
 * attività: titolo, date, luoghi, collegamenti. La si applica qui, dove
 * l'attività vive, e la si rimanda a tutte le squadre invitate — loro
 * comprese, così tutti vedono la stessa cosa.
 *
 * Solo chi ha la gestione, e solo i campi che si condividono: costi, quote,
 * stato e rilascio restano nostri.
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-modifica');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const c = m.dati.collegamento;
  const { id, campi } = m.dati.corpo as { id?: unknown; campi?: Record<string, unknown> };
  if (typeof id !== 'string' || !campi || typeof campi !== 'object') {
    return NextResponse.json({ errore: 'Illeggibile.' }, { status: 400 });
  }
  const ospite = await prisma.squadraOspite.findFirst({
    where: { eventId: id, collegamentoId: c.id, accesso: 'GESTIONE', risposta: 'ACCETTATA' },
    include: { event: { include: { field: true } } },
  });
  if (c.stato !== 'ATTIVO' || !ospite) {
    return NextResponse.json({ errore: 'Su questa attività non avete la gestione.' }, { status: 403 });
  }
  const e = ospite.event;

  const dati: Prisma.EventUncheckedUpdateInput = {};
  if ('titolo' in campi && testo(campi.titolo, 200)) dati.titolo = testo(campi.titolo, 200)!;
  if ('descrizione' in campi) dati.descrizione = testo(campi.descrizione, 20_000);
  if ('inizio' in campi && data(campi.inizio)) dati.inizio = data(campi.inizio)!;
  if ('fine' in campi) dati.fine = data(campi.fine);
  if ('durataOre' in campi) {
    const n = numero(campi.durataOre);
    dati.durataOre = n !== null && n > 0 && n < 1000 ? Math.round(n) : null;
  }
  for (const k of ['ritrovo', 'linkRiunione'] as const) {
    if (k in campi) dati[k] = testo(campi[k], 1000);
  }
  for (const k of ['ritrovoLat', 'ritrovoLng'] as const) {
    if (k in campi) dati[k] = numero(campi[k]);
  }
  if ('oraRitrovo' in campi) dati.oraRitrovo = data(campi.oraRitrovo);
  // Il luogo: se è quello che mandiamo noi per il nostro campo, non è
  // cambiato e il campo resta; altrimenti vale il loro indirizzo scritto.
  if ('luogo' in campi) {
    const nostro = e.field
      ? [e.field.nome, e.field.indirizzo, e.field.citta].filter(Boolean).join(', ')
      : e.luogo;
    const loro = testo(campi.luogo, 500);
    if (loro !== nostro) {
      dati.fieldId = null;
      dati.luogo = loro;
      dati.luogoLat = numero(campi.luogoLat);
      dati.luogoLng = numero(campi.luogoLng);
    }
  }
  const inizio = (dati.inizio as Date | undefined) ?? e.inizio;
  const fine = 'fine' in dati ? (dati.fine as Date | null) : e.fine;
  if (fine && fine < inizio) {
    return NextResponse.json({ errore: 'La fine non può precedere l’inizio.' }, { status: 400 });
  }

  if (Object.keys(dati).length > 0) {
    await prisma.event.update({ where: { id: e.id }, data: dati });
    await diffondiEvento(e.id).catch(() => null);
    revalidatePath('/calendario');
    revalidatePath(`/calendario/${e.id}`);
  }
  return NextResponse.json({ ok: true });
}
