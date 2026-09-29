import { randomBytes } from 'node:crypto';
import type { CollegamentoSquadra, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  chiediIdentita,
  identita,
  manda,
  profiloDi,
  profiloNostro,
  profiloRicevuto,
  type Risposta,
} from '@/lib/federazione';
import { scaricaLogo } from '@/lib/federazione-coda';
import { diffondiEvento } from '@/lib/eventi-condivisi';

/**
 * Re-inviti: una squadra ospite che può invitarne altre propone una sua
 * squadra collegata. L'invito lo fa sempre chi organizza, perché l'attività
 * vive da lui: la terza squadra dev'essere collegata anche a lui, e se non lo
 * è ancora parte la richiesta di collegamento (docs/COLLEGAMENTO-SQUADRE.md).
 */

/**
 * La squadra collegata fra gli ospiti di una nostra attività, se non c'è già.
 * Arriva di là solo quando il collegamento è attivo: finché è una richiesta,
 * l'invito aspetta qui e parte da solo quando accettano.
 */
export async function invitaCollegata(
  eventId: string,
  c: Pick<CollegamentoSquadra, 'id' | 'profilo' | 'squadraId'>,
  propostaDa: string | null,
): Promise<'NUOVA' | 'GIA'> {
  const gia = await prisma.squadraOspite.findFirst({ where: { eventId, collegamentoId: c.id } });
  if (gia) return 'GIA';
  const nome = profiloDi(c).nome;
  // invitata prima col link, con lo stesso nome: la stessa riga, ora collegata
  const colLink = await prisma.squadraOspite.findFirst({ where: { eventId, nome } });
  const collegata = {
    collegamentoId: c.id,
    accesso: 'VISUALIZZAZIONE' as const,
    invitaAltri: false,
    risposta: 'IN_ATTESA' as const,
    propostaDa,
  };
  if (colLink) {
    await prisma.squadraOspite.update({ where: { id: colLink.id }, data: collegata });
  } else {
    await prisma.squadraOspite.create({
      data: {
        eventId,
        squadraId: c.squadraId,
        nome,
        token: randomBytes(16).toString('base64url'),
        ...collegata,
      },
    });
  }
  return 'NUOVA';
}

/**
 * Chiediamo il collegamento a un gestionale, con un link che ci ha dato lui
 * (chiesto per noi da una squadra collegata a tutti e due). La squadra
 * dell'anagrafica si ritrova per nome, o nasce; il collegamento resta
 * «richiesto» finché di là non accettano.
 */
export async function chiediCollegamentoConGettone(
  indirizzo: string,
  token: string,
): Promise<Risposta<CollegamentoSquadra>> {
  const io = await identita();
  const loro = await chiediIdentita(indirizzo);
  if (!loro.ok) return { ok: false, errore: `il loro gestionale ${loro.errore}` };
  const esito = await manda<{ stato?: string; profilo?: unknown }>(indirizzo, 'richiesta', {
    token,
    chiavePubblica: io.chiavePubblica,
    profilo: await profiloNostro(),
  });
  if (!esito.ok) return { ok: false, errore: `richiesta non arrivata: ${esito.errore}` };

  const attivo = esito.dati.stato === 'ATTIVO';
  const profilo = profiloRicevuto(esito.dati.profilo) ?? loro.dati.profilo;
  const esistente = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo } });
  let squadraId = esistente?.squadraId ?? null;
  if (!squadraId) {
    const omonima = await prisma.squadraEsterna.findUnique({
      where: { nome: profilo.nome },
      include: { collegamento: { select: { id: true } } },
    });
    if (omonima && !omonima.collegamento) squadraId = omonima.id;
    else if (!omonima) {
      const nuova = await prisma.squadraEsterna.create({
        data: {
          nome: profilo.nome,
          citta: profilo.citta,
          provincia: profilo.provincia,
          sito: profilo.sito,
          email: profilo.email,
          telefono: profilo.telefono,
          note: profilo.descrizione,
          stato: 'ATTIVA',
        },
      });
      squadraId = nuova.id;
    }
  }
  const dati = {
    chiavePubblica: loro.dati.chiavePubblica,
    stato: attivo ? ('ATTIVO' as const) : ('RICHIESTO' as const),
    squadraId,
    profilo: profilo as unknown as Prisma.InputJsonValue,
    richiestoIl: new Date(),
    attivoDal: attivo ? new Date() : null,
    chiusoIl: null,
  };
  const c = await prisma.collegamentoSquadra.upsert({
    where: { indirizzo },
    create: { indirizzo, ...dati },
    update: dati,
  });
  await scaricaLogo(c, profilo).catch(() => null);
  return { ok: true, dati: c };
}

/**
 * Il collegamento è appena diventato attivo: gli inviti che aspettavano
 * (proposti da un'altra squadra mentre la richiesta era in corso) partono.
 */
export async function diffondiInvitiInAttesa(collegamentoId: string) {
  const inviti = await prisma.squadraOspite.findMany({
    where: {
      collegamentoId,
      risposta: 'IN_ATTESA',
      event: { inizio: { gte: new Date(Date.now() - 86_400_000) } },
    },
    select: { eventId: true },
  });
  for (const i of inviti) await diffondiEvento(i.eventId).catch(() => null);
}
