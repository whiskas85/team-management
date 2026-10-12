'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { cifra, decifra } from '@/lib/segreti';
import { bool, intOpt, str, strOpt, type StatoForm } from '@/lib/form';
import { inviaEmail, provaCollegamento } from '@/lib/posta';
import { marchio } from '@/lib/mia-squadra';

/**
 * Il server di posta: si collega, si prova, si toglie. Solo l'admin.
 *
 * Salvando si prova subito il collegamento: un server salvato ma che non
 * accetta la password è peggio di nessun server, perché sembra a posto.
 */

const email = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export async function salvaServerPosta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Il server di posta lo collega l’admin.' };

  const host = str(fd, 'host').toLowerCase();
  const porta = intOpt(fd, 'porta') ?? 465;
  const sicuro = bool(fd, 'sicuro');
  const utente = str(fd, 'utente');
  const mittente = str(fd, 'mittente') || utente;
  const nomeMittente = strOpt(fd, 'nomeMittente');
  if (!host) return { errore: 'Scrivi il server (per Aruba: smtps.aruba.it).' };
  if (!utente) return { errore: 'Scrivi l’utente: per Aruba è l’indirizzo email intero.' };
  if (!email(mittente)) return { errore: 'Il mittente deve essere un indirizzo email.' };
  if (porta < 1 || porta > 65535) return { errore: 'Porta non valida.' };

  // la password vuota lascia quella di prima: non si rimostra mai
  const prima = await prisma.serverPosta.findUnique({ where: { id: 'unico' } });
  const nuova = str(fd, 'password');
  const password = nuova || (prima ? decifra(prima.passwordCifrata) : '');
  if (!password) return { errore: 'Scrivi la password della casella.' };

  const errore = await provaCollegamento({
    host,
    porta,
    sicuro,
    utente,
    password,
    mittente,
    nomeMittente,
  });

  await prisma.serverPosta.upsert({
    where: { id: 'unico' },
    create: {
      host,
      porta,
      sicuro,
      utente,
      passwordCifrata: cifra(password),
      mittente,
      nomeMittente,
      provatoIl: new Date(),
      erroreProva: errore,
    },
    update: {
      host,
      porta,
      sicuro,
      utente,
      passwordCifrata: cifra(password),
      mittente,
      nomeMittente,
      attivo: true,
      provatoIl: new Date(),
      erroreProva: errore,
    },
  });
  revalidatePath('/admin/posta');
  return errore
    ? { errore: `Salvato, ma il collegamento non va: ${errore}` }
    : { ok: 'Collegato: il server accetta la casella.' };
}

/** Un'email di prova all'indirizzo di chi la chiede. */
export async function provaEmail(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'La prova la fa l’admin.' };
  const io = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
  if (!io?.email) return { errore: 'Il tuo profilo non ha un’email a cui mandarla.' };
  const { nomeGestionale } = await marchio();
  const esito = await inviaEmail({
    a: io.email,
    oggetto: `${nomeGestionale}: prova della posta`,
    testo: `Questa è un'email di prova del gestionale ${nomeGestionale}.\n\nSe la leggi, il server di posta funziona.`,
  });
  await prisma.serverPosta.updateMany({
    where: { id: 'unico' },
    data: { provatoIl: new Date(), erroreProva: esito.errore ?? null },
  });
  revalidatePath('/admin/posta');
  return esito.errore
    ? { errore: `Non è partita: ${esito.errore}` }
    : { ok: `Mandata a ${io.email}: controlla la casella (anche lo spam).` };
}

/** Scollega il server: le credenziali si cancellano. */
export async function togliServerPosta(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Lo fa l’admin.' };
  await prisma.serverPosta.deleteMany({ where: { id: 'unico' } });
  revalidatePath('/admin/posta');
  return { ok: 'Server di posta scollegato: le credenziali sono cancellate.' };
}
