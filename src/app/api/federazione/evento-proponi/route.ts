import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { identita, mittente, normalizzaIndirizzo, profiloDi } from '@/lib/federazione';
import { diffondiEvento } from '@/lib/eventi-condivisi';
import { chiediCollegamentoConGettone, invitaCollegata } from '@/lib/reinviti';

export const dynamic = 'force-dynamic';

/**
 * Una squadra ospite che può invitarne altre ci propone una sua squadra
 * collegata per questa attività. Se siamo già collegati con quella, la
 * invitiamo subito. Altrimenti rispondiamo che serve un link: chi propone lo
 * chiede alla terza squadra e ce lo rimanda, e noi le chiediamo il
 * collegamento — l'invito parte quando lo accettano.
 *
 * Risposte: INVITATA, GIA_INVITATA, SERVE_GETTONE, COLLEGAMENTO_RICHIESTO,
 * IN_ATTESA_NOSTRA (hanno già chiesto loro di collegarsi a noi: decide un
 * nostro admin, e l'invito parte con l'accettazione).
 */
export async function POST(req: Request) {
  const m = await mittente(req, 'evento-proponi');
  if (!m.ok) return NextResponse.json({ errore: m.errore }, { status: 401 });
  const chi = m.dati.collegamento;
  const corpo = m.dati.corpo;
  const squadra =
    corpo.squadra && typeof corpo.squadra === 'object'
      ? (corpo.squadra as Record<string, unknown>)
      : {};
  const indirizzo = normalizzaIndirizzo(
    typeof squadra.indirizzo === 'string' ? squadra.indirizzo : null,
  );
  if (typeof corpo.id !== 'string' || !indirizzo) {
    return NextResponse.json({ errore: 'Illeggibile.' }, { status: 400 });
  }
  const proponente = await prisma.squadraOspite.findFirst({
    where: {
      eventId: corpo.id,
      collegamentoId: chi.id,
      invitaAltri: true,
      risposta: 'ACCETTATA',
    },
    include: { event: { select: { status: true } } },
  });
  if (chi.stato !== 'ATTIVO' || !proponente) {
    return NextResponse.json(
      { errore: 'Su questa attività non potete invitare altre squadre.' },
      { status: 403 },
    );
  }
  if (proponente.event.status === 'ANNULLATA') {
    return NextResponse.json({ errore: 'L’attività è annullata.' }, { status: 409 });
  }
  const io = await identita();
  if (indirizzo === io.indirizzo) {
    return NextResponse.json({ errore: 'Quella è la squadra che organizza.' }, { status: 400 });
  }
  if (indirizzo === chi.indirizzo) {
    return NextResponse.json({ errore: 'Siete già invitati voi.' }, { status: 400 });
  }
  const propostaDa = profiloDi(chi).nome;
  const eventId = corpo.id;
  const fatto = (stato: string, nome: string) => {
    revalidatePath(`/calendario/${eventId}`);
    return NextResponse.json({ stato, nome });
  };

  let c = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo } });
  if (c?.stato === 'ATTIVO') {
    const esito = await invitaCollegata(eventId, c, propostaDa);
    if (esito === 'GIA') return fatto('GIA_INVITATA', profiloDi(c).nome);
    await diffondiEvento(eventId).catch(() => null);
    return fatto('INVITATA', profiloDi(c).nome);
  }
  if (c?.stato === 'DA_ACCETTARE') {
    await invitaCollegata(eventId, c, propostaDa);
    return fatto('IN_ATTESA_NOSTRA', profiloDi(c).nome);
  }
  const token = typeof corpo.token === 'string' ? corpo.token : '';
  if (!token) return NextResponse.json({ stato: 'SERVE_GETTONE' });

  const r = await chiediCollegamentoConGettone(indirizzo, token);
  if (!r.ok) return NextResponse.json({ errore: r.errore }, { status: 502 });
  c = r.dati;
  await invitaCollegata(eventId, c, propostaDa);
  revalidatePath('/admin/collegamenti');
  if (c.stato === 'ATTIVO') {
    await diffondiEvento(eventId).catch(() => null);
    return fatto('INVITATA', profiloDi(c).nome);
  }
  return fatto('COLLEGAMENTO_RICHIESTO', profiloDi(c).nome);
}
