import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { prisma } from './db';
import { cifra, decifra } from './segreti';
import { verificaCodice } from './totp';

/**
 * La verifica in due passaggi: password più un codice dall'app del telefono.
 *
 * È **facoltativa**: la accende chi vuole, dal profilo. Da quel momento, dopo
 * la password, il gestionale chiede il codice di sei cifre. Se il telefono si
 * perde ci sono i codici di recupero (dieci, ognuno vale una volta), e se si
 * perdono anche quelli l'admin la spegne dalla scheda della persona.
 *
 * Contro chi prova i codici a caso: cinque errori di fila e si aspettano dieci
 * minuti. Un milione di combinazioni, cinque tentativi ogni dieci minuti.
 */

const MAX_ERRORI = 5;
const BLOCCO_MS = 10 * 60_000;
const QUANTI_RECUPERO = 10;

const impronta = (c: string) =>
  createHash('sha256').update(c.replace(/[\s-]/g, '').toUpperCase()).digest('hex');

/** Dieci codici di recupero nuovi: in chiaro da mostrare una volta, e le impronte da salvare. */
export function nuoviCodiciRecupero() {
  const chiari = Array.from({ length: QUANTI_RECUPERO }, () => {
    const c = randomBytes(5).toString('hex').toUpperCase(); // 10 caratteri
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  });
  return { chiari, impronte: chiari.map(impronta) };
}

export const cifraSegreto = (s: string) => cifra(s);

export type EsitoMfa = { ok: true; recupero?: boolean } | { ok: false; errore: string };

/**
 * Il codice di questa persona è giusto? Va bene il codice dell'app o uno di
 * recupero (che si consuma). Tiene il conto degli errori e il blocco.
 */
export async function controllaCodice(
  userId: string,
  codice: string,
  opzioni: { ancheInPreparazione?: boolean } = {},
): Promise<EsitoMfa> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      mfaSegreto: true,
      mfaAttivoIl: true,
      mfaRecupero: true,
      mfaUltimoPasso: true,
      mfaFalliti: true,
      mfaBloccatoFino: true,
    },
  });
  if (!u?.mfaSegreto || (!u.mfaAttivoIl && !opzioni.ancheInPreparazione)) {
    return { ok: false, errore: 'La verifica in due passaggi non è attiva.' };
  }
  if (u.mfaBloccatoFino && u.mfaBloccatoFino > new Date()) {
    const minuti = Math.ceil((u.mfaBloccatoFino.getTime() - Date.now()) / 60_000);
    return {
      ok: false,
      errore: `Troppi codici sbagliati: riprova fra ${minuti} minut${minuti === 1 ? 'o' : 'i'}.`,
    };
  }

  const passo = verificaCodice(decifra(u.mfaSegreto), codice, u.mfaUltimoPasso);
  if (passo !== null) {
    await prisma.user.update({
      where: { id: userId },
      data: { mfaUltimoPasso: passo, mfaFalliti: 0, mfaBloccatoFino: null },
    });
    return { ok: true };
  }

  // un codice di recupero, se è uno di quelli ancora buoni
  const cercata = Buffer.from(impronta(codice));
  const trovata = u.mfaAttivoIl
    ? u.mfaRecupero.find((h) => {
        const b = Buffer.from(h);
        return b.length === cercata.length && timingSafeEqual(b, cercata);
      })
    : undefined;
  if (trovata) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        mfaRecupero: u.mfaRecupero.filter((h) => h !== trovata),
        mfaFalliti: 0,
        mfaBloccatoFino: null,
      },
    });
    return { ok: true, recupero: true };
  }

  const falliti = u.mfaFalliti + 1;
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaFalliti: falliti >= MAX_ERRORI ? 0 : falliti,
      mfaBloccatoFino: falliti >= MAX_ERRORI ? new Date(Date.now() + BLOCCO_MS) : null,
    },
  });
  return {
    ok: false,
    errore:
      falliti >= MAX_ERRORI
        ? 'Troppi codici sbagliati: riprova fra 10 minuti.'
        : 'Codice non valido. Controlla l’ora del telefono e usa il codice che vedi adesso.',
  };
}

/** Ha la verifica in due passaggi accesa? */
export async function mfaAttiva(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { mfaAttivoIl: true } });
  return !!u?.mfaAttivoIl;
}
