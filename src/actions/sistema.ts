'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import type { StatoForm } from '@/lib/form';
import { alleggerisciEsistenti, registraMisura } from '@/lib/sistema';

const mb = (b: number) =>
  `${(b / 1024 / 1024).toLocaleString('it-IT', { maximumFractionDigits: 1 })} MB`;

/**
 * Alleggerisce i file già caricati (tutti, o di un anno), finché c'è tempo:
 * se ne restano, si preme di nuovo e si riparte da dove si era arrivati.
 */
export async function alleggerisciFile(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  const a = Number(fd.get('anno'));
  const esito = await alleggerisciEsistenti({
    anno: Number.isInteger(a) && a > 2000 ? a : undefined,
  });
  await registraMisura().catch(() => null);
  revalidatePath('/admin/sistema');
  if (esito.passati === 0) return { ok: 'Niente da alleggerire: sono già passati tutti.' };
  return {
    ok:
      `${esito.passati} file passati, ${mb(esito.risparmiati)} liberati.` +
      (esito.rimasti > 0
        ? ` Ne restano ${esito.rimasti}: premi di nuovo per continuare.`
        : ' Finito.'),
  };
}

/** Rifà la misura dello spazio adesso. */
export async function misuraAdesso(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  await registraMisura();
  revalidatePath('/admin/sistema');
  return { ok: 'Misurato.' };
}
