'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import type { StatoForm } from '@/lib/form';
import { salvaMiaSquadra, salvaTemaSquadra } from './mia-squadra';
import { salvaCampo } from './campi';

/*
 * La prima configurazione guidata (/configura): gli stessi salvataggi di «La
 * mia squadra» e dei campi, con in più il passo successivo. Non c'è niente di
 * nuovo da salvare: c'è solo un ordine in cui chiederlo.
 */

const vai = (passo: string): never => redirect(`/configura?passo=${passo}`);

export async function passoSquadra(prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const esito = await salvaMiaSquadra(prev, fd);
  if (esito.errore) return esito;
  return vai('tema');
}

export async function passoTema(prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const esito = await salvaTemaSquadra(prev, fd);
  if (esito.errore) return esito;
  return vai('figt');
}

/** Un campo alla volta: si resta sul passo, e l'elenco sopra si allunga. */
export async function passoCampo(prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const esito = await salvaCampo(prev, fd);
  revalidatePath('/configura');
  return esito;
}

/**
 * Fine della procedura, finita o saltata: da qui in poi tutto si cambia da
 * «La mia squadra». Poi la home, dove parte il giro guidato.
 */
export async function concludiConfigurazione(): Promise<void> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) redirect('/dashboard');
  await prisma.miaSquadra.upsert({
    where: { id: 'mia' },
    create: { id: 'mia', configurataIl: new Date() },
    update: { configurataIl: new Date() },
  });
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/** Il giro guidato visto, o chiuso: non riparte da solo. */
export async function segnaGiroVisto(): Promise<void> {
  const me = await requireUser();
  await prisma.user.update({ where: { id: me.id }, data: { giroVistoIl: new Date() } });
}
