'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { hashPassword, requireUser } from '@/lib/auth';
import { isAdmin, puoAmministrare } from '@/lib/domain';
import { cifra, decifra } from '@/lib/segreti';
import {
  abbina,
  scadenzaTessera,
  scaricaAnagrafiche,
  scaricaTessere,
  type CredenzialiFigt,
} from '@/lib/figt';
import { randomUUID } from 'node:crypto';
import { stagioneAttiva } from '@/lib/stagioni';
import { intOpt, str, strOpt, type StatoForm } from '@/lib/form';

function aggiorna() {
  revalidatePath('/admin/tessere');
  revalidatePath('/dashboard');
}

/**
 * Salva il collegamento al portale federale. La password serve in chiaro per
 * fare il login, quindi non si puo' hashare: viene cifrata e resta nel
 * database solo in quella forma.
 *
 * Se non si spunta "ricorda la password" non si salva niente: le credenziali
 * valgono per quella singola importazione e basta.
 */
export async function salvaCredenzialiFigt(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin configura il portale federale.' };

  const login = str(fd, 'login');
  const password = str(fd, 'password');
  const idAnagrafica = str(fd, 'idAnagrafica');

  if (!login || !password || !idAnagrafica) {
    return { errore: 'Servono utenza, password e id anagrafica dell’associazione.' };
  }

  // prima di salvarle si verifica che funzionino: credenziali sbagliate messe
  // via in silenzio si scoprirebbero solo alla prossima importazione
  try {
    await scaricaTessere({ login, password, idAnagrafica }, new Date().getFullYear());
  } catch (e) {
    return { errore: `Il portale non ha accettato l’accesso: ${(e as Error).message}` };
  }

  const dati = {
    login,
    passwordCifrata: cifra(password),
    idAnagrafica,
    idAffiliazione: strOpt(fd, 'idAffiliazione'),
    salvataDa: me.id,
    salvataIl: new Date(),
    ultimoEsito: 'accesso verificato',
  };

  await prisma.credenzialeFigt.upsert({ where: { id: 'figt' }, create: { id: 'figt', ...dati }, update: dati });

  aggiorna();
  return { ok: 'Collegamento al portale salvato e verificato.' };
}

export async function scollegaFigt(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin configura il portale federale.' };

  await prisma.credenzialeFigt.deleteMany({ where: { id: 'figt' } });
  aggiorna();
  return { ok: 'Credenziali del portale rimosse.' };
}

async function credenziali(fd: FormData): Promise<CredenzialiFigt | null> {
  // credenziali digitate al volo: hanno la precedenza su quelle ricordate
  const login = strOpt(fd, 'login');
  const password = strOpt(fd, 'password');
  const idAnagrafica = strOpt(fd, 'idAnagrafica');
  if (login && password && idAnagrafica) return { login, password, idAnagrafica };

  const salvate = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  if (!salvate) return null;

  return {
    login: salvate.login,
    password: decifra(salvate.passwordCifrata),
    idAnagrafica: salvate.idAnagrafica,
  };
}

/**
 * Scarica i tesseramenti dell'anno e li aggancia agli operatori.
 *
 * Le tessere non le creiamo noi: quello che il portale dice e' la verita', qui
 * si aggiorna quello che gia' c'e' e si aggiunge quello che manca. Chi non si
 * riesce ad abbinare con certezza resta da associare a mano: meglio una riga
 * in sospeso che una tessera attaccata alla persona sbagliata.
 */
