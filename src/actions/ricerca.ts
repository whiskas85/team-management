'use server';

import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { filtroVisibilita } from '@/lib/query';
import {
  inSquadra,
  isAdmin,
  isContatto,
  puoVedereNuovi,
  puoVedereOperatori,
} from '@/lib/domain';
import { fmtDate, nomeCompleto } from '@/lib/format';

/**
 * La ricerca che entra dentro le pagine.
 *
 * La riga in cima cercava fra le voci del menu, e per quelle bastava il
 * browser: sono venti, le ha già in mano, e nessuno le cerca davvero. Quello
 * che si cerca sono **le cose**: la gara di ottobre, il tesserato che si
 * chiama come un altro, il regolamento del mercatino. Per trovarle bisogna
 * chiedere al database, e chiedere al database vuol dire fare i conti con chi
 * sta chiedendo.
 *
 * **I permessi non si riscrivono qui.** Le attività passano dal filtro di
 * visibilità che usa il calendario, le persone dalla stessa regola con cui una
 * scheda si apre o non si apre. Una ricerca che trovasse un pezzo in più di
 * quello che la pagina mostra sarebbe il modo più silenzioso di far uscire i
 * dati: nessuno se ne accorge finché non è successo.
 */

export type RisultatoRicerca = {
  /** Dove appartiene: «Attività», «Persone», «Documenti». */
  gruppo: string;
  titolo: string;
  /** La riga sotto: la data, il ruolo, quello che aiuta a riconoscerlo. */
  dettaglio: string | null;
  href: string;
};

/** Quanti per gruppo: una ricerca che risponde con quaranta righe non risponde. */
const PER_GRUPPO = 5;

export async function cercaOvunque(q: string): Promise<RisultatoRicerca[]> {
  const testo = q.trim();
  // sotto i due caratteri qualunque cosa somiglia a qualunque cosa
  if (testo.length < 2) return [];

  const me = await requireUser();
  const admin = isAdmin(me.roles);
  const contiene = { contains: testo, mode: 'insensitive' as const };

  const [attivita, persone, documenti] = await Promise.all([
    /*
     * Le attività che questa persona può vedere, e nient'altro.
     *
     * Si cerca nel titolo e nel nome del campo: sono i due modi in cui una
     * giocata si chiama a voce — «la gara di Chieri», «quella all'Area Nord».
     * Prima le più vicine a oggi, in tutte e due le direzioni: di un nome che
     * si ripete ogni anno si cerca quasi sempre l'ultima o la prossima.
     */
    prisma.event.findMany({
      where: {
        ...filtroVisibilita(me.stato, admin, me.id),
        OR: [{ titolo: contiene }, { field: { nome: contiene } }, { luogo: contiene }],
      },
      orderBy: { inizio: 'desc' },
      take: PER_GRUPPO,
      select: {
        id: true,
        titolo: true,
        inizio: true,
        tipo: { select: { nome: true } },
        field: { select: { nome: true } },
      },
    }),

    /*
     * Le persone, con la regola con cui si apre una scheda.
     *
     * Chi è in squadra trova i compagni; chi segue i nuovi trova anche i
     * contatti. Chi non è né l'uno né l'altro non trova nessuno — ed è giusto:
     * dal gestionale non si pesca l'anagrafica della squadra.
     */
    (async () => {
      const vedeSquadra = inSquadra(me.stato) || puoVedereOperatori(me.roles);
      const vedeNuovi = puoVedereNuovi(me.roles);
      if (!vedeSquadra && !vedeNuovi) return [];

      const stati = [
        ...(vedeSquadra ? (['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] as const) : []),
        ...(vedeNuovi
          ? (['NUOVO', 'REGISTRATO', 'ATTESA_COMPILAZIONE', 'ATTESA_ACCETTAZIONE'] as const)
          : []),
      ];

      return prisma.user.findMany({
        where: {
          stato: { in: stati as never },
          OR: [{ nome: contiene }, { cognome: contiene }, { callsign: contiene }],
        },
        orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
        take: PER_GRUPPO,
        select: { id: true, nome: true, cognome: true, callsign: true, stato: true, roles: true },
      });
    })(),

    /*
     * I documenti: statuto e regolamenti, che si citano a voce e si cercano
     * per una frase che ci sta dentro — «quella cosa sul mercatino».
     */
    prisma.documento.findMany({
      where: { OR: [{ titolo: contiene }, { sottotitolo: contiene }, { testo: contiene }] },
      orderBy: [{ ordine: 'asc' }, { titolo: 'asc' }],
      take: PER_GRUPPO,
      select: { slug: true, titolo: true, sottotitolo: true, tipo: true },
    }),
  ]);

  const schedaDi = (u: { id: string; stato: string }) =>
    isContatto(u.stato as never)
      ? puoVedereNuovi(me.roles)
        ? `/admin/operatori/${u.id}`
        : null
      : inSquadra(me.stato) && inSquadra(u.stato as never)
        ? `/operatori/${u.id}`
        : puoVedereOperatori(me.roles)
          ? `/admin/operatori/${u.id}`
          : null;

  return [
    ...attivita.map((a) => ({
      gruppo: 'Attività',
      titolo: a.titolo,
      dettaglio: [a.tipo?.nome, fmtDate(a.inizio), a.field?.nome].filter(Boolean).join(' · '),
      href: `/calendario/${a.id}`,
    })),
    ...persone.flatMap((p) => {
      const href = schedaDi(p);
      return href
        ? [
            {
              gruppo: 'Persone',
              titolo: nomeCompleto(p),
              dettaglio: isContatto(p.stato) ? 'contatto' : 'in squadra',
              href,
            },
          ]
        : [];
    }),
    ...documenti.map((d) => ({
      gruppo: 'Documenti',
      titolo: d.titolo,
      dettaglio: d.sottotitolo ?? (d.tipo === 'STATUTO' ? 'statuto' : 'regolamento'),
      href: d.tipo === 'STATUTO' ? '/statuto' : `/regolamenti/${d.slug}`,
    })),
  ];
}
