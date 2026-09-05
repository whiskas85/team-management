'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bool, enumVal, intOpt, str, strOpt, type StatoForm } from '@/lib/form';

const COLORI = ['verde', 'rosso', 'ambra', 'azzurro', 'viola', 'grigio'] as const;
const QUOTE = [
  'ISCRIZIONE',
  'TESSERA_FIGT',
  'TORNEO',
  'GARA',
  'ALLENAMENTO',
  'EVENTO',
  'ALTRO',
] as const;

function aggiorna() {
  revalidatePath('/admin/tipologie');
  revalidatePath('/calendario');
  revalidatePath('/admin/statistiche');
}

export async function salvaTipologia(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome della tipologia è obbligatorio.' };

  const doppione = await prisma.tipoAttivita.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già una tipologia chiamata "${nome}".` };
  }

  const valori = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    colore: enumVal(fd, 'colore', COLORI, 'verde'),
    tipoQuota: enumVal(fd, 'tipoQuota', QUOTE, 'EVENTO'),
    riserve: bool(fd, 'riserve'),
    soloInterno: bool(fd, 'soloInterno'),
    certAgonistico: bool(fd, 'certAgonistico'),
    ordine: intOpt(fd, 'ordine') ?? 0,
    attivo: bool(fd, 'attivo'),
  };

  if (id) {
    await prisma.tipoAttivita.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Tipologia aggiornata.' };
  }

  await prisma.tipoAttivita.create({ data: valori });
  aggiorna();
  return { ok: 'Tipologia aggiunta.' };
}

export async function eliminaTipologia(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const usata = await prisma.event.count({ where: { tipoId: id } });

  if (usata > 0) {
    // la tipologia è legata allo storico: la disattiviamo invece di cancellarla
    await prisma.tipoAttivita.update({ where: { id }, data: { attivo: false } });
    aggiorna();
    return { ok: `Tipologia usata in ${usata} attività: disattivata anziché eliminata.` };
  }

  await prisma.tipoAttivita.delete({ where: { id } });
  aggiorna();
  return { ok: 'Tipologia eliminata.' };
}
