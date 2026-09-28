/*
 * Ponte fra il gestionale e WhatsApp.
 *
 * Sta in un servizio suo e non dentro l'applicazione per un motivo pratico: la
 * connessione a WhatsApp è una cosa viva, che resta aperta e si riaggancia da
 * sola, mentre le pagine del gestionale nascono e muoiono a ogni richiesta.
 * Tenerle separate significa anche che se questo si rompe, il gestionale
 * continua a funzionare senza accorgersene.
 *
 * Non è l'API ufficiale di Meta: quella nei gruppi non scrive. Questo parla il
 * protocollo di WhatsApp Web, come farebbe un telefono collegato. Va usato con
 * un numero dedicato — se qualcosa va storto, si perde quello e non il numero
 * personale di chi gestisce la squadra.
 *
 * Non è esposto su nessuna porta pubblica: risponde solo dentro la rete di
 * Docker, e solo a chi presenta il segreto condiviso.
 */

import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import QRCode from 'qrcode';

// Baileys e' scritto per require, e con `import` Node lega il nome principale
// alla sola funzione makeWASocket: tutto il resto sparisce. Chiedendolo con
// require si ottiene il modulo intero, come lo intende chi lo ha scritto.
const require = createRequire(import.meta.url);
const {
  default: creaSocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');

const PORTA = Number(process.env.PORTA ?? 3001);
const SEGRETO = process.env.SEGRETO_WHATSAPP ?? '';
const CARTELLA_SESSIONE = process.env.CARTELLA_SESSIONE ?? '/dati/sessione';

const log = pino({ level: process.env.LIVELLO_LOG ?? 'warn' });

// ------------------------------------------------------------------ rubrica

/*
 * La rubrica del telefono collegato, per cercare un numero dal gestionale.
 *
 * WhatsApp la manda a pezzi: all'abbinamento (la cronologia), poi a ogni
 * contatto aggiunto o rinominato sul telefono. Gli eventi non si ripetono al
 * riavvio, quindi quello che arriva si scrive su disco accanto alla sessione,
 * e si rilegge alla partenza. Ai nomi della rubrica si aggiungono i
 * partecipanti dei gruppi: di loro si sa il numero e il gruppo, e spesso il
 * nome che si sono dati su WhatsApp.
 */
const FILE_RUBRICA = process.env.FILE_RUBRICA ?? join(dirname(CARTELLA_SESSIONE), 'rubrica.json');

/** numero (solo cifre) → { nome, notify, gruppi } */
const rubrica = new Map();
let salvataggio = null;

async function caricaRubrica() {
  try {
    const dati = JSON.parse(await readFile(FILE_RUBRICA, 'utf8'));
    for (const [numero, voce] of Object.entries(dati)) rubrica.set(numero, voce);
  } catch {
    // prima partenza, o file illeggibile: si riempie da sola
  }
}

function salvaRubrica() {
  if (salvataggio) return;
  salvataggio = setTimeout(() => {
    salvataggio = null;
    writeFile(FILE_RUBRICA, JSON.stringify(Object.fromEntries(rubrica))).catch((e) =>
      log.error({ err: e }, 'rubrica non salvata'),
    );
  }, 2000);
}

/** Il numero dietro un contatto: WhatsApp lo mette in campi diversi a seconda della versione. */
function numeroDi(c) {
  for (const v of [c.phoneNumber, c.jid, c.id]) {
    if (!v) continue;
    const s = String(v);
    if (s.endsWith('@s.whatsapp.net')) return s.split('@')[0].split(':')[0];
    if (/^\+?\d{8,15}$/.test(s)) return s.replace(/\D/g, '');
  }
  return null;
}

function registraContatti(contatti) {
  let cambiati = 0;
  for (const c of contatti ?? []) {
    const numero = numeroDi(c);
    if (!numero) continue;
    const voce = rubrica.get(numero) ?? { nome: null, notify: null, gruppi: [] };
    const nome = c.name || voce.nome;
    const notify = c.notify || c.verifiedName || voce.notify;
    if (nome !== voce.nome || notify !== voce.notify || !rubrica.has(numero)) {
      rubrica.set(numero, { ...voce, nome: nome ?? null, notify: notify ?? null });
      cambiati++;
    }
  }
  if (cambiati > 0) salvaRubrica();
}

function registraGruppi(gruppi) {
  for (const g of gruppi) {
    for (const p of g.participants ?? []) {
      const numero = numeroDi(p);
      if (!numero) continue;
      const voce = rubrica.get(numero) ?? { nome: null, notify: null, gruppi: [] };
      if (!voce.gruppi.includes(g.subject)) {
        rubrica.set(numero, { ...voce, gruppi: [...voce.gruppi, g.subject].slice(-5) });
      }
    }
  }
  salvaRubrica();
}

const senzaAccenti = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Cerca per parole del nome (rubrica, WhatsApp o gruppo) o per cifre del numero. */
function cercaRubrica(q, quanti = 30) {
  const parole = senzaAccenti(q).split(/\s+/).filter(Boolean);
  const cifre = q.replace(/\D/g, '');
  const trovati = [];
  for (const [numero, v] of rubrica) {
    const testo = senzaAccenti([v.nome, v.notify, ...(v.gruppi ?? [])].join(' '));
    const perNumero = cifre.length >= 3 && numero.includes(cifre);
    const perNome =
      parole.length > 0 && parole.every((p) => testo.includes(p) || (/^\d+$/.test(p) && numero.includes(p)));
    if (!perNumero && !perNome) continue;
    // prima chi è in rubrica col nome, poi chi ha solo il nome WhatsApp
    const punti = (v.nome ? 2 : v.notify ? 1 : 0) + (perNome && v.nome && senzaAccenti(v.nome).startsWith(parole[0] ?? '\u0000') ? 2 : 0);
    trovati.push({ numero, nome: v.nome, notify: v.notify, gruppi: v.gruppi ?? [], punti });
  }
  return trovati
    .sort((a, b) => b.punti - a.punti || (a.nome ?? a.notify ?? '~').localeCompare(b.nome ?? b.notify ?? '~', 'it'))
    .slice(0, quanti)
    .map(({ punti: _punti, ...r }) => r);
}

/** Tutto lo stato vivo del ponte, in un posto solo. */
const stato = {
  socket: null,
  collegato: false,
  numero: null,
  qr: null, // immagine del codice da inquadrare, finché serve
  ultimoErrore: null,
  riavvii: 0,
};

/**
 * Butta via la sessione salvata e riparte da zero.
 *
 * È l'unico modo per tornare a vedere un codice QR quando WhatsApp ha chiuso
 * la sessione dall'altra parte: finché nella cartella restano le credenziali
 * morte, Baileys prova a riprendere quella connessione e un codice nuovo non
 * lo emette mai. Da fuori sembra un ponte rotto che non mostra niente.
 */
async function azzeraSessione() {
  await rm(CARTELLA_SESSIONE, { recursive: true, force: true });
  await mkdir(CARTELLA_SESSIONE, { recursive: true });
  // numero nuovo, rubrica nuova: quella di prima era di un altro telefono
  rubrica.clear();
  await rm(FILE_RUBRICA, { force: true });
  stato.collegato = false;
  stato.numero = null;
  stato.qr = null;
  stato.riavvii = 0;
  log.warn('sessione azzerata: riparto per un codice nuovo');
}

async function avvia() {
  const { state, saveCreds } = await useMultiFileAuthState(CARTELLA_SESSIONE);
  const { version } = await fetchLatestBaileysVersion();

  const socket = creaSocket({
    version,
    auth: state,
    logger: log,
    // il codice si mostra nella pagina del gestionale, non nel terminale
    printQRInTerminal: false,
    // senza questo WhatsApp segna come "letti" i messaggi del gruppo appena
    // arrivano, e chi legge dal telefono non li trova più fra i non letti
    markOnlineOnConnect: false,
    browser: ['Zero Dark Gestionale', 'Chrome', '1.0.0'],
  });

  stato.socket = socket;

  socket.ev.on('creds.update', saveCreds);

  // la rubrica: all'abbinamento arriva con la cronologia, poi a pezzi
  socket.ev.on('messaging-history.set', ({ contacts }) => registraContatti(contacts));
  socket.ev.on('contacts.upsert', registraContatti);
  socket.ev.on('contacts.update', registraContatti);

  socket.ev.on('connection.update', async (agg) => {
    const { connection, lastDisconnect, qr } = agg;

    if (qr) {
      stato.qr = await QRCode.toDataURL(qr, { margin: 1, width: 320 });
      stato.collegato = false;
    }

    if (connection === 'open') {
      stato.collegato = true;
      stato.qr = null;
      stato.ultimoErrore = null;
      stato.riavvii = 0;
      stato.numero = socket.user?.id?.split(':')[0] ?? null;
      log.warn({ numero: stato.numero }, 'whatsapp collegato');
      // i partecipanti dei gruppi: numeri che la rubrica magari non ha
      socket
        .groupFetchAllParticipating()
        .then((g) => registraGruppi(Object.values(g)))
        .catch((e) => log.warn({ err: e }, 'gruppi non letti per la rubrica'));
    }

    if (connection === 'close') {
      stato.collegato = false;
      const codice = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const uscito = codice === DisconnectReason.loggedOut;

      // Il 515 non è un guasto: è quello che WhatsApp manda subito dopo la
      // scansione del codice. La connessione va rifatta da capo, e solo al
      // secondo giro l'abbinamento si completa. Detto così invece che come
      // "connessione caduta" si capisce che sta andando bene.
      const abbinamento = codice === DisconnectReason.restartRequired;
      if (abbinamento) log.warn('codice accettato dal telefono: riparto per completare');

      stato.ultimoErrore = uscito
        ? 'Sessione chiusa da WhatsApp: serve ricollegare il numero.'
        : abbinamento
          ? 'Telefono agganciato: sto completando il collegamento.'
          : `Connessione caduta (${codice ?? 'motivo sconosciuto'}), riprovo.`;

      // Scollegato dal telefono: quella sessione è morta e riprovarla non
      // serve a niente. Si butta via e si riparte, così sulla pagina ricompare
      // un codice da inquadrare invece del vicolo cieco in cui il ponte
      // restava fermo a dire «serve ricollegare il numero» senza dare modo
      // di farlo.
      if (uscito) {
        azzeraSessione()
          .then(() => avvia())
          .catch((e) => {
            stato.ultimoErrore = `Non sono riuscito a ripartire: ${e.message}`;
            log.error({ err: e }, 'azzeramento della sessione non riuscito');
          });
        return;
      }

      if (stato.riavvii < 20) {
        stato.riavvii++;
        // subito dopo la scansione non si fa aspettare: ogni secondo in più è
        // un secondo in cui chi ha appena inquadrato non vede succedere niente
        const attesa = abbinamento ? 500 : Math.min(30_000, 2000 * stato.riavvii);
        // se il riavvio va storto lo si legge: un `setTimeout` che rifiuta in
        // silenzio lascia il ponte fermo senza dire perché
        setTimeout(() => {
          avvia().catch((e) => {
            stato.ultimoErrore = `Riavvio non riuscito: ${e.message}`;
            log.error({ err: e }, 'riavvio del ponte non riuscito');
          });
        }, attesa);
      }
    }
  });
}

// ------------------------------------------------------------------ utilità

/** Da numero o id gruppo al destinatario come lo vuole WhatsApp. */
function destinatario(a) {
  const v = String(a).trim();
  if (v.endsWith('@g.us') || v.endsWith('@s.whatsapp.net')) return v;
  return `${v.replace(/\D/g, '')}@s.whatsapp.net`;
}

const rispondi = (res, codice, corpo) => {
  res.writeHead(codice, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(corpo));
};

const corpoRichiesta = (req) =>
  new Promise((ok, no) => {
    let dati = '';
    req.on('data', (p) => {
      dati += p;
      if (dati.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        ok(dati ? JSON.parse(dati) : {});
      } catch (e) {
        no(e);
      }
    });
  });

// ------------------------------------------------------------------ servizio

const server = createServer(async (req, res) => {
  if (SEGRETO && req.headers['x-segreto'] !== SEGRETO) {
    return rispondi(res, 401, { errore: 'Segreto mancante o sbagliato.' });
  }

  const url = new URL(req.url, 'http://interno');

  try {
    if (req.method === 'GET' && url.pathname === '/stato') {
      return rispondi(res, 200, {
        collegato: stato.collegato,
        numero: stato.numero,
        qr: stato.qr,
        errore: stato.ultimoErrore,
      });
    }

    if (req.method === 'GET' && url.pathname === '/gruppi') {
      if (!stato.collegato) return rispondi(res, 409, { errore: 'WhatsApp non è collegato.' });
      const gruppi = await stato.socket.groupFetchAllParticipating();
      return rispondi(
        res,
        200,
        Object.values(gruppi)
          .map((g) => ({
            id: g.id,
            nome: g.subject,
            partecipanti: g.participants?.length ?? 0,
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'it')),
      );
    }

    if (req.method === 'GET' && url.pathname === '/contatti') {
      const q = (url.searchParams.get('q') ?? '').trim();
      return rispondi(res, 200, {
        collegato: stato.collegato,
        totale: rubrica.size,
        contatti: q ? cercaRubrica(q) : [],
      });
    }

    if (req.method === 'POST' && url.pathname === '/invia') {
      if (!stato.collegato) return rispondi(res, 409, { errore: 'WhatsApp non è collegato.' });
      const { a, testo } = await corpoRichiesta(req);
      if (!a || !testo) return rispondi(res, 400, { errore: 'Servono destinatario e testo.' });

      const esito = await stato.socket.sendMessage(destinatario(a), { text: testo });
      return rispondi(res, 200, { id: esito?.key?.id ?? 'inviato' });
    }

    // Scollegare non è solo dire addio a WhatsApp: è anche buttare via le
    // credenziali salvate qui. Senza, il ponte resterebbe a rimuginare su una
    // sessione che non esiste più, e il codice nuovo non arriverebbe mai.
    if (req.method === 'POST' && url.pathname === '/scollega') {
      if (stato.socket) await stato.socket.logout().catch(() => null);
      await azzeraSessione();
      avvia().catch((e) => {
        stato.ultimoErrore = `Non sono riuscito a ripartire: ${e.message}`;
        log.error({ err: e }, 'riavvio dopo lo scollegamento non riuscito');
      });
      return rispondi(res, 200, { ok: true });
    }

    return rispondi(res, 404, { errore: 'Non esiste.' });
  } catch (e) {
    log.error(e);
    return rispondi(res, 500, { errore: e?.message ?? 'errore sconosciuto' });
  }
});

server.listen(PORTA, () => log.warn(`ponte whatsapp in ascolto sulla porta ${PORTA}`));
await caricaRubrica();
avvia().catch((e) => {
  stato.ultimoErrore = e?.message ?? 'avvio fallito';
  log.error(e);
});
