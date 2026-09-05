'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare } from '@/lib/domain';
import { stagioneAttiva, tariffa } from '@/lib/stagioni';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

const STATI = ['DA_RECUPERARE', 'ATTIVA', 'SCADUTA', 'REVOCATA'] as const;

function aggiorna() {
  revalidatePath('/admin/tessere');
  revalidatePath('/profilo');
  revalidatePath('/dashboard');
}

/**
 * La tessera è di fatto il codice recuperato dal portale federale: qui si
 * registra il codice e la data in cui è stato verificato.
 */
/** La stagione scelta a mano, altrimenti quella in corso. */
async function risolviStagione(id: string | null) {
  if (id) {
    const scelta = await prisma.stagione.findUnique({ where: { id } });
    if (scelta) return scelta;
  }
  return stagioneAttiva();
}

export async function salvaTessera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per gestire le tessere.' };

  const id = str(fd, 'id');
  const codice = strOpt(fd, 'codice');
  const stagione = await risolviStagione(strOpt(fd, 'stagioneId'));

  // se arriva un codice la tessera è di fatto attiva, salvo indicazione diversa
  const statoScelto = enumVal(fd, 'status', STATI, codice ? 'ATTIVA' : 'DA_RECUPERARE');

  const valori = {
    codice,
    stagioneId: stagione.id,
    status: statoScelto,
    scadeIl: data(fd, 'scadeIl'),
    verificatoIl: codice ? new Date() : null,
    note: strOpt(fd, 'note'),
  };

  if (id) {
    await prisma.figtCard.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: codice ? 'Codice tessera registrato.' : 'Tessera aggiornata.' };
  }

  const userId = str(fd, 'userId');
  if (!userId) return { errore: 'Seleziona l’operatore.' };

  const tessera = await prisma.figtCard.create({ data: { ...valori, userId } });

  const quota = num(fd, 'quota') ?? (await tariffa('TESSERA_FIGT', stagione.id));
  if (quota && quota > 0) {
    await prisma.payment.create({
      data: {
        userId,
        tipo: 'TESSERA_FIGT',
        descrizione: `Tessera federale ${stagione.nome}`,
        importo: quota,
        status: 'DA_PAGARE',
        scadenza: valori.scadeIl,
        figtCardId: tessera.id,
        recordedById: me.id,
      },
    });
    revalidatePath('/admin/pagamenti');
  }

  aggiorna();
  return { ok: 'Tessera registrata.' };
}

export async function eliminaTessera(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };

  await prisma.figtCard.delete({ where: { id: str(fd, 'id') } });
  aggiorna();
  return { ok: 'Tessera eliminata.' };
}

/** Predispone le righe "da recuperare" per tutta la squadra in una volta. */
export async function predisponiTessere(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };

  const stagione = await risolviStagione(strOpt(fd, 'stagioneId'));

  const squadra = await prisma.user.findMany({
    where: { stato: { in: ['SQUADRA', 'SOSPESO'] } },
    select: { id: true },
  });
  const gia = await prisma.figtCard.findMany({
    where: { stagioneId: stagione.id, userId: { in: squadra.map((s) => s.id) } },
    select: { userId: true },
  });
  const mancanti = squadra.filter((s) => !gia.some((g) => g.userId === s.id));

  if (mancanti.length === 0) return { ok: 'Tutta la squadra ha già la riga tessera.' };

  await prisma.figtCard.createMany({
    data: mancanti.map((m) => ({
      userId: m.id,
      stagioneId: stagione.id,
      status: 'DA_RECUPERARE' as const,
    })),
  });

  aggiorna();
  return { ok: `Predisposte ${mancanti.length} tessere da recuperare.` };
}
