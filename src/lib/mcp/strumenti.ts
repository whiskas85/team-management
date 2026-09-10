import { prisma } from '../db';
import type { SessionUser } from '../auth';
import {
  certificatoInScadenza,
  etichettaRisposta,
  isContatto,
  puoAmministrare,
  puoGestireEventi,
  puoGestirePagamenti,
  puoVedereNuovi,
  puoVedereOperatori,
  statoEffettivo,
  vedeAttivitaSquadra,
} from '../domain';
import { comeChiamare, fmtDate, fmtDateTime, fmtEuro, nomeCompleto } from '../format';
import { filtroVisibilita } from '../query';
import { quotaPer } from '../quote';
import { documentoDa, elencoDocumenti, puoLeggere } from '../documenti';
import { SCATENANTI } from '../messaggi';
import { rispondiEvento, salvaEvento } from '@/actions/eventi';
import { segnaPagato } from '@/actions/pagamenti';
import { aggiungiTesti } from '@/actions/messaggi';

/**
 * Quello che un assistente può fare nel gestionale.
 *
 * Due regole reggono tutto il file. La prima: ogni strumento dichiara il
 * permesso che serve, e sono gli stessi permessi delle pagine — chi non vede
 * una cosa nel gestionale non la vede nemmeno da qui, e non se la ritrova
 * nemmeno nell'elenco degli strumenti. La seconda: chi scrive non reimplementa
 * niente. Le azioni che cambiano i dati sono quelle dei moduli, chiamate per
 * conto della persona: stessi controlli, stessi messaggi, e nessuna scorciatoia
 * che un domani si dimentica di aggiornare quando cambia una regola.
 */

type Parametri = {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
};

export type Strumento = {
  nome: string;
  descrizione: string;
  parametri: Parametri;
  /**
   * Chi può usarlo. Assente = chiunque abbia un account.
   *
   * Guarda la persona intera e non solo i ruoli, perché non tutto dipende da
   * un incarico: statuto e squadra li vede chi è dentro, che è una questione
   * di stato. Ed è l'unico posto dove la regola è scritta — chi non passa di
   * qui non trova lo strumento nemmeno nell'elenco.
   */
  permesso?: (me: SessionUser) => boolean;
  /** Vero se tocca i dati: serve a raccontarlo, non a impedirlo. */
  scrive?: boolean;
  esegui: (me: SessionUser, arg: Record<string, unknown>) => Promise<unknown>;
};

const testo = (arg: Record<string, unknown>, k: string) => {
  const v = arg[k];
  return typeof v === 'string' ? v.trim() : '';
};

const numero = (arg: Record<string, unknown>, k: string) => {
  const v = arg[k];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(testo(arg, k));
  return Number.isFinite(n) && testo(arg, k) !== '' ? n : null;
};

/**
 * Esegue un'azione del gestionale e ne restituisce l'esito com'è.
 *
 * Le azioni parlano già la lingua giusta ("Posti esauriti", "Serve il
 * certificato agonistico"): tradurle qui vorrebbe dire riscriverle, e due
 * versioni della stessa frase invecchiano in modo diverso.
 */
async function esitoAzione(
  azione: (prev: { errore?: string; ok?: string }, fd: FormData) => Promise<{ errore?: string; ok?: string }>,
  campi: Record<string, string | null | undefined>,
) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campi)) if (v != null && v !== '') fd.set(k, String(v));

  const esito = await azione({}, fd);
  if (esito.errore) throw new Error(esito.errore);
  return { fatto: esito.ok ?? 'Fatto.' };
}

// ------------------------------------------------------------------ lettura

const chiSono: Strumento = {
  nome: 'chi_sono',
  descrizione:
    'Chi è la persona per conto di cui stai lavorando: nome, callsign, ruoli e cosa le è permesso fare. Utile come prima chiamata per sapere cosa puoi chiedere.',
  parametri: { type: 'object', properties: {} },
  async esegui(me) {
    return {
      nome: nomeCompleto(me),
      callsign: me.callsign,
      stato: me.stato,
      ruoli: me.roles,
      puo: {
        gestireCalendario: puoGestireEventi(me.roles),
        gestirePagamenti: puoGestirePagamenti(me.roles),
        vedereOperatori: puoVedereOperatori(me.roles),
        vedereContattiNuovi: puoVedereNuovi(me.roles),
        amministrare: puoAmministrare(me.roles),
      },
    };
  },
};

