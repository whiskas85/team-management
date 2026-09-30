import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import { nomeCompleto } from './format';
import { valeAncora } from './mie-assicurazioni';
import type { Assicurazione } from '@/components/CardAssicurazione';

/** Le assicurazioni emesse, pronte per le card: dalla più recente. */
export async function elencoAssicurazioni(
  dove: Prisma.TesseraGiornalieraWhereInput,
  conChi = false,
  limite = 300,
): Promise<Assicurazione[]> {
  const righe = await prisma.tesseraGiornaliera.findMany({
    where: { ...dove, stato: 'ASSICURATO' },
    orderBy: [{ giorno: 'desc' }, { emessaIl: 'desc' }],
    take: limite,
    include: {
      event: { select: { id: true, titolo: true } },
      user: {
        select: {
          nome: true,
          cognome: true,
          callsign: true,
          dataNascita: true,
          luogoNascita: true,
          codiceFiscale: true,
        },
      },
    },
  });
  // chi le ha fatte partire: una query sola per tutti
  const chi = conChi
    ? new Map(
        (
          await prisma.user.findMany({
            where: { id: { in: righe.map((r) => r.richiestaDaId).filter((x): x is string => !!x) } },
            select: { id: true, nome: true, cognome: true, callsign: true },
          })
        ).map((u) => [u.id, u.callsign ?? nomeCompleto(u)]),
      )
    : null;
  const adesso = new Date();
  return righe.map((r) => ({
    id: r.id,
    giorno: r.giorno,
    valeIl: r.valeIl,
    codice: r.codice,
    polizzaInfortuni: r.polizzaInfortuni,
    emessaIl: r.emessaIl,
    richiestaIl: r.richiestaIl,
    valida: valeAncora(r, adesso),
    event: r.event,
    assicurato: r.user,
    ...(chi ? { stipulataDa: r.richiestaDaId ? (chi.get(r.richiestaDaId) ?? '—') : null } : {}),
  }));
}
