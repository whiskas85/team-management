import type { RegoleFile } from './storage';

/**
 * Il file del certificato medico: quanto pesa e in che formati arriva.
 *
 * **Venti mega e non dieci.** Il tetto vecchio era tarato sulla foto del
 * foglio fatta col telefono, che pesa due o tre mega. Ma il certificato lo
 * consegna il medico, e arriva com'è: la scansione a colori dello studio, o il
 * PDF con dentro l'elettrocardiogramma, che di mega ne fanno quindici senza
 * fare niente di strano. Chi lo riceve così non sa alleggerirlo — non è il suo
 * mestiere — e finisce per non caricarlo affatto.
 *
 * **Si guarda l'estensione, non il tipo dichiarato.** Stessa ragione degli
 * allegati: un PDF che passa da WhatsApp o da una chiavetta arriva col tipo
 * vuoto o con `application/octet-stream`, e rifiutarlo vorrebbe dire bocciare
 * un file giusto per un difetto del telefono di chi lo manda. Il tipo con cui
 * poi lo riserviamo lo decidiamo noi, qui sotto.
 */

const FORMATI: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heic',
};

/** Da tipo dichiarato a estensione, per quando il nome del file non dice niente. */
const DA_TIPO: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heic',
};

export const ESTENSIONI_CERTIFICATO = Object.keys(FORMATI);

/** Cosa propone il telefono quando si tocca «scegli il file». */
export const ACCETTA_CERTIFICATO = 'application/pdf,image/*';

export const MAX_CERTIFICATO_BYTES = 20 * 1024 * 1024;

/** Lo stesso tetto in mega, per scriverlo nelle pagine senza ricalcolarlo a mano. */
export const MEGA_CERTIFICATO = MAX_CERTIFICATO_BYTES / 1024 / 1024;

export const SPIEGAZIONE_CERTIFICATO =
  'Formato non ammesso: il certificato si carica in PDF, oppure come foto (JPG, PNG, WEBP).';

export const REGOLE_CERTIFICATO: RegoleFile = {
  estensioni: ESTENSIONI_CERTIFICATO,
  tipoDa: (estensione) => FORMATI[estensione] ?? 'application/octet-stream',
  estensioneDa: (tipo) => DA_TIPO[tipo] ?? null,
  maxBytes: MAX_CERTIFICATO_BYTES,
  spiegazione: SPIEGAZIONE_CERTIFICATO,
};
