import type { Prisma, PubblicoBacheca, Role, StatoOperatore } from '@prisma/client';
import { prisma } from './db';
import { isAdmin, vedeAttivitaSquadra } from './domain';
import type { RegoleFile } from './storage';

/**
 * Le bacheche: chi le vede, chi ci scrive, chi le tiene in ordine.
 *
 * Le regole stanno qui e non nelle pagine perché le porte sono tante — la
 * pagina, il file di un allegato, il banner, la notifica, l'assistente via
 * MCP — e tre controlli scritti a mano diventano prima o poi tre controlli
 * diversi. Una bacheca che non ti riguarda non deve esistere da nessuna delle
 * porte.
 */

type Persona = { id: string; stato: StatoOperatore; roles: Role[] };

export type BachecaPerRegole = {
  pubblico: PubblicoBacheca;
  moderatoreId: string | null;
  lettori: { userId: string }[];
  scrittori: { userId: string }[];
};

export const etichettaPubblico: Record<PubblicoBacheca, string> = {
  SQUADRA: 'La squadra',
  NUOVI: 'I nuovi',
  TUTTI: 'Squadra e nuovi',
  SELEZIONE: 'Persone scelte',
};

/** Chi crea e configura le bacheche: l'admin, come per il resto della struttura. */
export const puoCreareBacheche = (roles: Role[]) => isAdmin(roles);

/** Chi la tiene in ordine: cancella messaggi e risposte di chiunque. */
export const moderaBacheca = (b: BachecaPerRegole, me: Persona) =>
  isAdmin(me.roles) || b.moderatoreId === me.id;

/**
 * Chi ci scrive: gli scelti, il moderatore e l'admin.
 *
 * Gli altri **leggono, reagiscono e rispondono** — ed è la differenza fra una
 * bacheca e un gruppo: il messaggio importante non affoga sotto cinquanta
 * battute, perché le battute stanno sotto, nelle risposte.
 */
export const scriveInBacheca = (b: BachecaPerRegole, me: Persona) =>
  moderaBacheca(b, me) || b.scrittori.some((s) => s.userId === me.id);

/** Se questa persona rientra nel pubblico, a prescindere dagli incarichi. */
function nelPubblico(b: BachecaPerRegole, me: { id: string; stato: StatoOperatore }) {
  switch (b.pubblico) {
    case 'SQUADRA':
      return vedeAttivitaSquadra(me.stato);
    case 'NUOVI':
      return me.stato === 'NUOVO';
    case 'TUTTI':
      return vedeAttivitaSquadra(me.stato) || me.stato === 'NUOVO';
    case 'SELEZIONE':
      return b.lettori.some((l) => l.userId === me.id);
  }
}

/**
 * Chi la vede.
 *
 * Chi ci scrive la vede sempre, anche se non rientra nel pubblico: chi cura la
 * bacheca dei nuovi è in squadra, e non potrebbe rileggere quello che ha
 * scritto.
 */
export const vedeBacheca = (b: BachecaPerRegole, me: Persona) =>
  scriveInBacheca(b, me) || nelPubblico(b, me);

/** La stessa regola detta a Prisma, per l'elenco e per il pallino del menu. */
export function filtroBacheche(me: Persona): Prisma.BachecaWhereInput {
  if (isAdmin(me.roles)) return {};

  const pubblici: PubblicoBacheca[] = [];
  if (vedeAttivitaSquadra(me.stato)) pubblici.push('SQUADRA', 'TUTTI');
  if (me.stato === 'NUOVO') pubblici.push('NUOVI', 'TUTTI');

  return {
    OR: [
      { pubblico: { in: pubblici } },
      { pubblico: 'SELEZIONE', lettori: { some: { userId: me.id } } },
      { scrittori: { some: { userId: me.id } } },
      { moderatoreId: me.id },
    ],
  };
}

/**
 * A chi arriva un messaggio: tutti quelli che la vedono, adesso.
 *
 * Adesso vuol dire al momento del rilascio: chi entra in squadra domani il
 * messaggio lo trova in bacheca, ma la notifica non gli arriva — sarebbe una
 * notifica per una cosa di una settimana fa. Gli account spenti restano fuori.
 */
export async function destinatariBacheca(b: BachecaPerRegole): Promise<string[]> {
  const attivi: Prisma.UserWhereInput = {
    stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
  };
  const persone = await prisma.user.findMany({
    where: attivi,
    select: { id: true, stato: true, roles: true },
  });
  return persone.filter((p) => vedeBacheca(b, p)).map((p) => p.id);
}

