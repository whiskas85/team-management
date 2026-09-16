import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from './db';

/**
 * I gettoni di accesso: un link che vale una volta sola.
 *
 * Serve a consegnare le chiavi di casa senza dettare una password al
 * telefono. Le regole sono tre, e sono quelle che rendono il link meno
 * pericoloso di una password scritta in chat:
 *
 * 1. **scade** — pochi giorni, non per sempre;
 * 2. **si brucia al primo uso** — se il messaggio viene inoltrato o ripescato
 *    in una chat mesi dopo, non apre più niente;
 * 3. **nel database non c'è** — se ne conserva l'impronta, come per le
 *    password: chi legge il database non entra in nessun account.
 *
 * Chi entra col gettone si trova comunque davanti alla scelta della password:
 * il link fa entrare, non sostituisce la password.
 */

const GIORNI_VALIDI = 7;

function chiave(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET mancante: non posso firmare i gettoni.');
  return s;
}

const impronta = (gettone: string) => createHmac('sha256', chiave()).update(gettone).digest('hex');

/** Genera un gettone, ne salva l'impronta e restituisce quello in chiaro: è l'unica volta che si vede. */
export async function creaGettone(userId: string, creatoDaId?: string): Promise<string> {
  const gettone = randomBytes(24).toString('base64url');

  const scadeIl = new Date();
  scadeIl.setDate(scadeIl.getDate() + GIORNI_VALIDI);

  // I gettoni vecchi di questa persona non valgono più: chi riceve il link
  // nuovo è l'unico che deve poter entrare, e un reset fatto due volte non
  // lascia in giro due porte aperte.
  await prisma.$transaction([
    prisma.gettoneAccesso.deleteMany({ where: { userId, usatoIl: null } }),
    prisma.gettoneAccesso.create({
      data: { userId, hash: impronta(gettone), scadeIl, creatoDaId },
    }),
  ]);

  return gettone;
}

export type EsitoGettone =
  | { ok: true; userId: string }
  | { ok: false; motivo: 'sconosciuto' | 'usato' | 'scaduto' };

/**
 * Verifica un gettone e lo consuma.
 *
 * Il confronto sull'impronta passa da `timingSafeEqual` più che altro per
 * abitudine: la ricerca è su un indice unico, e chi tira a indovinare deve
 * comunque azzeccare ventiquattro byte casuali.
 */
export async function consumaGettone(gettone: string): Promise<EsitoGettone> {
  if (!gettone) return { ok: false, motivo: 'sconosciuto' };

  const atteso = impronta(gettone);
  const riga = await prisma.gettoneAccesso.findUnique({ where: { hash: atteso } });
  if (!riga) return { ok: false, motivo: 'sconosciuto' };

  const a = Buffer.from(riga.hash);
  const b = Buffer.from(atteso);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, motivo: 'sconosciuto' };

  if (riga.usatoIl) return { ok: false, motivo: 'usato' };
  if (riga.scadeIl < new Date()) return { ok: false, motivo: 'scaduto' };

  await prisma.gettoneAccesso.update({
    where: { id: riga.id },
    data: { usatoIl: new Date() },
  });

  return { ok: true, userId: riga.userId };
}
