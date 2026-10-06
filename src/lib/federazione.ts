import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CollegamentoSquadra } from '@prisma/client';
import { prisma } from './db';
import { cifra, decifra } from './segreti';
import { leggiMiaSquadra, logoIniziali, marchio, PARTENZA } from './mia-squadra';
import { percorsoAssoluto } from './storage';

/**
 * Il collegamento fra gestionali di squadre diverse: chi siamo, come si firma
 * quello che si manda e come si riconosce quello che arriva.
 *
 * Il quadro intero è in docs/COLLEGAMENTO-SQUADRE.md. In breve: ogni
 * gestionale ha un indirizzo e una coppia di chiavi; si parlano da server a
 * server, in HTTPS, con messaggi firmati. Chi riceve verifica la firma con la
 * chiave pubblica che ha salvato quando il collegamento è nato, e un messaggio
 * vale solo per la rotta per cui è stato firmato e per cinque minuti.
 */

export const PROTOCOLLO = 1;
const FINESTRA_MS = 5 * 60_000;

/** In sviluppo si parla anche in http, a casa propria; fuori solo https. */
const httpAmmesso = () => process.env.FEDERAZIONE_HTTP === '1';

/** L'origine di un indirizzo (https://host[:porta]), o null se non va bene. */
export function normalizzaIndirizzo(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.trim());
    if (url.protocol !== 'https:' && !(httpAmmesso() && url.protocol === 'http:')) return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** L'indirizzo con cui gli altri ci chiamano: dall'ambiente, o da chi sta guardando. */
async function indirizzoNostro(): Promise<string | null> {
  const daAmbiente = normalizzaIndirizzo(process.env.INDIRIZZO_PUBBLICO);
  if (daAmbiente) return daAmbiente;
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    const host = h.get('x-forwarded-host') ?? h.get('host');
    const proto = h.get('x-forwarded-proto') ?? 'http';
    return host ? normalizzaIndirizzo(`${proto}://${host}`) : null;
  } catch {
    // fuori da una richiesta (la coda che gira da sola): vale quello salvato
    return null;
  }
}

export type Identita = { indirizzo: string; chiavePubblica: string; privata: KeyObject };

/**
 * Abbiamo cambiato indirizzo (un dominio nuovo): lo diciamo a chi è collegato.
 *
 * Le chiavi non cambiano col dominio, quindi il messaggio «trasloco» è firmato
 * con la stessa chiave che loro conoscono già: «sono io, prima stavo a A, ora
 * sto a B». Loro aggiornano l'indirizzo e il collegamento resta in piedi.
 *
 * Solo quando l'indirizzo è quello scritto nell'ambiente (INDIRIZZO_PUBBLICO):
 * senza, l'indirizzo si legge da chi sta guardando, e aprire il gestionale da
 * un altro nome non è un trasloco. Il messaggio va in coda e parte al giro
 * della coda: la coda importa questo file, e chiamarla da qui farebbe un giro.
 */
async function annunciaTrasloco(vecchio: string, nuovo: string) {
  if (normalizzaIndirizzo(process.env.INDIRIZZO_PUBBLICO) !== nuovo) return;
  const collegati = await prisma.collegamentoSquadra.findMany({
    where: { stato: { in: ['ATTIVO', 'RICHIESTO', 'DA_ACCETTARE'] } },
    select: { id: true },
  });
  if (collegati.length === 0) return;
  await prisma.messaggioFederazione.createMany({
    data: collegati.map((c) => ({
      collegamentoId: c.id,
      tipo: 'trasloco',
      corpo: { vecchio, nuovo },
    })),
  });
  console.log(`[federazione] trasloco da ${vecchio} a ${nuovo}: avvisati ${collegati.length} collegamenti`);
}

/**
 * Chi siamo. La prima volta nascono le chiavi; se quella salvata non si legge
 * (dati copiati da un altro ambiente, con un altro segreto) ne nasce una nuova.
 */
export async function identita(): Promise<Identita> {
  const qui = await indirizzoNostro();
  const salvata = await prisma.identitaGestionale.findUnique({ where: { id: 'io' } });
  if (salvata) {
    try {
      const privata = createPrivateKey(decifra(salvata.chiavePrivataCifrata));
      let indirizzo = salvata.indirizzo;
      if (qui && qui !== indirizzo) {
        const vecchio = indirizzo;
        indirizzo = qui;
        await prisma.identitaGestionale.update({ where: { id: 'io' }, data: { indirizzo } });
        await annunciaTrasloco(vecchio, qui);
      }
      return { indirizzo, chiavePubblica: salvata.chiavePubblica, privata };
    } catch {
      // illeggibile: si rifà sotto
    }
  }
  if (!qui) throw new Error('Non so con che indirizzo presentarmi: manca INDIRIZZO_PUBBLICO.');
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const chiavePubblica = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const dati = {
    indirizzo: qui,
    chiavePubblica,
    chiavePrivataCifrata: cifra(privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()),
  };
  await prisma.identitaGestionale.upsert({ where: { id: 'io' }, create: dati, update: dati });
  return { indirizzo: qui, chiavePubblica, privata: privateKey };
}

