'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bool, str, strOpt, type StatoForm } from '@/lib/form';

function aggiorna() {
  revalidatePath('/admin/squadre');
  revalidatePath('/admin/campi');
  revalidatePath('/calendario');
}

export async function salvaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome della squadra è obbligatorio.' };

  const doppione = await prisma.squadraEsterna.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già una squadra chiamata "${nome}".` };
  }

  const valori = {
    nome,
    referente: strOpt(fd, 'referente'),
    telefono: strOpt(fd, 'telefono'),
    email: strOpt(fd, 'email'),
    sito: strOpt(fd, 'sito'),
    citta: strOpt(fd, 'citta'),
    provincia: strOpt(fd, 'provincia')?.toUpperCase() ?? null,
    note: strOpt(fd, 'note'),
    attiva: bool(fd, 'attiva'),
  };

  if (id) {
    await prisma.squadraEsterna.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Squadra aggiornata.' };
  }

  await prisma.squadraEsterna.create({ data: valori });
  aggiorna();
  return { ok: 'Squadra aggiunta.' };
}

export async function eliminaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const campi = await prisma.field.count({ where: { squadraId: id } });

  if (campi > 0) {
    // resta agganciata ai campi: la disattiviamo per non perdere il riferimento
    await prisma.squadraEsterna.update({ where: { id }, data: { attiva: false } });
    aggiorna();
    return { ok: `Squadra collegata a ${campi} campi: disattivata anziché eliminata.` };
  }

  await prisma.squadraEsterna.delete({ where: { id } });
  aggiorna();
  return { ok: 'Squadra eliminata.' };
}
