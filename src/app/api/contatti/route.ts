import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { accogliContatto, sitoDaChiave, type ContattoInArrivo } from '@/lib/contatti-esterni';

/**
 * La porta per i siti esterni: qui consegnano i moduli «vuoi provare?».
 *
 * Bussa un sito collegato dal gestionale, con la sua chiave:
 *
 *     POST /api/contatti
 *     Authorization: Bearer zds_…
 *     X-Indirizzo-Visitatore: <l'indirizzo di chi ha compilato il modulo>
 *     { nome, cognome, telefono, email, dataNascita: "AAAA-MM-GG", zona,
 *       come, messaggio, consenso: true }
 *
 * La chiave si usa **da server a server**, mai dal browser: messa in una
 * pagina, la leggerebbe chiunque. Per questo qui non c'è CORS — un browser
 * che prova a chiamare questa porta da un altro sito viene fermato da sé.
 *
 * L'indirizzo del visitatore lo passa il sito, perché è lui a vederlo: serve al
 * tetto dei moduli all'ora, che altrimenti vedrebbe tutti arrivare dal sito.
 *
 * Senza chiave, o con una chiave sbagliata, la risposta è 404: dire «qui c'è
 * qualcosa ma non puoi» a chi bussa a caso è già dirne troppo.
 */
export async function POST(req: Request) {
  const chiave = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  const sito = await sitoDaChiave(chiave);
  if (!sito) return new NextResponse('Non trovato', { status: 404 });

  let dati: ContattoInArrivo;
  try {
    dati = await req.json();
  } catch {
    return NextResponse.json({ ok: false, errore: 'Richiesta malformata.' }, { status: 400 });
  }

  const ip = req.headers.get('x-indirizzo-visitatore')?.trim() || null;
  const esito = await accogliContatto(dati, { ip, sitoId: sito.id });

  await prisma.sitoCollegato.update({ where: { id: sito.id }, data: { ultimoUsoIl: new Date() } });
  if (esito.ok && !esito.scartato) {
    revalidatePath('/admin/contatti');
    revalidatePath('/', 'layout');
  }

  // «scartato» (il tetto) non si racconta: per chi manda spam è andata
  return esito.ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, errore: esito.errore }, { status: 422 });
}