export async function importaTessereFigt(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per gestire le tessere.' };

  const anno = intOpt(fd, 'anno') ?? new Date().getFullYear();

  const cred = await credenziali(fd);
  if (!cred) {
    return { errore: 'Il portale federale non è ancora collegato: inserisci le credenziali.' };
  }

  let tessere;
  try {
    tessere = await scaricaTessere(cred, anno);
  } catch (e) {
    await prisma.credenzialeFigt.updateMany({
      where: { id: 'figt' },
      data: { ultimoEsito: `errore: ${(e as Error).message}`, ultimoAccesso: new Date() },
    });
    return { errore: `Importazione non riuscita: ${(e as Error).message}` };
  }

  if (tessere.length === 0) {
    return { errore: `Il portale non ha restituito tesseramenti per il ${anno}.` };
  }

  const [operatori, stagione] = await Promise.all([
    prisma.user.findMany({
      where: { stato: { not: 'DISABILITATO' } },
      select: { id: true, nome: true, cognome: true, email: true },
    }),
    stagioneAttiva(),
  ]);

  let agganciate = 0;
  let aggiornate = 0;
  let inSospeso = 0;

  for (const t of tessere) {
    const stato = /attiv/i.test(t.stato) ? 'ATTIVA' : 'SCADUTA';

    // si conserva la riga grezza: serve a poter associare a mano piu' tardi
    // senza dover richiamare il portale
    const grezza = {
      nominativo: t.nominativo,
      email: t.email,
      comune: t.comune,
      qualifica: t.qualifica,
      stato: t.stato,
      tesseraAcsi: t.tesseraAcsi,
      anno: t.anno,
      idPortale: t.idTesseramento,
      lettoIl: new Date(),
    };

    const comune = {
      codice: t.numero,
      anno: t.anno,
      idPortale: t.idTesseramento,
      nominativo: t.nominativo,
      status: stato as 'ATTIVA',
      scadeIl: scadenzaTessera(t.anno),
      verificatoIl: new Date(),
    };

    // già vista in una importazione precedente: si riallinea e basta
    const nota = await prisma.figtCard.findFirst({ where: { codice: t.numero } });
    if (nota) {
      await prisma.figtCard.update({ where: { id: nota.id }, data: comune });
      await prisma.tesseramentoImportato.upsert({
        where: { numero: t.numero },
        create: { numero: t.numero, ...grezza, userId: nota.userId },
        update: { ...grezza, userId: nota.userId },
      });
      aggiornate++;
      continue;
    }

    const persona = abbina(t, operatori);

    await prisma.tesseramentoImportato.upsert({
      where: { numero: t.numero },
      create: { numero: t.numero, ...grezza, userId: persona?.id ?? null },
      update: { ...grezza, ...(persona ? { userId: persona.id } : {}) },
    });

    if (!persona) {
      inSospeso++;
      continue;
    }

    await prisma.figtCard.create({
      data: { ...comune, userId: persona.id, stagioneId: stagione.id },
    });
    agganciate++;
  }

  await prisma.credenzialeFigt.updateMany({
    where: { id: 'figt' },
    data: { ultimoAccesso: new Date(), ultimoEsito: `${tessere.length} tesseramenti letti` },
  });

  aggiorna();
  return {
    ok:
      `${tessere.length} tesseramenti letti dal portale: ${agganciate} associati, ` +
      `${aggiornate} aggiornati` +
      (inSospeso > 0
        ? `, ${inSospeso} da associare a mano (nessun operatore riconosciuto con certezza).`
        : '.'),
  };
}

/**
 * Collega una tessera a un operatore da un gesto diretto (trascinamento o
 * doppio tocco), senza passare da un modulo. Restituisce solo l'esito: la
 * pagina si aggiorna da sé.
 */
export async function collegaTessera(numero: string, userId: string): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per gestire le tessere.' };

  const riga = await prisma.tesseramentoImportato.findUnique({ where: { numero } });
  if (!riga) return { errore: 'Tesseramento non trovato.' };

  const utente = await prisma.user.findUnique({
    where: { id: userId },
    select: { nome: true, cognome: true },
  });
  if (!utente) return { errore: 'Operatore non trovato.' };

  const stagione = await stagioneAttiva();

  await prisma.tesseramentoImportato.update({ where: { numero }, data: { userId } });

  const esistente = await prisma.figtCard.findFirst({ where: { codice: numero } });
  if (esistente) {
    await prisma.figtCard.update({ where: { id: esistente.id }, data: { userId } });
  } else {
    await prisma.figtCard.create({
      data: {
        userId,
        codice: numero,
        anno: riga.anno,
        nominativo: riga.nominativo,
        idPortale: riga.idPortale,
        status: /attiv/i.test(riga.stato) ? 'ATTIVA' : 'SCADUTA',
        scadeIl: scadenzaTessera(riga.anno),
        verificatoIl: new Date(),
        stagioneId: stagione.id,
      },
    });
  }

  aggiorna();
  return { ok: `${numero} a ${utente.cognome} ${utente.nome}.` };
}