// ---------------------------------------------------------------- reazioni

/**
 * Le reazioni, quelle di WhatsApp.
 *
 * Sei e non la tastiera intera: su un avviso di squadra si reagisce con
 * l'approvazione, l'affetto, la risata, lo stupore, il dispiacere e il
 * grazie, e una fila di sei si tocca col pollice senza cercare.
 */
export const EMOJI_BACHECA = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

// ------------------------------------------------------------------ spunte

export type Spunte = {
  destinatari: number;
  conPush: number;
  inviate: number;
  ricevute: number;
  lette: number;
  /**
   * Il segno da mostrare, come in un gruppo WhatsApp.
   *
   * Una spunta: pubblicato. Due grigie: **tutti** l'hanno sul telefono. Due
   * colorate: **tutti** l'hanno letto. Chi non ha le notifiche il messaggio
   * non lo riceve sul telefono: per lui conta solo averlo letto, e finché non
   * lo legge le due spunte non diventano colorate — che è la verità.
   */
  livello: 'pubblicato' | 'ricevuto' | 'letto';
};

export function spunte(
  consegne: { conPush: boolean; inviataIl: Date | null; ricevutaIl: Date | null; lettaIl: Date | null }[],
): Spunte {
  const lette = consegne.filter((c) => c.lettaIl).length;
  const ricevute = consegne.filter((c) => c.ricevutaIl || c.lettaIl).length;
  const tutti = consegne.length;
  return {
    destinatari: tutti,
    conPush: consegne.filter((c) => c.conPush).length,
    inviate: consegne.filter((c) => c.inviataIl).length,
    ricevute,
    lette,
    livello: tutti > 0 && lette === tutti ? 'letto' : tutti > 0 && ricevute === tutti ? 'ricevuto' : 'pubblicato',
  };
}

// --------------------------------------------------------------------- file

const FORMATI_ALLEGATO: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

/**
 * I documenti di una bacheca.
 *
 * Più larghi di quelli di un'attività: in bacheca finiscono il verbale del
 * direttivo, il foglio delle taglie, la locandina. **Niente HTML**: è codice
 * servito dal nostro indirizzo, e qui non c'è un book esportato che lo
 * giustifichi.
 */
export const REGOLE_ALLEGATO_BACHECA: RegoleFile = {
  estensioni: Object.keys(FORMATI_ALLEGATO),
  tipoDa: (e) => FORMATI_ALLEGATO[e] ?? 'application/octet-stream',
  estensioneDa: (t) => Object.entries(FORMATI_ALLEGATO).find(([, v]) => v === t)?.[0] ?? null,
  maxBytes: 20 * 1024 * 1024,
  spiegazione:
    'Formato non ammesso: si allegano PDF, Markdown, testo, immagini (JPG, PNG, WEBP) e documenti Word, Excel o PowerPoint.',
};

const FORMATI_BANNER: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const REGOLE_BANNER: RegoleFile = {
  estensioni: Object.keys(FORMATI_BANNER),
  tipoDa: (e) => FORMATI_BANNER[e] ?? 'application/octet-stream',
  estensioneDa: (t) => Object.entries(FORMATI_BANNER).find(([, v]) => v === t)?.[0] ?? null,
  maxBytes: 10 * 1024 * 1024,
  spiegazione: 'L’immagine in cima dev’essere una foto: JPG, PNG o WEBP.',
};

/** Il browser la sa mostrare da sé, senza scaricarla. */
export const siApreNelBrowser = (mimeType: string) =>
  mimeType === 'application/pdf' ||
  mimeType.startsWith('image/') ||
  mimeType.startsWith('text/plain');

/**
 * Come si chiama un documento dopo la chiocciola.
 *
 * Dal nome del file, perché è quello che chi scrive ha in testa: «Verbale
 * marzo.pdf» diventa `@verbale-marzo.pdf`. L'estensione resta: tiene i
 * documenti lontani dai nomi delle persone, che un punto e un'estensione non
 * ce l'hanno.
 */
export function manigliaDocumento(fileName: string) {
  const base = fileName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '');
  return base.slice(0, 60) || 'documento';
}

/** L'indirizzo da cui si apre un documento di bacheca. */
export const indirizzoAllegato = (id: string) => `/api/bacheca/allegati/${id}`;
export const indirizzoBanner = (messaggioId: string) => `/api/bacheca/banner/${messaggioId}`;
