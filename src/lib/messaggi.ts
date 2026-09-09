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

/**
 * Spezza un incollato in tanti testi.
 *
 * Due modi, e si capisce da solo quale: se c'è una riga con soli trattini
 * separa lì, e allora i testi possono andare a capo quanto vogliono; altrimenti
 * una riga è un testo. Trenta auguri brevi si incollano dal blocco note senza
 * pensarci, e quelli lunghi hanno comunque come farsi capire.
 */
export function spezzaTesti(grezzo: string): string[] {
  const pezzi = /^\s*-{3,}\s*$/m.test(grezzo)
    ? grezzo.split(/^\s*-{3,}\s*$/m)
    : grezzo.split(/\r?\n/);
  return pezzi.map((t) => t.trim()).filter(Boolean);
}

/** Sostituisce i {segnaposto}; quelli senza valore spariscono invece di restare a vista. */
export function componi(testo: string, valori: Record<string, string | null | undefined>) {
  return testo
    .replace(/\{(\w+)\}/g, (_, chiave: string) => valori[chiave]?.toString() ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function pesca(scatenante: ScatenanteMessaggio, escludi: string[]) {
  return prisma.testoModello.findFirst({
    where: {
      attivo: true,
      modello: { scatenante, attivo: true },
      ...(escludi.length ? { id: { notIn: escludi } } : {}),
    },
    orderBy: [{ usatoIl: { sort: 'asc', nulls: 'first' } }, { createdAt: 'asc' }],
    include: { modello: true },
  });
}

/**
 * Sceglie il testo da usare: fra quelli attivi, quello fermo da più tempo.
 *
 * È una rotazione, non un sorteggio: con dieci auguri scritti, dieci persone di
 * fila ne ricevono dieci diversi. A caso, statisticamente, qualcuno si sarebbe
 * beccato la stessa frase del compagno il giorno dopo.
 *
 * `escludi` tiene il conto dentro un giro solo. La data di ultimo uso si scrive
 * quando il messaggio entra nel registro, che è dopo: senza questa lista due
 * compleanni dello stesso giorno pescavano lo stesso testo e finivano identici
 * uno sotto l'altro nel gruppo — proprio il caso in cui la ripetizione si vede.
 * Se i testi finiscono prima delle persone si ricomincia da capo: ripetersi è
 * meglio che tacere.
 */
export async function testoDaUsare(scatenante: ScatenanteMessaggio, escludi: string[] = []) {
  const scelto = await pesca(scatenante, escludi);
  if (scelto) return scelto;
  return escludi.length ? pesca(scatenante, []) : null;
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
  testoId: string | null;
  eventId?: string;
  /** Chiave che impedisce il doppione. */
  occasione: string;
};

type Gruppo = { id: string; nome: string };

/** Il gruppo scelto una volta per tutte nel collegamento. */
async function gruppoPredefinito(): Promise<Gruppo | null> {
  const c = await prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } });
  return c?.gruppoId ? { id: c.gruppoId, nome: c.gruppoNome ?? 'gruppo' } : null;
}

