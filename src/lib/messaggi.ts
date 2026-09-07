import type { ScatenanteMessaggio } from '@prisma/client';
import { prisma } from './db';
import { fmtDate, fmtEuro, fmtTime } from './format';

/**
 * I messaggi che il gestionale sa comporre da solo.
 *
 * Il motore è volutamente separato dal canale: qui si decide *cosa* dire e *a
 * chi*, non come farlo arrivare. Così i testi si scrivono e si provano oggi,
 * con l'invio a mano, e il giorno che WhatsApp è collegato non cambia niente.
 */

export const SCATENANTI: Record<
  ScatenanteMessaggio,
  { titolo: string; quando: string; segnaposto: string[] }
> = {
  COMPLEANNO: {
    titolo: 'Compleanno',
    quando: 'il giorno del compleanno, una volta l’anno',
    segnaposto: ['nome', 'callsign', 'anni'],
  },
  PROMEMORIA_ATTIVITA: {
    titolo: 'Promemoria attività',
    quando: 'il giorno prima, a chi si è segnato presente',
    segnaposto: ['nome', 'callsign', 'attivita', 'giorno', 'ora', 'campo', 'indirizzo', 'ritrovo', 'mappa'],
  },
  QUOTA_APERTA: {
    titolo: 'Quota da saldare',
    quando: 'a chi ha una quota aperta',
    segnaposto: ['nome', 'callsign', 'importo', 'descrizione'],
  },
  CERTIFICATO_IN_SCADENZA: {
    titolo: 'Certificato in scadenza',
    quando: 'quando mancano meno di 30 giorni',
    segnaposto: ['nome', 'callsign', 'scadenza', 'giorni'],
  },
  LIBERO: {
    titolo: 'Messaggio libero',
    quando: 'quando lo mandi tu',
    segnaposto: ['nome', 'callsign'],
  },
};