const attivitaInProgramma: Strumento = {
  nome: 'attivita_in_programma',
  descrizione:
    'Le prossime attività che questa persona può vedere, con data, campo, quota che riguarda lei e la sua risposta. Le bozze compaiono solo a chi gestisce il calendario.',
  parametri: {
    type: 'object',
    properties: {
      giorni: { type: 'number', description: 'Quanti giorni guardare avanti. Predefinito 60.' },
    },
  },
  async esegui(me, arg) {
    const giorni = numero(arg, 'giorni') ?? 60;
    const fino = new Date();
    fino.setDate(fino.getDate() + giorni);

    const eventi = await prisma.event.findMany({
      where: {
        AND: [
          filtroVisibilita(me.stato, puoGestireEventi(me.roles), me.id),
          { inizio: { gte: new Date(), lte: fino } },
        ],
      },
      orderBy: { inizio: 'asc' },
      include: {
        tipo: { select: { nome: true, tipoQuota: true } },
        field: { select: { nome: true, citta: true, indirizzo: true } },
        rsvps: { select: { status: true, userId: true } },
      },
    });

    return eventi.map((e) => ({
      id: e.id,
      titolo: e.titolo,
      tipo: e.tipo?.nome ?? null,
      stato: e.status,
      inizio: fmtDateTime(e.inizio),
      campo: e.field ? [e.field.nome, e.field.citta].filter(Boolean).join(' · ') : null,
      quotaPerMe: quotaPer(e, me.stato).importo || null,
      presenti: e.rsvps.filter((r) => r.status === 'PRESENTE').length,
      postiMax: e.maxPartecipanti,
      miaRisposta: e.rsvps.find((r) => r.userId === me.id)?.status ?? null,
    }));
  },
};

const attivitaDettaglio: Strumento = {
  nome: 'attivita_dettaglio',
  descrizione:
    'Una singola attività per intero: descrizione, ritrovo, indirizzo, quote e chi ha risposto. I nomi seguono le regole del gestionale — i contatti non ancora in squadra restano puntati per chi non li segue.',
  parametri: {
    type: 'object',
    properties: { attivitaId: { type: 'string', description: 'Id dell’attività.' } },
    required: ['attivitaId'],
  },
  async esegui(me, arg) {
    const evento = await prisma.event.findFirst({
      where: {
        AND: [
          filtroVisibilita(me.stato, puoGestireEventi(me.roles), me.id),
          { id: testo(arg, 'attivitaId') },
        ],
      },
      include: {
        tipo: true,
        field: true,
        rsvps: {
          include: {
            user: { select: { nome: true, cognome: true, callsign: true, stato: true } },
          },
        },
      },
    });
    if (!evento) throw new Error('Attività non trovata, oppure non visibile a questa persona.');

    const incarico = puoVedereNuovi(me.roles);

    return {
      id: evento.id,
      titolo: evento.titolo,
      descrizione: evento.descrizione,
      tipo: evento.tipo?.nome ?? null,
      stato: evento.status,
      destinatari: evento.visibilita,
      inizio: fmtDateTime(evento.inizio),
      fine: evento.fine ? fmtDateTime(evento.fine) : null,
      ritrovo: evento.ritrovo,
      campo: evento.field
        ? {
            nome: evento.field.nome,
            indirizzo: [evento.field.indirizzo, evento.field.citta].filter(Boolean).join(', '),
          }
        : null,
      quotaSquadra: evento.costo ? Number(evento.costo) : null,
      dettaglioQuotaSquadra: evento.dettaglioCosto,
      quotaEsterni: evento.costoEsterni != null ? Number(evento.costoEsterni) : null,
      dettaglioQuotaEsterni: evento.dettaglioCostoEsterni,
      chiusuraIscrizioni: evento.chiusuraIscrizioni ? fmtDateTime(evento.chiusuraIscrizioni) : null,
      partecipanti: evento.rsvps.map((r) => ({
        // gli id delle persone li vede chi ha un incarico: servono per gli
        // strumenti che scrivono, e a un atleta non servono a niente
        userId: incarico ? r.userId : undefined,
        chi: comeChiamare(r.user, {
          incarico,
          diSquadra: !isContatto(r.user.stato),
        }).nome,
        risposta: etichettaRisposta[r.status] ?? r.status,
        assegnazione: r.assegnazione,
        presenteDavvero: r.presente,
      })),
    };
  },
};

