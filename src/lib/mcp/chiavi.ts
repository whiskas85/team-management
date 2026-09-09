import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db';
import type { SessionUser } from '../auth';

/**
 * Le chiavi con cui un assistente entra nel gestionale.
 *
 * Una chiave è personale e non ha poteri suoi: vale esattamente quanto
 * l'account di chi l'ha creata. Se domani quella persona perde un ruolo, la
 * chiave perde lo stesso ruolo lo stesso giorno, senza che nessuno debba
 * ricordarsene.
 */

const SIGLA = 'zd';

/** SHA-256 e non bcrypt: il token è casuale e lungo, non una parola da indovinare. */
const impronta = (token: string) => createHash('sha256').update(token).digest();

/**
 * Un token nuovo. Torna anche in chiaro, ma solo qui: nel database ne resta
 * l'impronta, quindi chi lo perde ne fa un altro invece di farselo ridire.
 */
export function nuovaChiave() {
  const id = randomBytes(8).toString('hex');
  const segreto = randomBytes(24).toString('base64url');
  const token = `${SIGLA}_${id}_${segreto}`;
  return {
    id,
    token,
    hash: impronta(token).toString('hex'),
    // quanto basta a riconoscerla in un elenco, non a usarla
    prefisso: `${SIGLA}_${id}`,
  };
}

export type ChiaveRiconosciuta = { utente: SessionUser; chiaveId: string; nomeChiave: string };

/**
 * Da un token alla persona per conto di cui si agisce, oppure niente.
 *
 * Le ragioni per dire di no sono tutte qui: chiave inventata, revocata,
 * scaduta, o di un account disabilitato. Nessuna di queste viene distinta a chi
 * chiama — chi bussa con una chiave sbagliata non deve poter capire *quanto*
 * sbagliata sia.
 */
export async function chiPresenta(token: string): Promise<ChiaveRiconosciuta | null> {
  // Il segreto è base64url e può contenere trattini bassi: spezzare il token
  // sui separatori scarterebbe metà delle chiavi buone. Si legge invece la
  // parte che ha una forma fissa — sigla e id — e il resto è il segreto.
  const forma = token.match(new RegExp(`^${SIGLA}_([0-9a-f]{16})_(.+)$`));
  if (!forma) return null;

  const chiave = await prisma.tokenMcp.findUnique({
    where: { id: forma[1] },
    include: {
      utente: {
        select: {
          id: true,
          email: true,
          nome: true,
          cognome: true,
          callsign: true,
          deveCambiarePassword: true,
          roles: true,
          stato: true,
          ultimaAttivita: true,
        },
      },
    },
  });
  if (!chiave) return null;

  // confronto a tempo costante: un confronto normale svela, dal tempo che
  // impiega, quanti caratteri iniziali erano giusti
  const atteso = Buffer.from(chiave.hash, 'hex');
  const dato = impronta(token);
  if (atteso.length !== dato.length || !timingSafeEqual(atteso, dato)) return null;

  if (chiave.revocatoIl) return null;
  if (chiave.scadeIl && chiave.scadeIl < new Date()) return null;
  if (chiave.utente.stato === 'DISABILITATO') return null;

  return { utente: chiave.utente, chiaveId: chiave.id, nomeChiave: chiave.nome };
}

/**
 * Segna che la chiave è stata usata, ma non a ogni singola chiamata.
 *
 * Un assistente ne fa parecchie di fila per rispondere a una domanda sola:
 * scrivere sul database ogni volta significherebbe una riga di traffico inutile
 * per ognuna. Un minuto di grana è abbastanza fine per accorgersi di una chiave
 * che lavora quando non dovrebbe.
 */
export async function segnaUso(chiaveId: string) {
  const chiave = await prisma.tokenMcp.findUnique({
    where: { id: chiaveId },
    select: { ultimoUsoIl: true },
  });
  const adesso = new Date();
  if (chiave?.ultimoUsoIl && adesso.getTime() - chiave.ultimoUsoIl.getTime() < 60_000) return;

  await prisma.tokenMcp.update({
    where: { id: chiaveId },
    data: { ultimoUsoIl: adesso, usi: { increment: 1 } },
  });
}
