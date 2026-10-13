import { readdir, readFile, stat, statfs, utimes, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from './db';
import { UPLOAD_DIR } from './storage';
import { alleggerisci, contaRisparmio, ghostscript } from './alleggerisci';

/**
 * Lo stato del sistema: quanto disco c'è e chi lo occupa, come sta il
 * gestionale, e gli strumenti per tenerlo leggero.
 *
 * Il disco si misura dalla cartella degli allegati: sta su un volume del
 * server, quindi lo spazio libero che si legge lì è quello del disco vero,
 * condiviso con tutto il resto (le altre app, Docker, il sistema).
 */

export type FileAllegato = { relativo: string; byte: number; anno: number; cartella: string };

/** Le cartelle che non sono allegati: copie piccole rifatte da sole. */
const DERIVATI = new Set(['miniature']);

const estensione = (f: string) => path.extname(f).toLowerCase();

/** Tutti gli allegati sul disco, con peso e anno (quello in cui sono stati salvati). */
export async function elencoAllegati(): Promise<FileAllegato[]> {
  const fuori: FileAllegato[] = [];
  async function giro(dir: string, rel: string) {
    let voci;
    try {
      voci = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const v of voci) {
      const r = rel ? `${rel}/${v.name}` : v.name;
      const a = path.join(dir, v.name);
      if (v.isDirectory()) {
        await giro(a, r);
      } else if (v.isFile()) {
        const s = await stat(a).catch(() => null);
        if (!s) continue;
        const cartella = r.includes('/') ? r.slice(0, r.indexOf('/')) : '(radice)';
        fuori.push({ relativo: r, byte: s.size, anno: s.mtime.getFullYear(), cartella });
      }
    }
  }
  await giro(UPLOAD_DIR, '');
  return fuori;
}

export async function disco() {
  try {
    const s = await statfs(UPLOAD_DIR);
    const totale = Number(s.blocks) * Number(s.bsize);
    const libero = Number(s.bavail) * Number(s.bsize);
    return { totale, libero, usato: totale - libero };
  } catch {
    return null;
  }
}

export async function pesoDatabase() {
  const [tot] = await prisma.$queryRaw<{ byte: bigint }[]>`
    SELECT pg_database_size(current_database()) AS byte`;
  const tabelle = await prisma.$queryRaw<{ nome: string; byte: bigint; righe: bigint }[]>`
    SELECT c.relname AS nome, pg_total_relation_size(c.oid) AS byte,
           GREATEST(c.reltuples, 0)::bigint AS righe
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = current_schema()
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 10`;
  return {
    totale: Number(tot?.byte ?? 0),
    tabelle: tabelle.map((t) => ({ nome: t.nome, byte: Number(t.byte), righe: Number(t.righe) })),
  };
}

const oggi = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

/**
 * La misura di oggi: una al giorno (l'ultima vince). La prende il lavoro
 * automatico, e la pagina Sistema quando la si apre.
 */
export async function registraMisura(dati?: {
  disco: Awaited<ReturnType<typeof disco>>;
  allegati: number;
  database: number;
}) {
  const d = dati ?? {
    disco: await disco(),
    allegati: (await elencoAllegati()).reduce((t, f) => t + f.byte, 0),
    database: (await pesoDatabase()).totale,
  };
  if (!d.disco) return;
  const valori = {
    discoTotale: BigInt(d.disco.totale),
    discoLibero: BigInt(d.disco.libero),
    allegati: BigInt(d.allegati),
    database: BigInt(d.database),
  };
  await prisma.misuraSpazio.upsert({
    where: { giorno: oggi() },
    create: { giorno: oggi(), ...valori },
    update: valori,
  });
}

/** Il lavoro automatico è passato di qui: la pagina Sistema lo controlla. */
export async function segnaLavori() {
  await prisma.statoSistema.upsert({
    where: { id: 'unico' },
    create: { id: 'unico', ultimiLavoriIl: new Date() },
    update: { ultimiLavoriIl: new Date() },
  });
  // la misura dello spazio, una volta al giorno
  const gia = await prisma.misuraSpazio.findUnique({ where: { giorno: oggi() } });
  if (!gia) await registraMisura();
}

export type Stato = 'ok' | 'attenzione' | 'guasto';
export type Controllo = { nome: string; stato: Stato; dice: string };

/** I controlli di salute, uno per riga: cosa, come sta, perché. */
export async function controlli(d: Awaited<ReturnType<typeof disco>>): Promise<Controllo[]> {
  const fuori: Controllo[] = [];

  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const ms = Date.now() - t0;
    fuori.push({
      nome: 'Database',
      stato: ms < 300 ? 'ok' : 'attenzione',
      dice: `Risponde in ${ms} ms.`,
    });
  } catch {
    fuori.push({ nome: 'Database', stato: 'guasto', dice: 'Non risponde.' });
  }

  if (d) {
    const libero = (d.libero / d.totale) * 100;
    fuori.push({
      nome: 'Disco',
      stato: libero >= 20 ? 'ok' : libero >= 10 ? 'attenzione' : 'guasto',
      dice: `${libero.toFixed(0)}% libero.${libero < 20 ? ' Conviene liberare spazio (sotto il 10% il server rischia di fermarsi).' : ''}`,
    });
  } else {
    fuori.push({ nome: 'Disco', stato: 'attenzione', dice: 'Lo spazio non si riesce a leggere.' });
  }

  const s = await prisma.statoSistema.findUnique({ where: { id: 'unico' } });
  const fa = s?.ultimiLavoriIl ? (Date.now() - s.ultimiLavoriIl.getTime()) / 60_000 : null;
  fuori.push({
    nome: 'Lavori automatici',
    stato: fa === null ? 'attenzione' : fa < 20 ? 'ok' : fa < 120 ? 'attenzione' : 'guasto',
    dice:
      fa === null
        ? 'Non sono mai passati (nell’ambiente di test è normale: lì sono spenti).'
        : fa < 2
          ? 'Girano: ultimo passaggio adesso.'
          : `Ultimo passaggio ${Math.round(fa)} minuti fa${fa >= 20 ? ': dovrebbero passare ogni cinque minuti. Avvisi, certificati e polizze sono fermi.' : '.'}`,
  });

  const gs = await ghostscript();
  fuori.push({
    nome: 'Alleggerimento PDF',
    stato: gs ? 'ok' : 'attenzione',
    dice: gs
      ? `Attivo (Ghostscript ${gs}): i PDF caricati si rimpiccioliscono.`
      : 'Ghostscript non c’è su questo server: i PDF si salvano come arrivano (le foto si alleggeriscono lo stesso).',
  });

  const posta = await prisma.serverPosta.findFirst({
    where: { attivo: true },
    select: { id: true },
  });
  fuori.push({
    nome: 'Posta',
    stato: posta ? 'ok' : 'attenzione',
    dice: posta
      ? 'Server di posta collegato.'
      : 'Nessun server di posta: email, recupero password e verifiche non partono.',
  });

  try {
    const { statoPonte } = await import('./whatsapp');
    const p = await statoPonte();
    fuori.push({
      nome: 'WhatsApp',
      stato: p.collegato ? 'ok' : 'attenzione',
      dice: p.collegato
        ? `Collegato${p.numero ? ` (${p.numero})` : ''}.`
        : (p.errore ?? 'Non collegato.'),
    });
  } catch {
    fuori.push({ nome: 'WhatsApp', stato: 'attenzione', dice: 'Lo stato del ponte non si legge.' });
  }

  const guasti = await prisma.erroreClient
    .count({ where: { quando: { gt: new Date(Date.now() - 7 * 86_400_000) } } })
    .catch(() => null);
  if (guasti !== null) {
    fuori.push({
      nome: 'Guasti nelle pagine',
      stato: guasti === 0 ? 'ok' : guasti < 10 ? 'attenzione' : 'guasto',
      dice:
        guasti === 0
          ? 'Nessuno negli ultimi 7 giorni.'
          : `${guasti} negli ultimi 7 giorni: sono in «Guasti».`,
    });
  }

  const mem = process.memoryUsage().rss;
  fuori.push({
    nome: 'Memoria dell’app',
    stato: mem < 600 * 1024 * 1024 ? 'ok' : 'attenzione',
    dice: `${Math.round(mem / 1024 / 1024)} MB in uso, acceso da ${durata(process.uptime())}.`,
  });

  return fuori;
}