const impronta = (testo: string) => createHash('sha256').update(testo).digest('hex');
const daFirmare = (tipo: string, ora: string, corpo: string) =>
  `zd-federazione/${PROTOCOLLO}\n${tipo}\n${ora}\n${impronta(corpo)}`;

// ---------------------------------------------------------------- profilo

export type Profilo = {
  protocollo: number;
  nome: string;
  nomeGestionale: string;
  motto: string;
  descrizione: string | null;
  citta: string | null;
  provincia: string | null;
  sito: string | null;
  email: string | null;
  telefono: string | null;
  /** Fuori si è il callsign: il nome non esce mai. */
  referenti: {
    ruolo: string;
    callsign: string | null;
    telefono: string | null;
    email: string | null;
  }[];
  /** Cambia quando cambia il logo: chi lo riceve sa se riscaricarlo. */
  logo: string;
};

/** Il nostro biglietto da visita, come lo vedono le squadre collegate. */
export async function profiloNostro(): Promise<Profilo> {
  const [s, m, referenti] = await Promise.all([
    leggiMiaSquadra(),
    marchio(),
    prisma.referenteMiaSquadra.findMany({
      orderBy: { ordine: 'asc' },
      include: { user: { select: { callsign: true, telefono: true, email: true } } },
    }),
  ]);
  return {
    protocollo: PROTOCOLLO,
    nome: m.nome,
    nomeGestionale: m.nomeGestionale,
    motto: m.motto,
    descrizione: s?.descrizione ?? null,
    citta: s?.citta ?? null,
    provincia: s?.provincia ?? null,
    sito: s?.sito ?? null,
    email: s?.email ?? null,
    telefono: s?.telefono ?? null,
    referenti: referenti.map((r) => ({
      ruolo: r.ruolo,
      callsign: r.user.callsign,
      telefono: r.mostraTelefono ? r.user.telefono : null,
      email: r.mostraEmail ? r.user.email : null,
    })),
    logo: s?.logoPath
      ? `l${s.aggiornatoIl.getTime()}`
      : PARTENZA.logo
        ? `p${PARTENZA.logo}`
        : `i${s?.nome ?? PARTENZA.nome}`,
  };
}

const testo = (v: unknown, max = 200): string | null =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

/** Un profilo arrivato da fuori: si tiene solo quello che ci si aspetta, e corto. */
export function profiloRicevuto(v: unknown): Profilo | null {
  if (!v || typeof v !== 'object') return null;
  const p = v as Record<string, unknown>;
  const nome = testo(p.nome, 120);
  if (!nome) return null;
  const referenti = Array.isArray(p.referenti) ? p.referenti.slice(0, 12) : [];
  return {
    protocollo: typeof p.protocollo === 'number' ? p.protocollo : PROTOCOLLO,
    nome,
    nomeGestionale: testo(p.nomeGestionale, 120) ?? nome,
    motto: testo(p.motto, 120) ?? '',
    descrizione: testo(p.descrizione, 2000),
    citta: testo(p.citta, 120),
    provincia: testo(p.provincia, 4),
    sito: normalizzaIndirizzo(testo(p.sito, 300)) ? testo(p.sito, 300) : null,
    email: testo(p.email, 200),
    telefono: testo(p.telefono, 40),
    referenti: referenti.flatMap((r) => {
      if (!r || typeof r !== 'object') return [];
      const x = r as Record<string, unknown>;
      return [
        {
          ruolo: testo(x.ruolo, 60) ?? 'Referente',
          callsign: testo(x.callsign, 60),
          telefono: testo(x.telefono, 40),
          email: testo(x.email, 200),
        },
      ];
    }),
    logo: testo(p.logo, 200) ?? '',
  };
}

/** Il profilo salvato su un collegamento, per mostrarlo. */
export const profiloDi = (c: Pick<CollegamentoSquadra, 'profilo'>) =>
  profiloRicevuto(c.profilo) ?? {
    protocollo: PROTOCOLLO,
    nome: '—',
    nomeGestionale: '—',
    motto: '',
    descrizione: null,
    citta: null,
    provincia: null,
    sito: null,
    email: null,
    telefono: null,
    referenti: [],
    logo: '',
  };

// ------------------------------------------------------------------- logo

/** Il nostro logo, in byte: per chi lo scarica da un altro gestionale. */
export async function logoNostro(): Promise<{ dati: Buffer; tipo: string } | null> {
  const s = await leggiMiaSquadra();
  // senza logo: le iniziali, in SVG
  if (!s?.logoPath && !PARTENZA.logo) {
    return { dati: Buffer.from(await logoIniziali()), tipo: 'image/svg+xml' };
  }
  const file = s?.logoPath
    ? percorsoAssoluto(s.logoPath)
    : path.join(process.cwd(), 'public', PARTENZA.logo.replace(/^\/+/, ''));
  try {
    const dati = await readFile(file);
    const tipo = file.endsWith('.png')
      ? 'image/png'
      : file.endsWith('.svg')
        ? 'image/svg+xml'
        : 'image/jpeg';
    return { dati, tipo };
  } catch {
    return null;
  }
}