const mieQuote: Strumento = {
  nome: 'mie_quote',
  descrizione: 'Le quote e i pagamenti di questa persona: cosa deve, cosa ha versato, cosa le è stato rimborsato.',
  parametri: {
    type: 'object',
    properties: {
      soloAperte: { type: 'boolean', description: 'Solo quelle da saldare. Predefinito falso.' },
    },
  },
  async esegui(me, arg) {
    const soloAperte = arg.soloAperte === true;
    const pagamenti = await prisma.payment.findMany({
      where: {
        userId: me.id,
        ...(soloAperte ? { status: { in: ['DA_PAGARE', 'PARZIALE'] } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tipo: true,
        descrizione: true,
        importo: true,
        pagato: true,
        status: true,
        scadenza: true,
        pagatoIl: true,
      },
    });

    return pagamenti.map((p) => ({
      id: p.id,
      tipo: p.tipo,
      descrizione: p.descrizione,
      importo: Number(p.importo),
      versato: Number(p.pagato),
      resta: Number(p.importo) - Number(p.pagato),
      stato: p.status,
      scadenza: p.scadenza ? fmtDate(p.scadenza) : null,
      saldatoIl: p.pagatoIl ? fmtDate(p.pagatoIl) : null,
    }));
  },
};

const mieiCertificati: Strumento = {
  nome: 'miei_certificati',
  descrizione:
    'I certificati medici di questa persona, con lo stato reale: uno approvato ma scaduto risulta scaduto, non valido.',
  parametri: { type: 'object', properties: {} },
  async esegui(me) {
    const certs = await prisma.medicalCertificate.findMany({
      where: { userId: me.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tipo: true, status: true, rilasciatoIl: true, scadeIl: true },
    });

    return certs.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      stato: statoEffettivo(c),
      rilasciato: c.rilasciatoIl ? fmtDate(c.rilasciatoIl) : null,
      scade: c.scadeIl ? fmtDate(c.scadeIl) : null,
      inScadenza: certificatoInScadenza(c.scadeIl),
    }));
  },
};