function durata(secondi: number) {
  const g = Math.floor(secondi / 86400);
  const h = Math.floor((secondi % 86400) / 3600);
  const m = Math.floor((secondi % 3600) / 60);
  return g ? `${g} g ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

/** Le tabelle che tengono il peso di un file accanto al suo percorso. */
const CON_PESO = [
  'MedicalCertificate',
  'AllegatoEvento',
  'AllegatoBacheca',
  'AllegatoSegnalazione',
];

const ALLEGGERIBILI_EST: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * I file già caricati, alleggeriti un po' alla volta: si lavora finché c'è
 * tempo (una richiesta non può durare all'infinito), e quelli già passati non
 * si ripassano. Con `anno` solo quelli di quell'anno.
 */
export async function alleggerisciEsistenti(opzioni: { anno?: number; secondi?: number } = {}) {
  const fine = Date.now() + (opzioni.secondi ?? 40) * 1000;
  const fatti = new Set(
    (await prisma.fileAlleggerito.findMany({ select: { percorso: true } })).map((f) => f.percorso),
  );
  const candidati = (await elencoAllegati()).filter(
    (f) =>
      !DERIVATI.has(f.cartella) &&
      !f.relativo.endsWith('.mini.webp') &&
      ALLEGGERIBILI_EST[estensione(f.relativo)] &&
      !fatti.has(f.relativo) &&
      (opzioni.anno === undefined || f.anno === opzioni.anno),
  );

  let passati = 0;
  let risparmiati = 0;
  for (const f of candidati) {
    if (Date.now() > fine) break;
    const assoluto = path.join(UPLOAD_DIR, f.relativo);
    const prima = await readFile(assoluto).catch(() => null);
    if (!prima) continue;
    const esito = await alleggerisci(prima, ALLEGGERIBILI_EST[estensione(f.relativo)]);
    if (esito.risparmiati > 0) {
      const data = await stat(assoluto);
      await writeFile(assoluto, esito.buffer);
      // la data resta quella del caricamento: l'archivio per anno si basa su lei
      await utimes(assoluto, data.atime, data.mtime).catch(() => null);
      risparmiati += esito.risparmiati;
      for (const t of CON_PESO) {
        await prisma
          .$executeRawUnsafe(
            `UPDATE "${t}" SET "fileSize" = $1 WHERE "filePath" = $2`,
            esito.buffer.length,
            f.relativo,
          )
          .catch(() => null);
      }
    }
    await prisma.fileAlleggerito
      .create({ data: { percorso: f.relativo, prima: prima.length, dopo: esito.buffer.length } })
      .catch(() => null);
    passati++;
  }
  if (risparmiati > 0) await contaRisparmio(risparmiati, passati);
  return { passati, risparmiati, rimasti: candidati.length - passati };
}

/** Quanti file aspettano ancora di essere alleggeriti (per anno, se si vuole). */
export async function daAlleggerire(file: FileAllegato[]) {
  const fatti = new Set(
    (await prisma.fileAlleggerito.findMany({ select: { percorso: true } })).map((f) => f.percorso),
  );
  return file.filter(
    (f) =>
      !DERIVATI.has(f.cartella) &&
      !f.relativo.endsWith('.mini.webp') &&
      ALLEGGERIBILI_EST[estensione(f.relativo)] &&
      !fatti.has(f.relativo),
  );
}

export const eDerivato = (f: FileAllegato) =>
  DERIVATI.has(f.cartella) || f.relativo.endsWith('.mini.webp');