// ------------------------------------------------------ mandare e ricevere

export type Risposta<T> = { ok: true; dati: T } | { ok: false; errore: string };

/** Il gestionale di un'altra squadra si presenta: indirizzo, chiave, profilo. Non firmato. */
export async function chiediIdentita(
  indirizzo: string,
): Promise<Risposta<{ indirizzo: string; chiavePubblica: string; profilo: Profilo }>> {
  try {
    const r = await fetch(`${indirizzo}/api/federazione/identita`, {
      signal: AbortSignal.timeout(15_000),
      redirect: 'error',
      cache: 'no-store',
    });
    if (!r.ok) return { ok: false, errore: `il gestionale risponde ${r.status}` };
    const d = (await r.json()) as Record<string, unknown>;
    const loro = normalizzaIndirizzo(typeof d.indirizzo === 'string' ? d.indirizzo : null);
    const profilo = profiloRicevuto(d.profilo);
    if (!loro || typeof d.chiavePubblica !== 'string' || !profilo) {
      return { ok: false, errore: 'a quell’indirizzo non c’è un gestionale come il nostro' };
    }
    return { ok: true, dati: { indirizzo: loro, chiavePubblica: d.chiavePubblica, profilo } };
  } catch (e) {
    return { ok: false, errore: `non risponde (${(e as Error).message})` };
  }
}

/** Manda un messaggio firmato a un altro gestionale e ne legge la risposta. */
export async function manda<T = Record<string, unknown>>(
  indirizzo: string,
  tipo: string,
  corpo: unknown,
): Promise<Risposta<T>> {
  let io: Identita;
  try {
    io = await identita();
  } catch (e) {
    return { ok: false, errore: (e as Error).message };
  }
  const testoCorpo = JSON.stringify(corpo ?? {});
  const ora = String(Date.now());
  const firma = sign(null, Buffer.from(daFirmare(tipo, ora, testoCorpo)), io.privata).toString(
    'base64',
  );
  try {
    const r = await fetch(`${indirizzo}/api/federazione/${tipo}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-fed-da': io.indirizzo,
        'x-fed-ora': ora,
        'x-fed-firma': firma,
      },
      body: testoCorpo,
      signal: AbortSignal.timeout(20_000),
      redirect: 'error',
      cache: 'no-store',
    });
    const dati = (await r.json().catch(() => null)) as (T & { errore?: string }) | null;
    if (!r.ok) return { ok: false, errore: dati?.errore ?? `risponde ${r.status}` };
    return { ok: true, dati: (dati ?? {}) as T };
  } catch (e) {
    return { ok: false, errore: `non risponde (${(e as Error).message})` };
  }
}

export type Arrivato = {
  /** L'indirizzo di chi dice di mandarlo: vale solo dopo `firmatoDa`. */
  da: string;
  corpo: Record<string, unknown>;
  /** Vero se la firma è di chi ha questa chiave pubblica. */
  firmatoDa: (chiavePubblica: string) => boolean;
};

/** Legge un messaggio arrivato: mittente, corpo, e il modo di verificarne la firma. */
export async function leggiArrivato(req: Request, tipo: string): Promise<Risposta<Arrivato>> {
  const da = normalizzaIndirizzo(req.headers.get('x-fed-da'));
  const ora = req.headers.get('x-fed-ora') ?? '';
  const firma = req.headers.get('x-fed-firma') ?? '';
  if (!da || !ora || !firma) return { ok: false, errore: 'messaggio senza mittente o senza firma' };
  if (Math.abs(Date.now() - Number(ora)) > FINESTRA_MS) {
    return { ok: false, errore: 'messaggio scaduto: controllare l’orologio del server' };
  }
  const testoCorpo = await req.text();
  if (testoCorpo.length > 200_000) return { ok: false, errore: 'messaggio troppo grande' };
  let corpo: Record<string, unknown>;
  try {
    corpo = JSON.parse(testoCorpo || '{}');
  } catch {
    return { ok: false, errore: 'messaggio illeggibile' };
  }
  const firmato = Buffer.from(daFirmare(tipo, ora, testoCorpo));
  return {
    ok: true,
    dati: {
      da,
      corpo,
      firmatoDa: (chiavePubblica) => {
        try {
          return verify(
            null,
            firmato,
            createPublicKey(chiavePubblica),
            Buffer.from(firma, 'base64'),
          );
        } catch {
          return false;
        }
      },
    },
  };
}

/**
 * Il collegamento di chi ha mandato un messaggio, se la firma è sua. Si
 * accettano solo i collegamenti negli stati dati.
 */
export async function mittente(req: Request, tipo: string) {
  const a = await leggiArrivato(req, tipo);
  if (!a.ok) return a;
  const c = await prisma.collegamentoSquadra.findUnique({ where: { indirizzo: a.dati.da } });
  if (!c || !a.dati.firmatoDa(c.chiavePubblica)) {
    return { ok: false as const, errore: 'non ci conosciamo' };
  }
  return { ok: true as const, dati: { collegamento: c, corpo: a.dati.corpo } };
}
