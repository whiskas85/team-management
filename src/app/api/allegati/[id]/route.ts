import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { genereAllegato } from '@/lib/allegati';
import { isAdmin, vedeAttivitaSquadra } from '@/lib/domain';
import { percorsoAssoluto } from '@/lib/storage';
import { chiDalLink } from '@/lib/allegati-link';

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
 * un'origine sua, anonima — e la pagina che lo mostra lo rinchiude una seconda
 * volta nel proprio riquadro. Due lucchetti sulla stessa porta, perché è la
 * porta da cui si entrerebbe.
 *
 * Gli script girano: un book esportato senza non apre le sue schede. Non
 * rischiano niente perché nell'origine anonima la sessione non c'è (il cookie
 * è httpOnly e non viaggia verso di noi da lì), e `connect-src 'none'` gli
 * impedisce di chiamare chiunque: può muovere solo la propria pagina.
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
    if (!allegato.pubblico || e.status === 'CREATA' || e.status === 'INVITATA') {
      return new NextResponse('Non trovato', { status: 404 });
    }
  } else {
    // Da dentro: con la sessione, oppure con il link firmato con cui
    // l'allegato si apre fuori dall'applicazione — sull'iPhone la finestra
    // esterna la sessione non ce l'ha. La persona è quella scritta nel link, e
    // da qui in giù le regole sono le stesse.
    const daLink = chiDalLink(id, url);
    const me =
      (await getCurrentUser()) ??
      (daLink
        ? await prisma.user.findFirst({
            where: { id: daLink, stato: { not: 'DISABILITATO' } },
            select: { id: true, roles: true, stato: true },
          })
        : null);
    if (!me) return new NextResponse('Non autenticato', { status: 401 });

    const admin = isAdmin(me.roles);
    if ((e.status === 'CREATA' || e.status === 'INVITATA') && !admin)
      return new NextResponse('Non trovato', { status: 404 });

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
    // origine sua e anonima, script sì ma senza nessuno da chiamare, niente
    // moduli né finestre. Immagini, fogli di stile e caratteri restano: un
    // book esportato da un altro programma senza di quelli non si legge.
    intestazioni['Content-Security-Policy'] = [
      // modals: il book può stampare (print) e mostrare i suoi avvisi
      'sandbox allow-scripts allow-modals',
      "default-src 'none'",
      "script-src 'unsafe-inline' 'unsafe-eval' data: blob: https:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "style-src 'unsafe-inline' https:",
      "font-src data: https:",
      "connect-src 'none'",
      "form-action 'none'",
    ].join('; ');
  }

  const corpo =
    genere === 'html' && !scarica ? Buffer.from(conAttesa(buffer.toString('utf8'))) : buffer;
  return new NextResponse(new Uint8Array(corpo), { headers: intestazioni });
}

/**
 * Finché il file non è arrivato tutto, il book non si tocca.
 *
 * I book esportati da altri programmi hanno spesso i pulsanti in cima e lo
 * script che li fa funzionare in fondo, dopo immagini incorporate da un mega e
 * più: il pulsante «Stampa» si vede molto prima che esista quello che deve
 * fare, e premerlo dà «printAll is not defined». Correggere ogni book non
 * serve — il prossimo arriva uguale — quindi è il gestionale, servendolo, a
 * mettergli davanti un velo «Caricamento…» che si toglie a caricamento finito.
 *
 * Il file salvato non cambia: si aggiunge solo a quello che si serve per
 * leggerlo. Scaricato, esce com'è.
 */
function conAttesa(html: string): string {
  // un riquadro vero, attaccato alla radice mentre la testata si legge:
  // copre la pagina e si prende i tocchi finché il file non è arrivato tutto.
  // Si toglie a caricamento finito, o comunque dopo 20 secondi: un carattere
  // esterno che non risponde non deve tenere il book chiuso per sempre
  const velo =
    '<script>(function(){var v=document.createElement("div");v.id="zd-attesa";' +
    'v.textContent="Caricamento del documento…";' +
    'v.setAttribute("style","position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(14,17,14,.92);color:#cfd8cf;font:15px system-ui,sans-serif");' +
    'document.documentElement.appendChild(v);' +
    'function via(){v.remove()}addEventListener("load",via);setTimeout(via,20000)})()</script>';
  const testa = html.match(/<head[^>]*>/i);
  if (testa?.index !== undefined) {
    const dopo = testa.index + testa[0].length;
    return html.slice(0, dopo) + velo + html.slice(dopo);
  }
  return velo + html;
}