/** Sostituisce i {segnaposto}; quelli senza valore spariscono invece di restare a vista. */
export function componi(testo: string, valori: Record<string, string | null | undefined>) {
  return testo
    .replace(/\{(\w+)\}/g, (_, chiave: string) => valori[chiave]?.toString() ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Sceglie il modello da usare: fra quelli attivi, quello fermo da più tempo.
 *
 * È una rotazione, non un sorteggio: con dieci auguri scritti, dieci persone di
 * fila ne ricevono dieci diversi. A caso, statisticamente, qualcuno si sarebbe
 * beccato la stessa frase del compagno il giorno dopo.
 */
export async function modelloDaUsare(scatenante: ScatenanteMessaggio) {
  return prisma.modelloMessaggio.findFirst({
    where: { scatenante, attivo: true },
    orderBy: [{ usatoIl: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
  });
}

export const etaCompiuta = (nascita: Date, quando = new Date()) => {
  let anni = quando.getFullYear() - nascita.getFullYear();
  const mese = quando.getMonth() - nascita.getMonth();
  if (mese < 0 || (mese === 0 && quando.getDate() < nascita.getDate())) anni--;
  return anni;
};

/** Numero in formato internazionale, come lo vuole WhatsApp: niente spazi, con il prefisso. */
export function numeroInternazionale(telefono: string | null, prefisso = '39') {
  if (!telefono) return null;
  const pulito = telefono.replace(/[^\d+]/g, '');
  if (pulito.startsWith('+')) return pulito.slice(1);
  if (pulito.startsWith('00')) return pulito.slice(2);
  if (pulito.startsWith(prefisso) && pulito.length > 10) return pulito;
  return `${prefisso}${pulito}`;
}

export type Bozza = {
  /** Vuoto per i messaggi di gruppo, che non hanno un destinatario singolo. */
  userId?: string | null;
  /** Come si legge il destinatario: "Gruppo Zero Dark" oppure "Marco Allario". */
  aChi: string;
  /** Numero della persona o id del gruppo. */
  destinazione: string;
  scatenante: ScatenanteMessaggio;
  testo: string;
  modelloId: string | null;
  eventId?: string;
  /** Chiave che impedisce il doppione. */
  occasione: string;
};

/** Il gruppo su cui scrive un modello: il suo, oppure quello predefinito. */
async function gruppoDi(modello: { gruppoId: string | null }) {
  if (modello.gruppoId) return { id: modello.gruppoId, nome: 'gruppo' };
  const c = await prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } });
  return c?.gruppoId ? { id: c.gruppoId, nome: c.gruppoNome ?? 'gruppo' } : null;
}

/**
 * Cosa andrebbe mandato oggi.
 *
 * Non manda niente: prepara e restituisce. Chi chiama decide se scriverlo nel
 * registro, mostrarlo in anteprima o farlo partire — e siccome il registro ha
 * un vincolo di unicità su (persona, occasione), un secondo giro nello stesso
 * giorno non produce doppioni.
 */
export async function bozzeDiOggi(quando = new Date()): Promise<Bozza[]> {
  const bozze: Bozza[] = [];

  const inizioGiorno = new Date(quando);
  inizioGiorno.setHours(0, 0, 0, 0);
  const domani = new Date(inizioGiorno);
  domani.setDate(domani.getDate() + 1);
  const dopodomani = new Date(domani);
  dopodomani.setDate(dopodomani.getDate() + 1);

  // --- compleanni di oggi
  const modelloCompleanno = await modelloDaUsare('COMPLEANNO');
  if (modelloCompleanno) {
    const tutti = await prisma.user.findMany({
      where: {
        stato: { in: ['SQUADRA', 'SOSPESO', 'DA_RICONFERMARE'] },
        dataNascita: { not: null },
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        telefono: true,
        dataNascita: true,
        consensoComunicaz: true,
      },
    });

    const gruppo = await gruppoDi(modelloCompleanno);

    for (const u of tutti) {
      const n = u.dataNascita!;
      if (n.getDate() !== quando.getDate() || n.getMonth() !== quando.getMonth()) continue;

      const testo = componi(modelloCompleanno.testo, {
        nome: u.nome,
        callsign: u.callsign ?? u.nome,
        anni: String(etaCompiuta(n, quando)),
      });

      // nel gruppo gli auguri li leggono tutti, ed è come si fa fra compagni;
      // in privato serve il consenso, perché è un messaggio diretto
      if (modelloCompleanno.destinazione === 'GRUPPO') {
        if (!gruppo) continue;
        bozze.push({
          userId: u.id,
          aChi: gruppo.nome,
          destinazione: gruppo.id,
          scatenante: 'COMPLEANNO',
          modelloId: modelloCompleanno.id,
          testo,
          occasione: `COMPLEANNO-${u.id}-${quando.getFullYear()}`,
        });
        continue;
      }

      const numero = numeroInternazionale(u.telefono);
      if (!numero || !u.consensoComunicaz) continue;
      bozze.push({
        userId: u.id,
        aChi: `${u.nome} ${u.cognome}`,
        destinazione: numero,
        scatenante: 'COMPLEANNO',
        modelloId: modelloCompleanno.id,
        testo,
        occasione: `COMPLEANNO-${u.id}-${quando.getFullYear()}`,
      });
    }
  }

  // --- attività di domani, a chi ha detto di esserci
  const modelloPromemoria = await modelloDaUsare('PROMEMORIA_ATTIVITA');
  if (modelloPromemoria) {
    const attivita = await prisma.event.findMany({
      where: { status: 'RILASCIATA', inizio: { gte: domani, lt: dopodomani } },
      include: {
        field: true,
        rsvps: {
          where: { status: 'PRESENTE' },
          include: {
            user: {
              select: {
                id: true,
                nome: true,
                cognome: true,
                callsign: true,
                telefono: true,
                consensoComunicaz: true,
              },
            },
          },
        },
      },
    });

    const gruppo = await gruppoDi(modelloPromemoria);

    for (const e of attivita) {
      const indirizzo = e.field
        ? [e.field.indirizzo, e.field.citta].filter(Boolean).join(', ') || e.field.nome
        : null;
      const mappa =
        e.field?.lat != null && e.field?.lng != null
          ? `https://www.google.com/maps/dir/?api=1&destination=${e.field.lat},${e.field.lng}`
          : null;

      const dati = {
        attivita: e.titolo,
        giorno: fmtDate(e.inizio),
        ora: fmtTime(e.inizio),
        campo: e.field?.nome,
        indirizzo,
        ritrovo: e.ritrovo ?? (e.oraRitrovo ? fmtTime(e.oraRitrovo) : null),
        mappa,
      };

      // nel gruppo basta un messaggio per tutti: sedici messaggi identici, uno
      // per iscritto, sono il modo migliore per farsi silenziare la chat
      if (modelloPromemoria.destinazione === 'GRUPPO') {
        if (!gruppo) continue;
        bozze.push({
          aChi: gruppo.nome,
          destinazione: gruppo.id,
          scatenante: 'PROMEMORIA_ATTIVITA',
          modelloId: modelloPromemoria.id,
          eventId: e.id,
          testo: componi(modelloPromemoria.testo, { ...dati, nome: '', callsign: '' }),
          occasione: `PROMEMORIA-${e.id}`,
        });
        continue;
      }

      for (const r of e.rsvps) {
        if (!r.user.consensoComunicaz) continue;
        const numero = numeroInternazionale(r.user.telefono);
        if (!numero) continue;

        bozze.push({
          userId: r.user.id,
          aChi: `${r.user.nome} ${r.user.cognome}`,
          destinazione: numero,
          scatenante: 'PROMEMORIA_ATTIVITA',
          modelloId: modelloPromemoria.id,
          eventId: e.id,
          testo: componi(modelloPromemoria.testo, {
            ...dati,
            nome: r.user.nome,
            callsign: r.user.callsign ?? r.user.nome,
          }),
          occasione: `PROMEMORIA-${e.id}`,
        });
      }
    }
  }

  return bozze;
}

/** Segna il modello come usato: è così che la rotazione avanza. */
export async function segnaUsato(modelloId: string) {
  await prisma.modelloMessaggio.update({
    where: { id: modelloId },
    data: { usatoIl: new Date(), volte: { increment: 1 } },
  });
}

/** Quote aperte e certificati in scadenza, su richiesta e non a calendario. */
export async function bozzeSuRichiesta(scatenante: 'QUOTA_APERTA' | 'CERTIFICATO_IN_SCADENZA') {
  const modello = await modelloDaUsare(scatenante);
  if (!modello) return [];
  const bozze: Bozza[] = [];
  const oggi = new Date();

  if (scatenante === 'QUOTA_APERTA') {
    const pagamenti = await prisma.payment.findMany({
      where: {
        status: { in: ['DA_PAGARE', 'PARZIALE'] },
        tipo: { not: 'RIMBORSO' },
        user: { consensoComunicaz: true, telefono: { not: null } },
      },
      include: {
        user: { select: { id: true, nome: true, cognome: true, callsign: true, telefono: true } },
      },
    });

    for (const p of pagamenti) {
      const numero = numeroInternazionale(p.user.telefono);
      if (!numero) continue;
      bozze.push({
        userId: p.user.id,
        aChi: `${p.user.nome} ${p.user.cognome}`,
        destinazione: numero,
        scatenante,
        modelloId: modello.id,
        testo: componi(modello.testo, {
          nome: p.user.nome,
          callsign: p.user.callsign ?? p.user.nome,
          importo: fmtEuro(Number(p.importo) - Number(p.pagato)),
          descrizione: p.descrizione,
        }),
        occasione: `QUOTA-${p.id}-${oggi.toISOString().slice(0, 10)}`,
      });
    }
  } else {
    const limite = new Date(oggi);
    limite.setDate(limite.getDate() + 30);
    const certificati = await prisma.medicalCertificate.findMany({
      where: {
        status: 'VALIDO',
        scadeIl: { gte: oggi, lte: limite },
        user: { consensoComunicaz: true, telefono: { not: null } },
      },
      include: {
        user: { select: { id: true, nome: true, cognome: true, callsign: true, telefono: true } },
      },
    });

    for (const c of certificati) {
      const numero = numeroInternazionale(c.user.telefono);
      if (!numero || !c.scadeIl) continue;
      const giorni = Math.round((c.scadeIl.getTime() - oggi.getTime()) / 86400000);
      bozze.push({
        userId: c.user.id,
        aChi: `${c.user.nome} ${c.user.cognome}`,
        destinazione: numero,
        scatenante,
        modelloId: modello.id,
        testo: componi(modello.testo, {
          nome: c.user.nome,
          callsign: c.user.callsign ?? c.user.nome,
          scadenza: fmtDate(c.scadeIl),
          giorni: String(giorni),
        }),
        occasione: `CERTIFICATO-${c.id}`,
      });
    }
  }

  return bozze;
}
