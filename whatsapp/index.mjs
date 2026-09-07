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

/** Tutto lo stato vivo del ponte, in un posto solo. */
const stato = {
  socket: null,
  collegato: false,
  numero: null,
  qr: null, // immagine del codice da inquadrare, finché serve
  ultimoErrore: null,
  riavvii: 0,
};

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
    }

    if (connection === 'close') {
      stato.collegato = false;
      const codice = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const uscito = codice === DisconnectReason.loggedOut;
      stato.ultimoErrore = uscito
        ? 'Sessione chiusa da WhatsApp: serve ricollegare il numero.'
        : `Connessione caduta (${codice ?? 'motivo sconosciuto'}), riprovo.`;

      // se l'hanno scollegato dal telefono non ha senso insistere: la sessione
      // è morta e va rifatta a mano
      if (!uscito && stato.riavvii < 20) {
        stato.riavvii++;
        setTimeout(avvia, Math.min(30_000, 2000 * stato.riavvii));
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

    if (req.method === 'POST' && url.pathname === '/invia') {
      if (!stato.collegato) return rispondi(res, 409, { errore: 'WhatsApp non è collegato.' });
      const { a, testo } = await corpoRichiesta(req);
      if (!a || !testo) return rispondi(res, 400, { errore: 'Servono destinatario e testo.' });

      const esito = await stato.socket.sendMessage(destinatario(a), { text: testo });
      return rispondi(res, 200, { id: esito?.key?.id ?? 'inviato' });
    }

    if (req.method === 'POST' && url.pathname === '/scollega') {
      if (stato.socket) await stato.socket.logout().catch(() => null);
      stato.collegato = false;
      stato.numero = null;
      stato.qr = null;
      return rispondi(res, 200, { ok: true });
    }

    return rispondi(res, 404, { errore: 'Non esiste.' });
  } catch (e) {
    log.error(e);
    return rispondi(res, 500, { errore: e?.message ?? 'errore sconosciuto' });
  }
});

server.listen(PORTA, () => log.warn(`ponte whatsapp in ascolto sulla porta ${PORTA}`));
avvia().catch((e) => {
  stato.ultimoErrore = e?.message ?? 'avvio fallito';
  log.error(e);
});