/**
 * Ripassa i tesseramenti ancora orfani e aggancia quelli che si riconoscono
 * senza ambiguità. Non inventa: se i candidati sono due, lascia stare.
 */
export async function proponiAbbinamenti(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per gestire le tessere.' };

  const [orfane, operatori, stagione] = await Promise.all([
    prisma.tesseramentoImportato.findMany({ where: { userId: null } }),
    prisma.user.findMany({
      where: { stato: { not: 'DISABILITATO' } },
      select: { id: true, nome: true, cognome: true, email: true },
    }),
    stagioneAttiva(),
  ]);

  if (orfane.length === 0) return { errore: 'Non c’è nessuna tessera da abbinare.' };

  // chi ha gia' una tessera non e' un candidato: due tessere sulla stessa
  // persona sarebbero un abbinamento sbagliato quasi di sicuro
  const occupati = new Set(
    (await prisma.figtCard.findMany({ select: { userId: true } })).map((t) => t.userId),
  );
  const liberi = operatori.filter((o) => !occupati.has(o.id));

  let fatti = 0;
  for (const t of orfane) {
    const persona = abbina(
      {
        numero: t.numero,
        nominativo: t.nominativo,
        comune: t.comune,
        email: t.email,
        qualifica: t.qualifica,
        stato: t.stato,
        associazione: null,
        tesseraAcsi: t.tesseraAcsi,
        anno: t.anno,
        idTesseramento: t.idPortale,
      },
      liberi,
    );
    if (!persona) continue;

    await prisma.tesseramentoImportato.update({
      where: { numero: t.numero },
      data: { userId: persona.id },
    });

    const esistente = await prisma.figtCard.findFirst({ where: { codice: t.numero } });
    if (esistente) {
      await prisma.figtCard.update({ where: { id: esistente.id }, data: { userId: persona.id } });
    } else {
      await prisma.figtCard.create({
        data: {
          userId: persona.id,
          codice: t.numero,
          anno: t.anno,
          nominativo: t.nominativo,
          idPortale: t.idPortale,
          status: /attiv/i.test(t.stato) ? 'ATTIVA' : 'SCADUTA',
          scadeIl: scadenzaTessera(t.anno),
          verificatoIl: new Date(),
          stagioneId: stagione.id,
        },
      });
    }

    occupati.add(persona.id);
    liberi.splice(liberi.indexOf(persona), 1);
    fatti++;
  }

  aggiorna();
  return {
    ok:
      fatti === 0
        ? 'Nessun abbinamento sicuro: i nomi del portale non corrispondono a nessun operatore, o corrispondono a più di uno.'
        : `${fatti} tessere abbinate. Le restanti ${orfane.length - fatti} vanno accoppiate a mano.`,
  };
}

/**
 * Aggancia a mano una tessera del portale a un operatore, per i casi che
 * l'abbinamento automatico non ha saputo decidere.
 */
export async function associaTessera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per gestire le tessere.' };

  const userId = str(fd, 'userId');
  const codice = str(fd, 'codice');
  if (!userId || !codice) return { errore: 'Scegli l’operatore a cui associare la tessera.' };

  const anno = intOpt(fd, 'anno') ?? Number(codice.slice(0, 4));
  const stagione = await stagioneAttiva();

  await prisma.tesseramentoImportato.updateMany({ where: { numero: codice }, data: { userId } });

  const esistente = await prisma.figtCard.findFirst({ where: { codice } });
  if (esistente) {
    await prisma.figtCard.update({ where: { id: esistente.id }, data: { userId } });
    aggiorna();
    return { ok: 'Tessera riassegnata.' };
  }

  await prisma.figtCard.create({
    data: {
      userId,
      codice,
      anno,
      nominativo: strOpt(fd, 'nominativo'),
      idPortale: strOpt(fd, 'idPortale'),
      status: 'ATTIVA',
      scadeIl: scadenzaTessera(anno),
      verificatoIl: new Date(),
      stagioneId: stagione.id,
    },
  });

  aggiorna();
  return { ok: 'Tessera associata.' };
}

