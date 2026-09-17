import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { genereAllegato } from '@/lib/allegati';
import { isAdmin, vedeAttivitaSquadra } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';

/**
 * Il file di un allegato, servito a chi ha diritto di leggerlo.
 *
 * Due porte, e una sola stanza. Da dentro entra chi ha fatto l'accesso e vede
 * quell'attività — le stesse regole della sua scheda, scritte qui perché un
 * indirizzo indovinato non deve aprire quello che la pagina non mostra. Da
 * fuori entra chi ha il link di un invito, `?invito=<token>`, e **solo sugli
 * allegati marcati pubblici**: il token è la chiave di quella porta, non di
 * tutte.
 *
 * L'HTML caricato da qualcuno è codice di qualcun altro servito dal nostro
 * indirizzo: senza precauzioni potrebbe leggersi la sessione di chi lo apre.
 * Per questo esce sotto `Content-Security-Policy: sandbox`, che lo mette in
 * un'origine sua e gli spegne gli script — e la pagina che lo mostra lo
 * rinchiude una seconda volta nel proprio riquadro. Due lucchetti sulla stessa
 * porta, perché è la porta da cui si entrerebbe.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const url = new URL(req.url);
  const invito = url.searchParams.get('invito');

  const allegato = await prisma.allegatoEvento.findUnique({
    where: { id },
    include: { event: { select: { id: true, status: true, visibilita: true } } },
  });
  if (!allegato) return new NextResponse('Non trovato', { status: 404 });

  const e = allegato.event;

  if (invito) {
    // Da fuori: vale il token di *questa* attività, e solo su quello che è
    // stato marcato pubblico. Di una bozza non si dice nemmeno che esiste.
    const ospite = await prisma.squadraOspite.findUnique({
      where: { token: invito },
      select: { eventId: true },
    });
    if (!ospite || ospite.eventId !== e.id) return new NextResponse('Non trovato', { status: 404 });
    if (!allegato.pubblico || e.status === 'CREATA') {
      return new NextResponse('Non trovato', { status: 404 });
    }
  } else {
    const me = await getCurrentUser();
    if (!me) return new NextResponse('Non autenticato', { status: 401 });

    const admin = isAdmin(me.roles);
    if (e.status === 'CREATA' && !admin) return new NextResponse('Non trovato', { status: 404 });

    // le stesse tre condizioni con cui si apre la scheda: chi amministra, chi
    // è fra i partecipanti, chi ha diritto di vedere quel tipo di attività
    const partecipo =
      (await prisma.eventRsvp.count({ where: { eventId: e.id, userId: me.id } })) > 0;
    const aperta =
      e.visibilita === 'TUTTI' || (e.visibilita === 'TEAM' && vedeAttivitaSquadra(me.stato));
    if (!admin && !partecipo && !aperta) return new NextResponse('Non trovato', { status: 404 });
  }

  const scarica = url.searchParams.get('scarica') === '1';
  const genere = genereAllegato(allegato.mimeType);

  let buffer;
  try {
    buffer = await readFile(percorsoAssoluto(allegato.filePath));
  } catch {
    return new NextResponse('File non disponibile', { status: 404 });
  }

  const intestazioni: Record<string, string> = {
    'Content-Type': allegato.mimeType,
    'Content-Disposition': `${scarica ? 'attachment' : 'inline'}; filename="${encodeURIComponent(
      allegato.fileName,
    )}"`,
    // il tipo è quello che abbiamo deciso noi al caricamento: il browser non
    // deve mettersi a indovinarne un altro guardando dentro il file
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-store',
  };

  if (genere === 'html') {
    // origine sua, niente script, niente moduli, niente chiamate altrove. Le
    // immagini e i fogli di stile restano: un book esportato da un altro
    // programma senza di quelli non si legge.
    intestazioni['Content-Security-Policy'] =
      "sandbox; default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline' https:; font-src data: https:";
  }

  return new NextResponse(new Uint8Array(buffer), { headers: intestazioni });
}