/** Il gruppo su cui scrive un modello: il suo, oppure quello predefinito. */
function gruppoDi(modello: { gruppoId: string | null }, predefinito: Gruppo | null) {
  return modello.gruppoId ? { id: modello.gruppoId, nome: 'gruppo' } : predefinito;
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
  const predefinito = await gruppoPredefinito();

  const inizioGiorno = new Date(quando);
  inizioGiorno.setHours(0, 0, 0, 0);
  const domani = new Date(inizioGiorno);
  domani.setDate(domani.getDate() + 1);
  const dopodomani = new Date(domani);
  dopodomani.setDate(dopodomani.getDate() + 1);

  // --- compleanni di oggi
  {
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

    // ogni festeggiato pesca il suo: due compleanni lo stesso giorno non sono
    // due volte la stessa frase, che è dove la ripetizione si nota di più
    const usati: string[] = [];

    for (const u of tutti) {
      const n = u.dataNascita!;
      if (n.getDate() !== quando.getDate() || n.getMonth() !== quando.getMonth()) continue;

      const scelto = await testoDaUsare('COMPLEANNO', usati);
      if (!scelto) break;

      const gruppo = gruppoDi(scelto.modello, predefinito);
      const testo = componi(scelto.testo, {
        nome: u.nome,
        callsign: u.callsign ?? u.nome,
        anni: String(etaCompiuta(n, quando)),
      });

      // nel gruppo gli auguri li leggono tutti, ed è come si fa fra compagni;
      // in privato serve il consenso, perché è un messaggio diretto
      if (scelto.modello.destinazione === 'GRUPPO') {
        if (!gruppo) continue;
        usati.push(scelto.id);
        bozze.push({
          userId: u.id,
          aChi: gruppo.nome,
          destinazione: gruppo.id,
          scatenante: 'COMPLEANNO',
          testoId: scelto.id,
          testo,
          occasione: `COMPLEANNO-${u.id}-${quando.getFullYear()}`,
        });
        continue;
      }

      const numero = numeroInternazionale(u.telefono);
      if (!numero || !u.consensoComunicaz) continue;
      // segnato solo adesso: chi viene saltato non deve bruciare una frase
      usati.push(scelto.id);
      bozze.push({
        userId: u.id,
        aChi: `${u.nome} ${u.cognome}`,
        destinazione: numero,
        scatenante: 'COMPLEANNO',
        testoId: scelto.id,
        testo,
        occasione: `COMPLEANNO-${u.id}-${quando.getFullYear()}`,
      });
    }
  }

  // --- attività di domani, a chi ha detto di esserci
  {
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

    const usati: string[] = [];

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

      const perGruppo = await testoDaUsare('PROMEMORIA_ATTIVITA', usati);
      if (!perGruppo) break;

      // nel gruppo basta un messaggio per tutti: sedici messaggi identici, uno
      // per iscritto, sono il modo migliore per farsi silenziare la chat
      if (perGruppo.modello.destinazione === 'GRUPPO') {
        const gruppo = gruppoDi(perGruppo.modello, predefinito);
        if (!gruppo) continue;
        usati.push(perGruppo.id);
        bozze.push({
          aChi: gruppo.nome,
          destinazione: gruppo.id,
          scatenante: 'PROMEMORIA_ATTIVITA',
          testoId: perGruppo.id,
          eventId: e.id,
          testo: componi(perGruppo.testo, { ...dati, nome: '', callsign: '' }),
          occasione: `PROMEMORIA-${e.id}`,
        });
        continue;
      }

      for (const r of e.rsvps) {
        if (!r.user.consensoComunicaz) continue;
        const numero = numeroInternazionale(r.user.telefono);
        if (!numero) continue;

        const scelto = await testoDaUsare('PROMEMORIA_ATTIVITA', usati);
        if (!scelto) break;
        usati.push(scelto.id);

        bozze.push({
          userId: r.user.id,
          aChi: `${r.user.nome} ${r.user.cognome}`,
          destinazione: numero,
          scatenante: 'PROMEMORIA_ATTIVITA',
          testoId: scelto.id,
          eventId: e.id,
          testo: componi(scelto.testo, {
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

/** Segna il testo come usato: è così che la rotazione avanza. */
export async function segnaUsato(testoId: string) {
  await prisma.testoModello.update({
    where: { id: testoId },
    data: { usatoIl: new Date(), volte: { increment: 1 } },
  });
}

/** Quote aperte e certificati in scadenza, su richiesta e non a calendario. */
export async function bozzeSuRichiesta(scatenante: 'QUOTA_APERTA' | 'CERTIFICATO_IN_SCADENZA') {
  const bozze: Bozza[] = [];
  const oggi = new Date();
  const usati: string[] = [];

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
      const scelto = await testoDaUsare(scatenante, usati);
      if (!scelto) break;
      usati.push(scelto.id);
      bozze.push({
        userId: p.user.id,
        aChi: `${p.user.nome} ${p.user.cognome}`,
        destinazione: numero,
        scatenante,
        testoId: scelto.id,
        testo: componi(scelto.testo, {
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
      const scelto = await testoDaUsare(scatenante, usati);
      if (!scelto) break;
      usati.push(scelto.id);
      bozze.push({
        userId: c.user.id,
        aChi: `${c.user.nome} ${c.user.cognome}`,
        destinazione: numero,
        scatenante,
        testoId: scelto.id,
        testo: componi(scelto.testo, {
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