/**
 * Porta dentro l'anagrafica completa dei tesserati del portale.
 *
 * Per ogni tesseramento importato apre la sua scheda — sono sole letture — e
 * ne ricava nome, nascita, codice fiscale, indirizzo, recapiti. Poi:
 *
 *  - se il tesseramento è già agganciato a un operatore, ne completa i campi
 *    vuoti senza sovrascrivere quello che c'è già: i dati scritti qui dentro
 *    valgono più di quelli del portale, che spesso sono vecchi;
 *  - se non è agganciato, cerca la persona per codice fiscale o email e, se
 *    non esiste, la crea;
 *  - infine la mette in squadra e le scrive l'iscrizione alla stagione in corso.
 *
 * L'email è la chiave d'accesso al gestionale: quando il portale non ce l'ha,
 * se ne mette una del dominio riservato .invalid, che non recapita niente e si
 * riconosce a colpo d'occhio come da completare.
 */
export async function importaAnagrafiche(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può importare le anagrafiche.' };

  const cred = await credenziali(fd);
  if (!cred) return { errore: 'Il portale federale non è collegato.' };

  const [righe, stagione] = await Promise.all([
    prisma.tesseramentoImportato.findMany({ where: { idPortale: { not: null } } }),
    stagioneAttiva(),
  ]);
  if (righe.length === 0) return { errore: 'Nessun tesseramento importato da cui partire.' };

  let schede: Awaited<ReturnType<typeof scaricaAnagrafiche>>;
  try {
    schede = await scaricaAnagrafiche(cred, righe.map((r) => r.idPortale as string));
  } catch (e) {
    return { errore: `Lettura dal portale non riuscita: ${(e as Error).message}` };
  }

  let creati = 0;
  let completati = 0;
  let iscritti = 0;
  const saltati: string[] = [];

  for (const riga of righe) {
    const a = schede.get(riga.idPortale as string);
    if (!a || !a.nome || !a.cognome) {
      saltati.push(riga.nominativo);
      continue;
    }

    // si riconosce prima per collegamento, poi per codice fiscale, poi per email
    let utente = riga.userId
      ? await prisma.user.findUnique({ where: { id: riga.userId } })
      : null;

    if (!utente && a.codiceFiscale) {
      utente = await prisma.user.findFirst({ where: { codiceFiscale: a.codiceFiscale } });
    }
    if (!utente && a.email) {
      utente = await prisma.user.findFirst({ where: { email: a.email } });
    }

    // Ultima rete: il cognome deve tornare. Se il riconoscimento porta a una
    // persona che si chiama in un altro modo qualcosa e' andato storto, e
    // riversarle addosso i dati di un altro e' il danno peggiore che si possa
    // fare qui. Meglio lasciarla stare e segnalarlo.
    if (utente && !stessoCognome(utente.cognome, a.cognome)) {
      saltati.push(`${riga.nominativo} (somigliava a ${utente.cognome} ${utente.nome})`);
      continue;
    }

    const dalPortale = {
      dataNascita: a.dataNascita,
      luogoNascita: a.luogoNascita,
      codiceFiscale: a.codiceFiscale,
      indirizzo: a.indirizzo,
      citta: a.citta,
      provincia: a.provincia ?? null,
      cap: a.cap,
      telefono: a.telefono,
    };

    if (utente) {
      // solo i buchi: quello che è già scritto qui dentro non si tocca
      const daRiempire = Object.fromEntries(
        Object.entries(dalPortale).filter(
          ([k, v]) => v != null && utente![k as keyof typeof utente] == null,
        ),
      );
      const rientra = utente.stato !== 'SQUADRA' && utente.stato !== 'SOSPESO';

      if (Object.keys(daRiempire).length > 0 || rientra) {
        await prisma.user.update({
          where: { id: utente.id },
          data: { ...daRiempire, ...(rientra ? { stato: 'SQUADRA' as const } : {}) },
        });
        completati++;
      }
    } else {
      utente = await prisma.user.create({
        data: {
          nome: iniziali(a.nome),
          cognome: iniziali(a.cognome),
          email: a.email ?? emailDaCompletare(a.nome, a.cognome),
          passwordHash: await hashPassword(randomUUID() + randomUUID()),
          stato: 'SQUADRA',
          ...dalPortale,
        },
      });
      creati++;
    }

    // la tessera del portale segue la persona
    await prisma.tesseramentoImportato.update({
      where: { numero: riga.numero },
      data: { userId: utente.id },
    });

    const tessera = await prisma.figtCard.findFirst({ where: { codice: riga.numero } });
    if (tessera) {
      await prisma.figtCard.update({ where: { id: tessera.id }, data: { userId: utente.id } });
    } else {
      await prisma.figtCard.create({
        data: {
          userId: utente.id,
          codice: riga.numero,
          anno: riga.anno,
          nominativo: riga.nominativo,
          idPortale: riga.idPortale,
          status: /attiv/i.test(riga.stato) ? 'ATTIVA' : 'SCADUTA',
          scadeIl: scadenzaTessera(riga.anno),
          verificatoIl: new Date(),
          stagioneId: stagione.id,
        },
      });
    }

    // e l'iscrizione alla stagione in corso: è tesserato, quindi è in squadra
    const gia = await prisma.membership.findUnique({
      where: { userId_stagioneId: { userId: utente.id, stagioneId: stagione.id } },
    });
    if (!gia) {
      await prisma.membership.create({
        data: {
          userId: utente.id,
          stagioneId: stagione.id,
          tipo: 'REISCRIZIONE',
          status: 'ATTIVA',
          note: 'Ricavata dal tesseramento federale.',
          invitedById: me.id,
          compilataIl: new Date(),
          decisaIl: new Date(),
          decidedById: me.id,
        },
      });
      iscritti++;
    }
  }

  aggiorna();
  revalidatePath('/admin/operatori');
  revalidatePath('/admin/stagioni');

  return {
    ok:
      `${righe.length} tesserati letti dal portale: ${creati} operatori creati, ` +
      `${completati} completati, ${iscritti} iscritti alla stagione ${stagione.nome}.` +
      (saltati.length > 0 ? ` Non letti: ${saltati.join(', ')}.` : ''),
  };
}

/** "MARIO ROSSI" -> "Mario Rossi": il portale scrive tutto in maiuscolo. */
function iniziali(v: string): string {
  return v
    .toLowerCase()
    .replace(/(^|[\s'’-])([a-zà-ÿ])/g, (_, p, c) => p + c.toUpperCase());
}

/** Confronto fra cognomi, ignorando accenti, maiuscole e nomi composti. */
function stessoCognome(nostro: string, dalPortale: string): boolean {
  const parole = (v: string) =>
    new Set(
      v
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z]+/)
        .filter(Boolean),
    );
  const a = parole(nostro);
  const b = parole(dalPortale);
  if (a.size === 0 || b.size === 0) return false;
  // basta che una parola del cognome combaci: "Di Leo Briccarello" e "Di Leo"
  return [...a].some((w) => b.has(w));
}

/** Indirizzo segnaposto: il dominio .invalid è riservato e non recapita. */
function emailDaCompletare(nome: string, cognome: string): string {
  const pulito = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]+/g, '.')
      .replace(/^\.|\.$/g, '');
  return `${pulito(nome)}.${pulito(cognome)}@daassegnare.invalid`;
}