const squadra: Strumento = {
  nome: 'squadra',
  descrizione:
    'Chi c’è in squadra, con callsign e recapiti. È l’elenco che questa persona vede già nel gestionale: chi ha un incarico vede anche stato e ruoli.',
  permesso: (me) => vedeAttivitaSquadra(me.stato) || puoVedereOperatori(me.roles),
  parametri: {
    type: 'object',
    properties: { cerca: { type: 'string', description: 'Filtra per nome, cognome o callsign.' } },
  },
  async esegui(me, arg) {
    const cerca = testo(arg, 'cerca');
    const incarico = puoVedereOperatori(me.roles);

    const persone = await prisma.user.findMany({
      where: {
        stato: incarico ? { not: 'DISABILITATO' } : { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] },
        ...(cerca
          ? {
              OR: [
                { nome: { contains: cerca, mode: 'insensitive' as const } },
                { cognome: { contains: cerca, mode: 'insensitive' as const } },
                { callsign: { contains: cerca, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        telefono: true,
        stato: true,
        roles: true,
      },
    });

    return persone
      .filter((p) => !isContatto(p.stato) || puoVedereNuovi(me.roles))
      .map((p) => ({
        id: incarico ? p.id : undefined,
        chi: comeChiamare(p, { incarico: puoVedereNuovi(me.roles), diSquadra: !isContatto(p.stato) })
          .nome,
        callsign: p.callsign,
        telefono: p.telefono,
        stato: incarico ? p.stato : undefined,
        ruoli: incarico ? p.roles : undefined,
      }));
  },
};

const documentiSquadra: Strumento = {
  nome: 'documento',
  descrizione:
    'Statuto e regolamenti, così come sono pubblicati. Senza argomenti elenca quelli che questa persona può leggere; con lo slug ne restituisce il testo.',
  parametri: {
    type: 'object',
    properties: {
      slug: { type: 'string', description: 'Quale documento, es. "statuto" o "regolamento".' },
    },
  },
  async esegui(me, arg) {
    const slug = testo(arg, 'slug').toLowerCase();

    if (!slug) {
      const [statuto, regolamenti] = await Promise.all([
        puoLeggere('STATUTO', me.stato) ? elencoDocumenti('STATUTO') : [],
        elencoDocumenti('REGOLAMENTO'),
      ]);
      return [...statuto, ...regolamenti].map((d) => ({
        slug: d.slug,
        titolo: d.titolo,
        sottotitolo: d.sottotitolo,
        aggiornatoIl: fmtDate(d.aggiornatoIl),
      }));
    }

    const doc = await documentoDa(slug);
    if (!doc) throw new Error(`Non c'è nessun documento con l'indirizzo "${slug}".`);
    // lo statuto è di chi è dentro: da qui non si scavalca la regola
    if (!puoLeggere(doc.tipo, me.stato)) {
      throw new Error('Lo statuto è riservato a chi è in squadra.');
    }

    return {
      slug: doc.slug,
      titolo: doc.titolo,
      testo: doc.testo,
      aggiornatoIl: fmtDate(doc.aggiornatoIl),
    };
  },
};

// ------------------------------------------------------------------ incarichi

const contattiNuovi: Strumento = {
  nome: 'contatti_nuovi',
  descrizione: 'I contatti non ancora in squadra, con nome per intero e a che punto sono dell’iter di ingresso.',
  permesso: (me) => puoVedereNuovi(me.roles),
  parametri: { type: 'object', properties: {} },
  async esegui() {
    const nuovi = await prisma.user.findMany({
      where: { stato: { in: ['NUOVO', 'ATTESA_COMPILAZIONE', 'ATTESA_ACCETTAZIONE'] } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        telefono: true,
        email: true,
        stato: true,
        createdAt: true,
        _count: { select: { rsvps: true } },
      },
    });

    return nuovi.map((n) => ({
      id: n.id,
      chi: `${n.nome} ${n.cognome}`,
      callsign: n.callsign,
      telefono: n.telefono,
      email: n.email,
      stato: n.stato,
      conosciutoIl: fmtDate(n.createdAt),
      volteVenuto: n._count.rsvps,
    }));
  },
};

const quoteAperte: Strumento = {
  nome: 'quote_aperte',
  descrizione: 'Le quote non ancora saldate, per persona, con quanto resta da incassare.',
  permesso: (me) => puoGestirePagamenti(me.roles),
  parametri: { type: 'object', properties: {} },
  async esegui() {
    const pagamenti = await prisma.payment.findMany({
      where: { status: { in: ['DA_PAGARE', 'PARZIALE'] } },
      orderBy: [{ scadenza: 'asc' }, { createdAt: 'asc' }],
      include: { user: { select: { nome: true, cognome: true, callsign: true } } },
    });

    return pagamenti.map((p) => ({
      pagamentoId: p.id,
      chi: nomeCompleto(p.user),
      tipo: p.tipo,
      descrizione: p.descrizione,
      resta: Number(p.importo) - Number(p.pagato),
      dichiarato: p.dichiaratoIl ? fmtDate(p.dichiaratoIl) : null,
      scadenza: p.scadenza ? fmtDate(p.scadenza) : null,
    }));
  },
};

const cassaRiepilogo: Strumento = {
  nome: 'cassa_riepilogo',
  descrizione: 'Il saldo di cassa e come ci si è arrivati: quote incassate, rimborsi erogati, entrate e uscite a mano.',
  permesso: (me) => puoGestirePagamenti(me.roles),
  parametri: { type: 'object', properties: {} },
  async esegui() {
    const [pagamenti, movimenti] = await Promise.all([
      prisma.payment.findMany({ select: { tipo: true, importo: true, pagato: true, status: true } }),
      prisma.movimentoCassa.findMany({ select: { tipo: true, importo: true } }),
    ]);

    const somma = (v: { importo: unknown }[], f = (_: unknown) => true) =>
      v.filter(f).reduce((t, x) => t + Number(x.importo), 0);

    const incassiQuote = pagamenti
      .filter((p) => p.tipo !== 'RIMBORSO')
      .reduce((t, p) => t + Number(p.pagato), 0);
    const rimborsiErogati = pagamenti
      .filter((p) => p.tipo === 'RIMBORSO')
      .reduce((t, p) => t + Number(p.pagato), 0);
    const daIncassare = pagamenti
      .filter((p) => p.tipo !== 'RIMBORSO' && p.status !== 'PAGATO' && p.status !== 'ANNULLATO')
      .reduce((t, p) => t + Number(p.importo) - Number(p.pagato), 0);
    const entrate = somma(movimenti.filter((m) => m.tipo === 'ENTRATA'));
    const uscite = somma(movimenti.filter((m) => m.tipo === 'USCITA'));

    const saldo = incassiQuote - rimborsiErogati + entrate - uscite;

    return {
      saldo,
      saldoLeggibile: fmtEuro(saldo),
      quoteIncassate: incassiQuote,
      rimborsiErogati,
      entrateAMano: entrate,
      usciteAMano: uscite,
      ancoraDaIncassare: daIncassare,
    };
  },
};

const certificatiInScadenza: Strumento = {
  nome: 'certificati_in_scadenza',
  descrizione:
    'Chi ha il certificato medico scaduto o in scadenza, e chi non ne ha nessuno valido: è la lista di chi non potrebbe scendere in campo.',
  permesso: (me) => puoAmministrare(me.roles),
  parametri: {
    type: 'object',
    properties: { giorni: { type: 'number', description: 'Preavviso in giorni. Predefinito 30.' } },
  },
  async esegui(_me, arg) {
    const giorni = numero(arg, 'giorni') ?? 30;
    const limite = new Date();
    limite.setDate(limite.getDate() + giorni);

    const persone = await prisma.user.findMany({
      where: { stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] } },
      orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
      select: {
        nome: true,
        cognome: true,
        callsign: true,
        certificates: { select: { status: true, scadeIl: true, tipo: true } },
      },
    });

    return persone
      .map((p) => {
        const validi = p.certificates.filter((c) => statoEffettivo(c) === 'VALIDO');
        const prossimo = validi
          .map((c) => c.scadeIl)
          .filter((d): d is Date => d != null)
          .sort((a, b) => a.getTime() - b.getTime())[0];

        return {
          chi: nomeCompleto(p),
          coperto: validi.length > 0,
          scade: prossimo ? fmtDate(prossimo) : null,
          urgente: validi.length === 0 || (prossimo != null && prossimo <= limite),
        };
      })
      .filter((r) => r.urgente);
  },
};

// ------------------------------------------------------------------ scrittura

const rispondiAttivita: Strumento = {
  nome: 'rispondi_attivita',
  descrizione:
    'Dà la risposta di questa persona a un’attività (ci sono, forse, non ci sono). Valgono gli stessi controlli del gestionale: adesioni aperte, posti, certificato medico dove serve, e la quota viene addebitata o tolta di conseguenza.',
  scrive: true,
  parametri: {
    type: 'object',
    properties: {
      attivitaId: { type: 'string' },
      risposta: { type: 'string', enum: ['PRESENTE', 'FORSE', 'ASSENTE'] },
      nota: { type: 'string', description: 'Facoltativa: "arrivo tardi", "porto un ospite".' },
    },
    required: ['attivitaId', 'risposta'],
  },
  async esegui(_me, arg) {
    return esitoAzione(rispondiEvento, {
      eventId: testo(arg, 'attivitaId'),
      status: testo(arg, 'risposta').toUpperCase(),
      note: testo(arg, 'nota'),
    });
  },
};

const creaAttivita: Strumento = {
  nome: 'crea_attivita',
  descrizione:
    'Crea una nuova attività in bozza. Nasce sempre non rilasciata: renderla visibile alla squadra resta un gesto da fare nel gestionale.',
  permesso: (me) => puoGestireEventi(me.roles),
  scrive: true,
  parametri: {
    type: 'object',
    properties: {
      titolo: { type: 'string' },
      inizio: { type: 'string', description: 'Data e ora, es. 2026-10-12T09:30.' },
      fine: { type: 'string' },
      descrizione: { type: 'string' },
      tipoId: { type: 'string', description: 'Id della tipologia, da tipologie_e_campi.' },
      campoId: { type: 'string', description: 'Id del campo, da tipologie_e_campi.' },
      ritrovo: { type: 'string' },
      maxPartecipanti: { type: 'number' },
      quotaSquadra: { type: 'number', description: 'Quota per chi è in squadra, in euro.' },
      quotaEsterni: { type: 'number', description: 'Quota per chi in squadra non è.' },
      note: { type: 'string' },
    },
    required: ['titolo', 'inizio'],
  },
  async esegui(_me, arg) {
    return esitoAzione(salvaEvento, {
      titolo: testo(arg, 'titolo'),
      inizio: testo(arg, 'inizio'),
      fine: testo(arg, 'fine'),
      descrizione: testo(arg, 'descrizione'),
      tipoId: testo(arg, 'tipoId'),
      fieldId: testo(arg, 'campoId'),
      ritrovo: testo(arg, 'ritrovo'),
      maxPartecipanti: numero(arg, 'maxPartecipanti')?.toString(),
      costo: numero(arg, 'quotaSquadra')?.toString(),
      costoEsterni: numero(arg, 'quotaEsterni')?.toString(),
      note: testo(arg, 'note'),
    });
  },
};

const registraIncasso: Strumento = {
  nome: 'registra_incasso',
  descrizione:
    'Segna incassata una quota. Se l’importo è inferiore al dovuto resta un acconto. Serve l’id del pagamento, che dà quote_aperte.',
  permesso: (me) => puoGestirePagamenti(me.roles),
  scrive: true,
  parametri: {
    type: 'object',
    properties: {
      pagamentoId: { type: 'string' },
      importo: { type: 'number', description: 'Quanto è entrato. Se manca, si assume il dovuto.' },
      quando: { type: 'string', description: 'Data dell’incasso, es. 2026-10-12. Non può essere nel futuro.' },
      note: { type: 'string' },
    },
    required: ['pagamentoId'],
  },
  async esegui(_me, arg) {
    return esitoAzione(segnaPagato, {
      id: testo(arg, 'pagamentoId'),
      pagato: numero(arg, 'importo')?.toString(),
      pagatoIl: testo(arg, 'quando'),
      note: testo(arg, 'note'),
    });
  },
};

const modelliMessaggi: Strumento = {
  nome: 'modelli_messaggi',
  descrizione:
    'I modelli di messaggio automatico e i testi che contengono già. Serve prima di aggiungi_testi: dice il titolo con cui chiamare il modello, i segnaposto che accetta, e cosa c’è scritto dentro — così i testi nuovi non ripetono quelli vecchi.',
  permesso: (me) => puoAmministrare(me.roles),
  parametri: {
    type: 'object',
    properties: {
      titolo: { type: 'string', description: 'Solo questo modello, invece di tutti.' },
    },
  },
  async esegui(_me, arg) {
    const cercato = testo(arg, 'titolo');
    const modelli = await prisma.modelloMessaggio.findMany({
      where: cercato ? { titolo: { equals: cercato, mode: 'insensitive' } } : {},
      orderBy: { titolo: 'asc' },
      include: { testi: { orderBy: { createdAt: 'asc' } } },
    });

    return modelli.map((m) => ({
      titolo: m.titolo,
      quando: SCATENANTI[m.scatenante].quando,
      dove: m.destinazione === 'GRUPPO' ? 'nel gruppo, lo leggono tutti' : 'in privato alla persona',
      attivo: m.attivo,
      segnaposto: SCATENANTI[m.scatenante].segnaposto.map((v) => `{${v}}`),
      testi: m.testi.map((t) => ({ testo: t.testo, attivo: t.attivo, volte: t.volte })),
    }));
  },
};

const proponiTesti: Strumento = {
  nome: 'aggiungi_testi',
  descrizione:
    'Aggiunge modi nuovi di dire lo stesso messaggio dentro un modello che esiste già. I testi entrano SPENTI: nessuno parte finché una persona non li ha letti e accesi nel gestionale. Usa i segnaposto che dà modelli_messaggi, e guarda prima cosa c’è dentro per non ripeterlo.',
  permesso: (me) => puoAmministrare(me.roles),
  scrive: true,
  parametri: {
    type: 'object',
    properties: {
      titolo: { type: 'string', description: 'Il titolo del modello, da modelli_messaggi.' },
      testi: {
        type: 'array',
        items: { type: 'string' },
        description: 'Un testo per elemento, con i segnaposto già dentro.',
      },
    },
    required: ['titolo', 'testi'],
  },
  async esegui(_me, arg) {
    const cercato = testo(arg, 'titolo');
    const modello = await prisma.modelloMessaggio.findFirst({
      where: { titolo: { equals: cercato, mode: 'insensitive' } },
      select: { id: true, titolo: true },
    });
    if (!modello) throw new Error(`Non c'è nessun modello che si chiama "${cercato}".`);

    const testi = Array.isArray(arg.testi)
      ? arg.testi.filter((t): t is string => typeof t === 'string' && t.trim() !== '')
      : [];
    if (testi.length === 0) throw new Error('Non hai passato nessun testo.');

    // l'azione del gestionale spezza sui trattini e fa i suoi controlli: qui non
    // si scrive sul database a mano, come per ogni altro strumento che cambia i dati
    return esitoAzione(aggiungiTesti, {
      modelloId: modello.id,
      testo: testi.map((t) => t.trim()).join('\n---\n'),
    });
  },
};

const datiDiBase: Strumento = {
  nome: 'tipologie_e_campi',
  descrizione:
    'Gli id di tipologie di attività e campi, da usare con crea_attivita. Dice anche quali tipologie pretendono il certificato medico.',
  permesso: (me) => puoGestireEventi(me.roles),
  parametri: { type: 'object', properties: {} },
  async esegui() {
    const [tipi, campi] = await Promise.all([
      prisma.tipoAttivita.findMany({
        where: { attivo: true },
        orderBy: { ordine: 'asc' },
        select: { id: true, nome: true, certMedico: true, certAgonistico: true, riserve: true },
      }),
      prisma.field.findMany({
        orderBy: { nome: 'asc' },
        select: { id: true, nome: true, citta: true, indirizzo: true },
      }),
    ]);
    return { tipologie: tipi, campi };
  },
};

/** Tutti gli strumenti, in ordine di quanto sono di uso comune. */
export const STRUMENTI: Strumento[] = [
  chiSono,
  attivitaInProgramma,
  attivitaDettaglio,
  rispondiAttivita,
  mieQuote,
  mieiCertificati,
  squadra,
  documentiSquadra,
  contattiNuovi,
  quoteAperte,
  cassaRiepilogo,
  certificatiInScadenza,
  datiDiBase,
  creaAttivita,
  registraIncasso,
  modelliMessaggi,
  proponiTesti,
];

/**
 * Gli strumenti che questa persona può usare.
 *
 * Non compaiono nemmeno gli altri: un assistente che non vede uno strumento non
 * lo propone, e la persona non si sente dire di no a qualcosa che le era stato
 * offerto un momento prima.
 */
export const strumentiPer = (me: SessionUser) =>
  STRUMENTI.filter((s) => !s.permesso || s.permesso(me));

export const strumentoDetto = (nome: string, me: SessionUser) =>
  strumentiPer(me).find((s) => s.nome === nome) ?? null;

/** Quello che si racconta nella pagina: a cosa dà accesso davvero una chiave. */
export const elencoLeggibile = (me: SessionUser) =>
  strumentiPer(me).map((s) => ({
    nome: s.nome,
    descrizione: s.descrizione,
    scrive: s.scrive === true,
  }));
