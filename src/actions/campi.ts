'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bool, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

const TIPI = ['BOSCHIVO', 'URBANO', 'CQB', 'INDOOR', 'MISTO'] as const;

export async function salvaCampo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può gestire i campi.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome del campo è obbligatorio.' };

  const valori = {
    nome,
    tipo: enumVal(fd, 'tipo', TIPI, 'BOSCHIVO'),
    indirizzo: strOpt(fd, 'indirizzo'),
    citta: strOpt(fd, 'citta'),
    provincia: strOpt(fd, 'provincia'),
    lat: num(fd, 'lat'),
    lng: num(fd, 'lng'),
    referente: strOpt(fd, 'referente'),
    telefono: strOpt(fd, 'telefono'),
    sito: strOpt(fd, 'sito'),
    costo: num(fd, 'costo'),
    note: strOpt(fd, 'note'),
    attivo: bool(fd, 'attivo'),
    squadraId: strOpt(fd, 'squadraId'),
  };

  if (id) {
    await prisma.field.update({ where: { id }, data: valori });
  } else {
    await prisma.field.create({ data: valori });
  }

  revalidatePath('/admin/campi');
  revalidatePath('/admin/squadre');
  revalidatePath('/calendario');
  return { ok: id ? 'Campo aggiornato.' : 'Campo aggiunto.' };
}

export async function eliminaCampo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può eliminare i campi.' };

  const id = str(fd, 'id');
  const usato = await prisma.event.count({ where: { fieldId: id } });
  if (usato > 0) {
    // il campo è legato allo storico: lo archiviamo invece di cancellarlo
    await prisma.field.update({ where: { id }, data: { attivo: false } });
    revalidatePath('/admin/campi');
    return { ok: `Campo usato in ${usato} eventi: archiviato anziché eliminato.` };
  }

  await prisma.field.delete({ where: { id } });
  revalidatePath('/admin/campi');
  redirect('/admin/campi');
}
