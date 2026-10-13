import { access, readFile } from 'fs/promises';
import type { EmailCertificato } from '@prisma/client';
import { prisma } from './db';
import { fmtDate, giorniA, umanizza } from './format';
import { marchio } from './mia-squadra';
import { nomeFileCertificato } from './nome-certificato';
import { inviaEmail, serverPosta } from './posta';
import { componiCorpo, riempi } from './email-corpo';
import { percorsoAssoluto } from './storage';
import { emailVerificata } from './verifica-email';

/**
 * Le email automatiche dei certificati medici.
 *
 * Due momenti: **quando un certificato viene approvato** — di solito a chi lo
 * deve archiviare, col file in allegato — e **a qualche giorno dalla
 * scadenza**, con tutte le tappe che si vogliono (trenta, dieci, zero). Ogni
 * regola ha i suoi destinatari e il suo testo, coi segnaposto della persona e
 * del certificato.
 *
 * Ogni email si segna nel registro **prima** di partire: il lavoro che gira
 * ogni cinque minuti, o due approvazioni premute insieme, non la mandano due
 * volte. Il prezzo è che una partita male resta partita male: il motivo si
 * legge nel registro, e se serve la si rimanda a mano.
 */

export const QUANDO = {
  ACCETTATO: 'Quando lo approvi',
  SCADENZA: 'Prima della scadenza',
} as const;
export type Quando = keyof typeof QUANDO;

/** I segnaposto, con cosa diventano: si scrivono fra graffe, {nome}. */
export const SEGNAPOSTO_CERTIFICATO: Record<string, string> = {
  nome: 'il nome',
  cognome: 'il cognome',
  callsign: 'il callsign',
  email: 'la sua email',
  telefono: 'il suo telefono',
  codiceFiscale: 'il codice fiscale',
  dataNascita: 'la data di nascita',
  luogoNascita: 'il luogo di nascita',
  indirizzo: 'l’indirizzo di casa',
  tipo: 'agonistico o non agonistico',
  rilascio: 'la data di rilascio',
  scadenza: 'la data di scadenza',
  giorni: 'i giorni che mancano alla scadenza',
  approvatoDa: 'chi l’ha approvato',
  squadra: 'il nome della squadra',
};

const includeCertificato = {
  user: {
    select: {
      nome: true,
      cognome: true,
      callsign: true,
      email: true,
      emailVerificata: true,
      telefono: true,
      codiceFiscale: true,
      dataNascita: true,
      luogoNascita: true,
      indirizzo: true,
      cap: true,
      citta: true,
      provincia: true,
    },
  },
  reviewedBy: { select: { nome: true, cognome: true } },
} as const;

async function caricaCertificato(id: string) {
  return prisma.medicalCertificate.findUnique({ where: { id }, include: includeCertificato });
}
type Certificato = NonNullable<Awaited<ReturnType<typeof caricaCertificato>>>;

async function valori(c: Certificato): Promise<Record<string, string>> {
  const u = c.user;
  const giorni = giorniA(c.scadeIl);
  return {
    nome: u.nome,
    cognome: u.cognome,
    callsign: u.callsign ?? '',
    email: u.email,
    telefono: u.telefono ?? '',
    codiceFiscale: u.codiceFiscale ?? '',
    dataNascita: u.dataNascita ? fmtDate(u.dataNascita) : '',
    luogoNascita: u.luogoNascita ?? '',
    indirizzo: [
      u.indirizzo,
      [u.cap, u.citta, u.provincia ? `(${u.provincia})` : null].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(', '),
    tipo: umanizza(c.tipo).toLowerCase(),
    rilascio: c.rilasciatoIl ? fmtDate(c.rilasciatoIl) : '',
    scadenza: c.scadeIl ? fmtDate(c.scadeIl) : '',
    giorni: giorni === null ? '' : String(giorni),
    approvatoDa: c.reviewedBy ? `${c.reviewedBy.nome} ${c.reviewedBy.cognome}` : '',
    squadra: (await marchio()).nome,
  };
}

/** Gli indirizzi scritti a mano, separati da virgole, spazi o a capo. */
export function indirizzi(grezzo: string): string[] {
  return [
    ...new Set(
      grezzo
        .split(/[\s,;]+/)
        .map((a) => a.trim().toLowerCase())
        .filter((a) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)),
    ),
  ];
}

/** A chi va: gli indirizzi scritti, e la persona se ha l'email verificata. */
function destinatariDi(r: EmailCertificato, c: Certificato) {
  const a = indirizzi(r.destinatari);
  if (r.allInteressato && emailVerificata(c.user) && !a.includes(c.user.email.toLowerCase())) {
    a.unshift(c.user.email);
  }
  return a;
}

/** Compone e manda un'email di una regola, per un certificato, a questi indirizzi. */
async function componiEManda(
  r: Pick<EmailCertificato, 'oggetto' | 'testo' | 'allegato' | 'formato'>,
  c: Certificato,
  a: string[],
): Promise<string | null> {
  const v = await valori(c);
  const oggetto = riempi(r.oggetto, v).replace(/\s+/g, ' ').trim();
  const corpo = componiCorpo(r.formato, r.testo, v);

  let allegati: { nome: string; contenuto: Buffer; tipo: string }[] | undefined;
  if (r.allegato) {
    try {
      allegati = [
        {
          nome: nomeFileCertificato(c),
          contenuto: await readFile(percorsoAssoluto(c.filePath)),
          tipo: c.mimeType,
        },
      ];
    } catch {
      return 'Il file del certificato non si trova più: email non mandata.';
    }
  }

  const errori: string[] = [];
  // una per destinatario: chi riceve non vede gli indirizzi degli altri
  for (const indirizzo of a) {
    const esito = await inviaEmail({
      a: indirizzo,
      oggetto,
      testo: corpo.testo,
      html: corpo.html,
      allegati,
    });
    if (esito.errore) errori.push(`${indirizzo}: ${esito.errore}`);
  }
  return errori.length ? errori.join(' · ') : null;
}

