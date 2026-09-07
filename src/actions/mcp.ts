'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { nuovaChiave } from '@/lib/mcp/chiavi';
import { str, strOpt, type StatoForm } from '@/lib/form';

/** Chiavi personali per gli assistenti: ognuno gestisce le proprie, nessuno quelle altrui. */

function aggiorna() {
  revalidatePath('/assistente');
}

const MASSIME = 5;

export async function creaChiaveMcp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome alla chiave: serve a riconoscerla per revocarla.' };

  // un tetto basso non protegge da niente di tecnico: serve a tenere l'elenco
  // leggibile, perché una chiave che non si sa più cos'è non si revoca mai
  const quante = await prisma.tokenMcp.count({ where: { userId: me.id, revocatoIl: null } });
  if (quante >= MASSIME) {
    return { errore: `Hai già ${MASSIME} chiavi attive: revocane una prima di farne un'altra.` };
  }

  const giorni = Number(strOpt(fd, 'giorni') ?? '');
  const scadeIl =
    Number.isFinite(giorni) && giorni > 0
      ? new Date(Date.now() + giorni * 86400000)
      : null;

  const chiave = nuovaChiave();
  await prisma.tokenMcp.create({
    data: {
      id: chiave.id,
      userId: me.id,
      nome,
      hash: chiave.hash,
      prefisso: chiave.prefisso,
      scadeIl,
    },
  });

  aggiorna();
  // la chiave in chiaro esce di qui una volta sola: nel database ne resta
  // l'impronta, quindi il riquadro da copiare è l'unica occasione di averla
  return {
    ok: 'Chiave creata.',
    chiave: { nome, token: chiave.token },
  };
}

export async function revocaChiaveMcp(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  // il filtro sull'utente è la sicurezza, non l'estetica: senza, l'id di una
  // chiave altrui basterebbe a spegnerla
  const spente = await prisma.tokenMcp.updateMany({
    where: { id: str(fd, 'id'), userId: me.id, revocatoIl: null },
    data: { revocatoIl: new Date() },
  });
  if (spente.count === 0) return { errore: 'Chiave non trovata fra le tue.' };

  aggiorna();
  return { ok: 'Chiave revocata: da adesso non apre più niente.' };
}
