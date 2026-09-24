import { prisma } from './db';
import { avvisaPersona } from './avvisi';
import { fmtDateTime } from './format';
import { loRiguarda, risultato } from './sondaggi';

/**
 * L'avviso che un sondaggio si è chiuso, con dentro com'è andata.
 *
 * Chi ha risposto vuole sapere cosa si è deciso, e senza questo avviso lo
 * scoprirebbe solo tornando a guardare — cioè quasi mai. La notifica porta già
 * il risultato, e toccandola si apre il sondaggio.
 *
 * **Solo notifica, niente WhatsApp:** è una cosa da sapere, non da fare, e un
 * messaggio nel gruppo per ogni sondaggio chiuso sarebbe rumore. Chi non ha le
 * notifiche lo trova nello storico.
 *
 * Parte **una volta sola**: si segna quando, e riaprendo il sondaggio il segno
 * si toglie, così alla chiusura successiva riparte con il risultato nuovo.
 */
export async function avvisaChiusuraSondaggio(id: string): Promise<number> {
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: {
      opzioni: {
        orderBy: { ordine: 'asc' },
        select: { id: true, testo: true, quando: true, voti: { select: { userId: true } } },
      },
    },
  });
  if (!s || s.chiusuraAvvisataIl) return 0;

  // prima il segno, poi l'avviso: se due chiusure arrivano insieme — il giro
  // automatico e un clic — ne parte una sola
  const segnato = await prisma.sondaggio.updateMany({
    where: { id, chiusuraAvvisataIl: null },
    data: { chiusuraAvvisataIl: new Date() },
  });
  if (segnato.count === 0) return 0;

  const testo = comeEAndato(s.opzioni);

  const persone = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] } },
    select: { id: true, stato: true },
  });
  const chi = persone.filter(
    (p) => loRiguarda(s.destinatari, p.stato) || p.id === s.creatoDaId,
  );

  await Promise.all(
    chi.map((p) =>
      avvisaPersona(p.id, {
        titolo: `Sondaggio chiuso: ${s.domanda}`,
        testo,
        url: `/sondaggi/${s.id}`,
        // lo stesso della domanda: sul telefono prende il posto di quella
        tag: `sondaggio-${s.id}`,
      }),
    ),
  );
  return chi.length;
}

/** Il risultato in una riga: chi ha vinto e con quanti voti, o com'è finita. */
function comeEAndato(
  opzioni: { id: string; testo: string; quando: Date | null; voti: { userId: string }[] }[],
): string {
  const votanti = new Set(opzioni.flatMap((o) => o.voti.map((v) => v.userId))).size;
  if (votanti === 0) return 'Nessuno ha risposto.';

  const nome = (o: (typeof opzioni)[number]) => (o.quando ? fmtDateTime(o.quando) : o.testo);
  const esito = risultato(opzioni);

  if (esito.vincitrice) {
    const o = opzioni.find((x) => x.id === esito.vincitrice)!;
    return `Ha vinto «${nome(o)}»: ${o.voti.length} su ${votanti} ${
      votanti === 1 ? 'persona' : 'persone'
    }.`;
  }
  const pari = opzioni.filter((o) => o.voti.length === esito.massimo).map(nome);
  return `Pari fra ${pari.map((n) => `«${n}»`).join(' e ')}, con ${esito.massimo} ${
    esito.massimo === 1 ? 'voto' : 'voti'
  } ciascuna.`;
}

/**
 * I sondaggi scaduti da poco e non ancora avvisati: li manda il giro
 * automatico. Solo quelli degli ultimi due giorni — uno scaduto un mese fa e
 * mai avvisato (il giro era spento) non è più una notizia.
 */
export async function avvisaSondaggiScaduti(): Promise<{ avvisati: number }> {
  const adesso = new Date();
  const scaduti = await prisma.sondaggio.findMany({
    where: {
      chiusuraAvvisataIl: null,
      chiusoIl: null,
      scadeIl: { lte: adesso, gt: new Date(adesso.getTime() - 2 * 86_400_000) },
    },
    select: { id: true },
  });
  let avvisati = 0;
  for (const s of scaduti) avvisati += await avvisaChiusuraSondaggio(s.id);
  return { avvisati };
}
