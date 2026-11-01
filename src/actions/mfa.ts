'use server';

import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, type StatoForm } from '@/lib/form';
import { marchio } from '@/lib/mia-squadra';
import { cifraSegreto, controllaCodice, nuoviCodiciRecupero } from '@/lib/mfa';
import { indirizzoOtpauth, nuovoSegreto, segretoLeggibile } from '@/lib/totp';

/** Quello che torna ai pulsanti della verifica in due passaggi. */
export type EsitoMfaForm = StatoForm & {
  /** Preparazione: il QR da inquadrare e il segreto da scrivere a mano. */
  qr?: string;
  segreto?: string;
  /** I codici di recupero appena creati: si vedono una volta sola. */
  codici?: string[];
};

/**
 * Primo passo: un segreto nuovo, salvato cifrato ma non ancora attivo. Finché
 * la persona non conferma con un codice, all'accesso non cambia niente: un QR
 * inquadrato male non chiude fuori nessuno.
 */
export async function preparaMfa(): Promise<EsitoMfaForm> {
  const me = await requireUser();
  const u = await prisma.user.findUnique({
    where: { id: me.id },
    select: { mfaAttivoIl: true, callsign: true, email: true },
  });
  if (u?.mfaAttivoIl) return { errore: 'È già attiva.' };

  const segreto = nuovoSegreto();
  await prisma.user.update({
    where: { id: me.id },
    data: { mfaSegreto: cifraSegreto(segreto), mfaUltimoPasso: null, mfaFalliti: 0 },
  });
  const m = await marchio();
  const qr = await QRCode.toDataURL(
    indirizzoOtpauth(segreto, u?.callsign || u?.email || me.id, m.nomeGestionale),
    { margin: 1, width: 240 },
  );
  return { qr, segreto: segretoLeggibile(segreto) };
}

/** Secondo passo: il codice dall'app dice che il QR è andato a buon fine. */
export async function attivaMfa(_prev: EsitoMfaForm, fd: FormData): Promise<EsitoMfaForm> {
  const me = await requireUser();
  const esito = await controllaCodice(me.id, str(fd, 'codice'), { ancheInPreparazione: true });
  if (!esito.ok) return { errore: esito.errore };

  const { chiari, impronte } = nuoviCodiciRecupero();
  await prisma.user.update({
    where: { id: me.id },
    data: { mfaAttivoIl: new Date(), mfaRecupero: impronte },
  });
  revalidatePath('/profilo');
  return { ok: 'Verifica in due passaggi attiva.', codici: chiari };
}

/** Codici di recupero nuovi: i vecchi smettono di valere. Serve un codice. */
export async function nuoviCodiciMfa(_prev: EsitoMfaForm, fd: FormData): Promise<EsitoMfaForm> {
  const me = await requireUser();
  const esito = await controllaCodice(me.id, str(fd, 'codice'));
  if (!esito.ok) return { errore: esito.errore };
  const { chiari, impronte } = nuoviCodiciRecupero();
  await prisma.user.update({ where: { id: me.id }, data: { mfaRecupero: impronte } });
  revalidatePath('/profilo');
  return { ok: 'Codici di recupero nuovi: quelli di prima non valgono più.', codici: chiari };
}

const spenta = {
  mfaSegreto: null,
  mfaAttivoIl: null,
  mfaRecupero: [],
  mfaUltimoPasso: null,
  mfaFalliti: 0,
  mfaBloccatoFino: null,
};

/** La spegne chi l'ha accesa, con un codice (o uno di recupero). */
export async function disattivaMfa(_prev: EsitoMfaForm, fd: FormData): Promise<EsitoMfaForm> {
  const me = await requireUser();
  const esito = await controllaCodice(me.id, str(fd, 'codice'));
  if (!esito.ok) return { errore: esito.errore };
  await prisma.user.update({ where: { id: me.id }, data: spenta });
  revalidatePath('/profilo');
  return { ok: 'Verifica in due passaggi spenta: all’accesso basta la password.' };
}

/**
 * L'admin la spegne a chi ha perso telefono e codici di recupero: altrimenti
 * resterebbe chiuso fuori per sempre. La persona la riaccende quando vuole.
 */
export async function azzeraMfa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può spegnerla a un altro.' };
  const userId = str(fd, 'userId');
  await prisma.user.update({ where: { id: userId }, data: spenta });
  revalidatePath(`/admin/operatori/${userId}`);
  return {
    ok: 'Verifica in due passaggi spenta: ora entra con la sola password, e può riattivarla.',
  };
}
