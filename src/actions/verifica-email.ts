'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import type { StatoForm } from '@/lib/form';
import { serverPosta } from '@/lib/posta';
import { confermaVerifica, mandaVerifica, type EsitoVerifica } from '@/lib/verifica-email';

/** Il pulsante della pagina di verifica: la conferma vera. */
export async function confermaEmail(
  _prev: EsitoVerifica | null,
  fd: FormData,
): Promise<EsitoVerifica> {
  return confermaVerifica(
    fd.get('u')?.toString() ?? '',
    fd.get('s')?.toString() ?? '',
    fd.get('f')?.toString() ?? '',
  );
}

/** «Mandami l'email di verifica», dal profilo. */
export async function chiediVerifica(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!(await serverPosta())) return { errore: 'Non c’è un server di posta collegato.' };
  const esito = await mandaVerifica(me.id);
  if (esito.errore) return { errore: `Email non partita: ${esito.errore}` };
  revalidatePath('/profilo');
  return { ok: 'Fatto: apri il link che ti è arrivato (controlla anche nello spam).' };
}
