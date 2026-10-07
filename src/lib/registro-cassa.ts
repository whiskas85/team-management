import { prisma } from './db';
import { umanizza } from './format';
import { vedeAttivitaSquadra } from './domain';

/**
 * Il registro di una cassa, e i suoi conti: lo stesso per la cassa del club e
 * per le altre.
 *
 * Una cassa è una cassa: entrano quote, crediti, pagamenti degli ospiti, ed
 * entrate e uscite scritte a mano; escono rimborsi e spese. La cassa del club
 * è quella di partenza (cassaId vuoto, lib/casse), le altre sono di chi le
 * gestisce — ma i conti si fanno allo stesso modo, e qui si fanno una volta.
 */

export type Movimento = {
  id: string;
  tipo: string;
  descrizione: string;
  importo: unknown;
  data: Date;
  categoria: string | null;
  note: string | null;
  metodoId: string | null;
  /** Se la spesa era un acquisto: la merce entrata e quanti pezzi. */
  carico?: { articoloId: string; quantita: number } | null;
  /** A chi va un'uscita, se è un operatore: con i suoi metodi per pagarlo. */
  beneficiarioId?: string | null;
  beneficiario?: {
    nome: string;
    cognome: string;
    metodiPersonali: { id: string; nome: string; istruzioni: string | null }[];
  } | null;
  /** Scontrino, fattura o ricevuta: foto o PDF. */
  allegatoPath?: string | null;
  allegatoNome?: string | null;
};

export type Metodo = { id: string; nome: string };
export type Operatore = {
  id: string;
  nome: string;
  metodi: { id: string; nome: string; istruzioni: string | null }[];
};
/** Un articolo di magazzino, come si sceglie: categoria e nome. */
export type Merce = { id: string; nome: string; categoria: string | null };

/**
 * Una riga del registro. Ci finiscono sia i movimenti scritti a mano sia le
 * quote effettivamente incassate: prima queste ultime pesavano sul saldo
 * senza comparire da nessuna parte, e non si capiva da dove venissero i soldi.
 */
export type Voce = {
  chiave: string;
  data: Date;
  entrata: boolean;
  importo: number;
  descrizione: string;
  dettaglio: string | null;
  categoria: string | null;
  metodo: string | null;
  registratoDa: string | null;
  link: string | null;
  /** Valorizzato solo sulle voci a mano: le altre si correggono dal pagamento. */
  movimento: Movimento | null;
};

export type ContiCassa = {
  saldo: number;
  incassiQuote: number;
  quoteDaIncassare: number;
  rimborsiErogati: number;
  rimborsiDaErogare: number;
  entrateManuali: number;
  usciteManuali: number;
  entrateN: number;
  usciteN: number;
  creditoResiduo: number;
};

const nome = (u: { nome: string; cognome: string; callsign?: string | null }) =>
  `${u.cognome} ${u.nome}${u.callsign ? ` · ${u.callsign}` : ''}`;

/** Dove si correggono i pagamenti di questa cassa. */
export const paginaPagamenti = (cassaId: string | null) =>
  cassaId ? `/cassa?cassa=${cassaId}&filtro=pagati` : '/admin/pagamenti?filtro=pagati';

