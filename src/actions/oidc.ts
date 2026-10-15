'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { str, type StatoForm } from '@/lib/form';
import { creaCodice, nuovoClientId, nuovoSegreto, redirectValido } from '@/lib/oidc';
import { controllaRichiesta, ritorno } from '@/lib/oidc-richiesta';

const parametri = (fd: FormData) =>
  Object.fromEntries(
    [
      'client_id',
      'redirect_uri',
      'scope',
      'state',
      'nonce',
      'code_challenge',
      'code_challenge_method',
      'response_type',
    ].map((k) => [k, fd.get(k)?.toString() || undefined]),
  ) as Record<string, string | undefined>;

/** «Va bene»: il consenso resta, e si torna all'app col codice. */
export async function consentiApp(fd: FormData) {
  const me = await requireUser();
  const r = await controllaRichiesta(parametri(fd));
  if ('fermo' in r) throw new Error(r.fermo);
  if ('torna' in r) redirect(r.torna as string);
  const { app, richiesta } = r;
  await prisma.consensoApp.upsert({
    where: { userId_appId: { userId: me.id, appId: app.id } },
    create: { userId: me.id, appId: app.id, scope: richiesta.scope },
    update: { scope: richiesta.scope, il: new Date() },
  });
  const codice = await creaCodice({
    appId: app.id,
    userId: me.id,
    redirectUri: richiesta.redirectUri,
    scope: richiesta.scope,
    nonce: richiesta.nonce,
    codeChallenge: richiesta.codeChallenge,
  });
  redirect(ritorno(richiesta.redirectUri, { code: codice, state: richiesta.state }));
}

/** «No, grazie»: si torna all'app senza niente. */
export async function rifiutaApp(fd: FormData) {
  await requireUser();
  const r = await controllaRichiesta(parametri(fd));
  if ('fermo' in r) throw new Error(r.fermo);
  if ('torna' in r) redirect(r.torna as string);
  redirect(ritorno(r.richiesta.redirectUri, { error: 'access_denied', state: r.richiesta.state }));
}

/** Dal profilo: quest'app non sa più niente di me, e i suoi token si spengono. */
export async function togliConsenso(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const appId = str(fd, 'appId');
  await prisma.consensoApp.deleteMany({ where: { userId: me.id, appId } });
  await prisma.tokenOidc.deleteMany({ where: { userId: me.id, appId } });
  revalidatePath('/profilo');
  return { ok: 'Accesso tolto: la prossima volta l’app ti chiederà di nuovo il permesso.' };
}

// ------------------------------------------------------------------ admin

const indirizzi = (grezzo: string) => [
  ...new Set(
    grezzo
      .split(/\s+/)
      .map((u) => u.trim())
      .filter(Boolean),
  ),
];

/** Una nuova app collegata: l'identificativo, e il segreto mostrato una volta sola. */
export async function creaApp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome all’app (es. «Torneo»).' };
  const uris = indirizzi(str(fd, 'redirectUris'));
  if (uris.length === 0) return { errore: 'Scrivi almeno un indirizzo di ritorno.' };
  const sbagliato = uris.find((u) => !redirectValido(u));
  if (sbagliato) {
    return {
      errore: `«${sbagliato}» non va bene: serve https (http solo per localhost), senza #.`,
    };
  }
  const conSegreto = str(fd, 'tipo') !== 'pubblica';
  const s = conSegreto ? await nuovoSegreto() : null;
  const clientId = nuovoClientId();
  await prisma.appCollegata.create({
    data: {
      nome: nome.slice(0, 80),
      clientId,
      segretoHash: s?.hash ?? null,
      redirectUris: uris,
      creataDaId: me.id,
    },
  });
  revalidatePath('/admin/app');
  return {
    ok:
      `App creata. client_id: ${clientId}` +
      (s ? ` · client_secret: ${s.segreto} — copialo adesso, non si potrà più rivedere.` : ''),
  };
}

export async function salvaApp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  const uris = indirizzi(str(fd, 'redirectUris'));
  if (uris.length === 0) return { errore: 'Scrivi almeno un indirizzo di ritorno.' };
  const sbagliato = uris.find((u) => !redirectValido(u));
  if (sbagliato)
    return { errore: `«${sbagliato}» non va bene: serve https (http solo per localhost).` };
  await prisma.appCollegata.update({
    where: { id: str(fd, 'id') },
    data: {
      nome: str(fd, 'nome').slice(0, 80) || 'App',
      redirectUris: uris,
      attiva: fd.get('attiva') === 'on',
    },
  });
  revalidatePath('/admin/app');
  return { ok: 'Salvata.' };
}

/** Un segreto nuovo: quello vecchio smette subito di valere. */
export async function nuovoSegretoApp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  const s = await nuovoSegreto();
  await prisma.appCollegata.update({ where: { id: str(fd, 'id') }, data: { segretoHash: s.hash } });
  revalidatePath('/admin/app');
  return {
    ok: `Nuovo client_secret: ${s.segreto} — copialo adesso, non si potrà più rivedere. Il vecchio non vale più.`,
  };
}

export async function eliminaApp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin.' };
  await prisma.appCollegata.delete({ where: { id: str(fd, 'id') } }).catch(() => null);
  revalidatePath('/admin/app');
  return { ok: 'App eliminata: chi entrava con lei non entra più.' };
}
