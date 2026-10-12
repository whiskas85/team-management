import nodemailer from 'nodemailer';
import { prisma } from './db';
import { decifra } from './segreti';

/**
 * La posta in uscita: le email partono dal server della squadra (SMTP), con
 * la sua casella come mittente.
 *
 * Su Aruba è la casella di posta del dominio: server smtps.aruba.it, porta
 * 465 con SSL, utente l'indirizzo per intero e la password della casella. Gli
 * altri fornitori funzionano allo stesso modo, coi loro dati.
 *
 * Un'email che non parte non deve mai far fallire quello che l'ha chiesta:
 * qui si restituisce l'esito, e chi chiama decide.
 */

export type DatiServer = {
  host: string;
  porta: number;
  sicuro: boolean;
  utente: string;
  password: string;
  mittente: string;
  nomeMittente: string | null;
};

/**
 * I fornitori più comuni, coi dati del loro server già pronti: manca solo la
 * casella. Per gli altri si scrivono a mano, dalle istruzioni «SMTP» del
 * fornitore. La nota dice quello che si sbaglia sempre.
 */
export const FORNITORI = [
  {
    id: 'aruba',
    nome: 'Aruba',
    host: 'smtps.aruba.it',
    porta: 465,
    sicuro: true,
    nota: 'Utente: l’indirizzo email intero. Password: quella della casella.',
  },
  {
    id: 'gmail',
    nome: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    porta: 465,
    sicuro: true,
    nota: 'Serve una «password per le app» (account Google → Sicurezza, con la verifica in due passaggi attiva): la password normale non funziona.',
  },
  {
    id: 'microsoft',
    nome: 'Outlook / Microsoft 365',
    host: 'smtp.office365.com',
    porta: 587,
    sicuro: false,
    nota: 'Porta 587 senza SSL (passa a TLS da sola). Microsoft sta spegnendo l’accesso con utente e password: su molti account va riattivato «SMTP autenticato» dall’amministratore, o non funziona.',
  },
  {
    id: 'libero',
    nome: 'Libero',
    host: 'smtp.libero.it',
    porta: 465,
    sicuro: true,
    nota: 'Utente: l’indirizzo email intero.',
  },
  {
    id: 'yahoo',
    nome: 'Yahoo',
    host: 'smtp.mail.yahoo.com',
    porta: 465,
    sicuro: true,
    nota: 'Serve una «password per le app» generata dalle impostazioni di sicurezza di Yahoo.',
  },
  {
    id: 'icloud',
    nome: 'iCloud',
    host: 'smtp.mail.me.com',
    porta: 587,
    sicuro: false,
    nota: 'Serve una «password specifica per le app» dal sito dell’Apple ID.',
  },
] as const;

/** I dati di Aruba: quelli proposti finché non si sceglie altro. */
export const ARUBA = FORNITORI[0];

const trasporto = (s: DatiServer) =>
  nodemailer.createTransport({
    host: s.host,
    port: s.porta,
    secure: s.sicuro,
    // sulla 587 si passa a TLS dopo il saluto: se il server non lo offre, meglio fermarsi
    requireTLS: !s.sicuro,
    auth: { user: s.utente, pass: s.password },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
  });

/** Il server salvato e acceso, con la password in chiaro; nullo se non c'è. */
export async function serverPosta(): Promise<DatiServer | null> {
  const s = await prisma.serverPosta.findUnique({ where: { id: 'unico' } });
  if (!s || !s.attivo) return null;
  return {
    host: s.host,
    porta: s.porta,
    sicuro: s.sicuro,
    utente: s.utente,
    password: decifra(s.passwordCifrata),
    mittente: s.mittente,
    nomeMittente: s.nomeMittente,
  };
}

/** Il server risponde e accetta utente e password? Il motivo, se no. */
export async function provaCollegamento(s: DatiServer): Promise<string | null> {
  try {
    await trasporto(s).verify();
    return null;
  } catch (e) {
    return spiega(e);
  }
}

/** Un errore del server detto in modo che si capisca cosa fare. */
function spiega(e: unknown): string {
  const err = e as { code?: string; responseCode?: number; message?: string };
  if (err.code === 'EAUTH' || err.responseCode === 535) {
    return 'Utente o password non accettati dal server: controlla la casella (indirizzo intero) e la sua password.';
  }
  if (err.code === 'ETIMEDOUT' || err.code === 'ECONNECTION' || err.code === 'ESOCKET') {
    return `Il server non risponde (${err.code}): controlla indirizzo e porta, e se la porta va con SSL.`;
  }
  if (err.code === 'EDNS' || err.code === 'ENOTFOUND') {
    return 'Il nome del server non esiste: controlla di averlo scritto giusto.';
  }
  return (err.message ?? String(e)).slice(0, 300);
}

/** Manda un'email. Esito: niente se è partita, il motivo se no. */
export async function inviaEmail(m: {
  a: string;
  oggetto: string;
  testo: string;
  html?: string;
}): Promise<{ errore?: string }> {
  const s = await serverPosta();
  if (!s) return { errore: 'Nessun server di posta collegato.' };
  try {
    await trasporto(s).sendMail({
      from: s.nomeMittente ? { name: s.nomeMittente, address: s.mittente } : s.mittente,
      to: m.a,
      subject: m.oggetto,
      text: m.testo,
      html: m.html,
    });
    return {};
  } catch (e) {
    return { errore: spiega(e) };
  }
}