export async function leggiRegistro(cassaId: string | null) {
  const [movimenti, pagamenti, metodi, crediti, ospiti] = await Promise.all([
    prisma.movimentoCassa.findMany({
      where: { cassaId },
      orderBy: { data: 'desc' },
      include: {
        metodo: { select: { nome: true } },
        registratoBy: { select: { nome: true, cognome: true } },
        // serve al modulo di modifica: senza, riaprirlo e salvare toglierebbe
        // in silenzio la merce entrata con quella spesa
        carico: { select: { articoloId: true, quantita: true } },
        beneficiario: {
          select: {
            nome: true,
            cognome: true,
            metodiPersonali: {
              orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
              select: { id: true, nome: true, istruzioni: true },
            },
          },
        },
      },
    }),
    // solo i soldi di questa cassa: quelli delle altre non ci passano, nemmeno
    // come riga informativa
    prisma.payment.findMany({
      where: { cassaId },
      orderBy: { pagatoIl: 'desc' },
      select: {
        id: true,
        tipo: true,
        descrizione: true,
        pagato: true,
        importo: true,
        status: true,
        pagatoIl: true,
        updatedAt: true,
        eventId: true,
        user: { select: { nome: true, cognome: true, callsign: true } },
        metodo: { select: { nome: true } },
        recordedBy: { select: { nome: true, cognome: true } },
      },
    }),
    prisma.metodoPagamento.findMany({
      where: { attivo: true, cassaId },
      orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true },
    }),
    // il registro dei crediti: versamenti, usi sulle quote, resi
    prisma.movimentoCredito.findMany({
      where: { cassaId },
      include: {
        user: { select: { nome: true, cognome: true, callsign: true } },
        metodo: { select: { nome: true } },
        registratoDa: { select: { nome: true, cognome: true } },
      },
    }),
    // I pagamenti confermati delle squadre ospiti collegate. Nella cassa del
    // club diventano un movimento del registro quando si confermano (e lì
    // sono già contati); nelle altre casse si contano da qui.
    cassaId
      ? prisma.versamentoSquadra.findMany({
          where: {
            confermatoIl: { not: null },
            squadraOspite: { collegamentoId: { not: null }, event: { cassaOspitiId: cassaId } },
          },
          select: {
            id: true,
            importo: true,
            confermatoIl: true,
            metodo: true,
            squadraOspite: { select: { nome: true, event: { select: { id: true, titolo: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);

  // Quanto di ogni quota è stato pagato col credito: quei soldi sono entrati
  // col versamento, e nel registro non si contano una seconda volta.
  const dalCredito = new Map<string, number>();
  for (const c of crediti) {
    if (c.paymentId) dalCredito.set(c.paymentId, (dalCredito.get(c.paymentId) ?? 0) - Number(c.importo));
  }
  // il credito che la cassa tiene ancora per conto delle persone
  const creditoResiduo = crediti.reduce((t, c) => t + Number(c.importo), 0);

  const somma = <T>(v: T[], f: (x: T) => number) => v.reduce((t, x) => t + f(x), 0);
  const aperta = (s: string) => s !== 'PAGATO' && s !== 'ANNULLATO' && s !== 'NON_GESTITO';

  const quote = pagamenti.filter((p) => p.tipo !== 'RIMBORSO');
  const rimborsi = pagamenti.filter((p) => p.tipo === 'RIMBORSO');
  const entrate = movimenti.filter((m) => m.tipo === 'ENTRATA');
  const uscite = movimenti.filter((m) => m.tipo === 'USCITA');
  const incassiOspiti = somma(ospiti, (v) => Number(v.importo));

  const conti: ContiCassa = {
    // quello che entra dalle attività, ospiti compresi
    incassiQuote: somma(quote, (p) => Number(p.pagato)) + incassiOspiti,
    quoteDaIncassare: somma(
      quote.filter((p) => aperta(p.status)),
      (p) => Number(p.importo) - Number(p.pagato),
    ),
    rimborsiErogati: somma(rimborsi, (p) => Number(p.pagato)),
    rimborsiDaErogare: somma(
      rimborsi.filter((p) => p.status !== 'PAGATO' && p.status !== 'ANNULLATO'),
      (p) => Number(p.importo) - Number(p.pagato),
    ),
    entrateManuali: somma(entrate, (m) => Number(m.importo)),
    usciteManuali: somma(uscite, (m) => Number(m.importo)),
    entrateN: entrate.length,
    usciteN: uscite.length,
    creditoResiduo,
    saldo: 0,
  };
  // il credito è denaro in cassa: quello usato è già dentro le quote, quello
  // che resta si aggiunge qui
  conti.saldo =
    conti.incassiQuote -
    conti.rimborsiErogati +
    conti.entrateManuali -
    conti.usciteManuali +
    conti.creditoResiduo;

  // registro unico: i movimenti a mano e le quote realmente incassate, in
  // ordine di data. Un rimborso erogato è denaro che esce, quindi va in uscita.
  const daMano: Voce[] = movimenti.map((m) => ({
    chiave: `m-${m.id}`,
    data: m.data,
    entrata: m.tipo === 'ENTRATA',
    importo: Number(m.importo),
    descrizione: m.descrizione,
    dettaglio:
      [m.beneficiario ? `a ${m.beneficiario.nome} ${m.beneficiario.cognome}` : null, m.note]
        .filter(Boolean)
        .join(' · ') || null,
    categoria: m.categoria,
    metodo: m.metodo?.nome ?? null,
    registratoDa: m.registratoBy ? `${m.registratoBy.nome} ${m.registratoBy.cognome}` : null,
    link: null,
    movimento: m,
  }));

  const daAttivita: Voce[] = pagamenti
    .filter((p) => Number(p.pagato) - (dalCredito.get(p.id) ?? 0) > 0.001)
    .map((p) => ({
      chiave: `p-${p.id}`,
      data: p.pagatoIl ?? p.updatedAt,
      entrata: p.tipo !== 'RIMBORSO',
      importo: Number(p.pagato) - (dalCredito.get(p.id) ?? 0),
      descrizione: p.descrizione,
      dettaglio: nome(p.user),
      categoria: umanizza(p.tipo),
      metodo: p.metodo?.nome ?? null,
      registratoDa: p.recordedBy ? `${p.recordedBy.nome} ${p.recordedBy.cognome}` : null,
      link: p.eventId ? `/calendario/${p.eventId}` : paginaPagamenti(cassaId),
      movimento: null,
    }));

  const daOspiti: Voce[] = ospiti.map((v) => ({
    chiave: `o-${v.id}`,
    data: v.confermatoIl!,
    entrata: true,
    importo: Number(v.importo),
    descrizione: `${v.squadraOspite?.nome ?? 'Squadra ospite'} · ${v.squadraOspite?.event.titolo ?? ''}`,
    dettaglio: null,
    categoria: 'Squadre ospiti',
    metodo: v.metodo,
    registratoDa: null,
    link: v.squadraOspite ? `/calendario/${v.squadraOspite.event.id}` : null,
    movimento: null,
  }));

  // i versamenti a credito sono soldi che entrano, i resi soldi che escono;
  // l'uso su una quota no, è un passaggio interno
  const daCrediti: Voce[] = crediti
    .filter((c) => c.tipo === 'VERSAMENTO' || c.tipo === 'DA_QUOTA' || c.tipo === 'RESO')
    .map((c) => ({
      chiave: `c-${c.id}`,
      data: c.data,
      entrata: c.tipo !== 'RESO',
      importo: Math.abs(Number(c.importo)),
      descrizione:
        c.tipo === 'VERSAMENTO'
          ? 'Versamento a credito'
          : c.tipo === 'DA_QUOTA'
            ? `Credito da «${c.descrizione}»`
            : 'Credito restituito',
      dettaglio: `${nome(c.user)}${c.note ? ` · ${c.note}` : ''}`,
      categoria: 'Credito',
      metodo: c.metodo?.nome ?? null,
      registratoDa: c.registratoDa ? `${c.registratoDa.nome} ${c.registratoDa.cognome}` : null,
      link: cassaId ? `/cassa?cassa=${cassaId}` : '/admin/pagamenti',
      movimento: null,
    }));

  return { conti, daMano, daAttivita: [...daAttivita, ...daOspiti, ...daCrediti], metodi };
}

/** A chi può andare un'uscita: gli operatori, non i nuovi. */
export async function operatoriPerUscite(): Promise<Operatore[]> {
  return (
    await prisma.user.findMany({
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        stato: true,
        metodiPersonali: {
          orderBy: [{ ordine: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, nome: true, istruzioni: true },
        },
      },
    })
  )
    .filter((u) => vedeAttivitaSquadra(u.stato))
    .map((u) => ({ id: u.id, nome: nome(u), metodi: u.metodiPersonali }));
}

/** Il magazzino del club: una spesa della sua cassa può essere un acquisto. */
export function merciDelMagazzino(): Promise<Merce[]> {
  return prisma.articoloMagazzino.findMany({
    orderBy: [{ categoria: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, categoria: true },
  });
}