/**
 * Una regola per un certificato, una volta sola. Il registro si scrive prima
 * dell'invio: se c'è già, qualcun altro l'ha mandata (o ci sta provando).
 */
async function mandaUnaVolta(r: EmailCertificato, c: Certificato) {
  const a = destinatariDi(r, c);
  if (a.length === 0) return false;
  try {
    await prisma.invioEmailCertificato.create({
      data: {
        regolaId: r.id,
        certificatoId: c.id,
        aChi: a.join(', '),
        // l'oggetto come l'ha letto chi l'ha ricevuto, per il registro
        oggetto: riempi(r.oggetto, await valori(c))
          .replace(/\s+/g, ' ')
          .trim(),
      },
    });
  } catch {
    return false; // già mandata
  }
  const errore = await componiEManda(r, c, a);
  if (errore) {
    await prisma.invioEmailCertificato.update({
      where: { regolaId_certificatoId: { regolaId: r.id, certificatoId: c.id } },
      data: { errore: errore.slice(0, 1000) },
    });
    console.error('[email certificati]', errore);
  }
  return !errore;
}

/** Il certificato è appena stato approvato: partono le email «quando lo approvi». */
export async function emailCertificatoApprovato(certificatoId: string) {
  if (!(await serverPosta())) return;
  const regole = await prisma.emailCertificato.findMany({
    where: { quando: 'ACCETTATO', attivo: true },
  });
  if (regole.length === 0) return;
  const c = await caricaCertificato(certificatoId);
  if (!c) return;
  for (const r of regole) await mandaUnaVolta(r, c);
}

/**
 * Le email prima della scadenza, dal lavoro che gira ogni cinque minuti.
 *
 * Per ogni certificato vale **la tappa più vicina già raggiunta**: con le
 * regole a 30, 10 e 0 giorni, uno che scade fra 12 giorni è alla tappa dei
 * 30, e quando ne mancano 10 passa a quella dei 10. Così una regola nuova a
 * 30 giorni non fa partire insieme anche quelle a 10 per chi è già oltre, e un
 * certificato approvato a una settimana dalla scadenza riceve solo l'email
 * della tappa in cui si trova.
 *
 * Solo il certificato più recente di ognuno: chi l'ha già rinnovato non deve
 * ricevere l'avviso di quello vecchio.
 */
export async function emailScadenzaCertificati(): Promise<{ mandate: number }> {
  // di giorno, come gli altri avvisi di scadenza
  const ora = new Date().getHours();
  if (ora < 9 || ora >= 21) return { mandate: 0 };
  if (!(await serverPosta())) return { mandate: 0 };

  const regole = await prisma.emailCertificato.findMany({
    where: { quando: 'SCADENZA', attivo: true, giorni: { not: null } },
  });
  if (regole.length === 0) return { mandate: 0 };
  const tappe = [...new Set(regole.map((r) => r.giorni!))].sort((a, b) => a - b);

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const certificati = await prisma.medicalCertificate.findMany({
    where: {
      status: 'VALIDO',
      scadeIl: {
        gte: oggi,
        lte: new Date(Date.now() + (tappe[tappe.length - 1] + 1) * 86_400_000),
      },
      user: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO'] } },
    },
    include: includeCertificato,
  });

  let mandate = 0;
  for (const c of certificati) {
    const giorni = giorniA(c.scadeIl);
    if (giorni === null || giorni < 0) continue;
    const tappa = tappe.find((t) => t >= giorni);
    if (tappa === undefined) continue;

    const piuNuovo = await prisma.medicalCertificate.count({
      where: { userId: c.userId, status: 'VALIDO', scadeIl: { gt: c.scadeIl! } },
    });
    if (piuNuovo > 0) continue;

    for (const r of regole.filter((r) => r.giorni === tappa)) {
      if (await mandaUnaVolta(r, c)) mandate++;
    }
  }
  return { mandate };
}

/**
 * La prova di una regola: a chi la sta scrivendo, con l'ultimo certificato
 * approvato come esempio. Non va nel registro e non conta come mandata.
 */
export async function provaEmailCertificato(
  r: Pick<EmailCertificato, 'oggetto' | 'testo' | 'allegato' | 'formato'>,
  a: string,
): Promise<string | null> {
  // l'ultimo approvato il cui file c'è ancora: senza, la prova dell'allegato non prova niente
  const recenti = await prisma.medicalCertificate.findMany({
    where: { status: 'VALIDO' },
    orderBy: { reviewedAt: { sort: 'desc', nulls: 'last' } },
    select: { id: true, filePath: true },
    take: 20,
  });
  if (recenti.length === 0) return 'Non c’è ancora un certificato approvato da usare come esempio.';
  let scelto = recenti[0];
  for (const x of recenti) {
    if (
      await access(percorsoAssoluto(x.filePath)).then(
        () => true,
        () => false,
      )
    ) {
      scelto = x;
      break;
    }
  }
  const c = await caricaCertificato(scelto.id);
  if (!c) return 'Certificato non trovato.';
  return componiEManda({ ...r, oggetto: `[PROVA] ${r.oggetto}` }, c, [a]);
}
