'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestirePagamenti } from '@/lib/domain';
import { str, type StatoForm } from '@/lib/form';

function aggiorna() {
  revalidatePath('/admin/casse');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/cassa');
  revalidatePath('/pagamenti');
}

/**
 * Crea o rinomina una cassa.
 *
 * Le casse le configurano admin e segreteria, non chi le usa: Mario incassa
 * nella sua, ma che esista, come si chiami e con che metodi si paga lo decide
 * chi tiene i conti della squadra.
 */
export async function salvaCassa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Le casse le configurano admin e segreteria.' };
  }

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome alla cassa, es. «Corso K9 — Mario Rossi».' };

  const omonima = await prisma.cassa.findUnique({ where: { nome } });
  if (omonima && omonima.id !== id) {
    return { errore: `Esiste già una cassa chiamata «${nome}».` };
  }

  if (id) {
    await prisma.cassa.update({
      where: { id },
      data: {
        nome,
        attiva: fd.get('attiva') !== null,
        perPolizza: fd.get('perPolizza') !== null,
      },
    });
    aggiorna();
    return { ok: 'Cassa aggiornata.' };
  }

  await prisma.cassa.create({ data: { nome, perPolizza: fd.get('perPolizza') !== null } });
  aggiorna();
  return {
    ok: 'Cassa creata: adesso abilita chi la gestisce e aggiungi i suoi metodi di pagamento.',
  };
}

/**
 * Toglie una cassa, se non è mai servita.
 *
 * Una cassa con dei pagamenti dentro non si cancella: sparirebbe il filo fra
 * chi ha pagato e dove sono finiti i soldi. Si spegne, e chi la gestisce
 * continua a vedere quello che c'era.
 */
export async function eliminaCassa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Le casse le configurano admin e segreteria.' };
  }

  const id = str(fd, 'id');
  // anche una voce del tariffario la tiene in vita: cancellandola, la voce non
  // saprebbe più a chi mandare i soldi
  const [usata, voci] = await Promise.all([
    prisma.payment.count({ where: { cassaId: id } }),
    prisma.tariffa.count({ where: { cassaId: id } }),
  ]);
  if (usata === 0 && voci > 0) {
    await prisma.cassa.update({ where: { id }, data: { attiva: false } });
    aggiorna();
    return {
      ok: `La cassa ha ${voci === 1 ? 'una voce' : `${voci} voci`} nel tariffario: spenta invece che eliminata.`,
    };
  }
  if (usata > 0) {
    await prisma.cassa.update({ where: { id }, data: { attiva: false } });
    aggiorna();
    return {
      ok: `La cassa ha ${usata === 1 ? 'un pagamento' : `${usata} pagamenti`}: spenta invece che eliminata, così restano leggibili.`,
    };
  }

  await prisma.cassa.delete({ where: { id } });
  aggiorna();
  return { ok: 'Cassa eliminata.' };
}

/** Abilita una persona a gestire una cassa: da quel momento la trova nel suo menu. */
export async function abilitaGestore(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Chi gestisce le casse lo decidono admin e segreteria.' };
  }

  const cassaId = str(fd, 'cassaId');
  const userId = str(fd, 'userId');
  if (!userId) return { errore: 'Scegli chi abilitare.' };

  const persona = await prisma.user.findUnique({
    where: { id: userId },
    select: { nome: true, cognome: true, stato: true },
  });
  if (!persona || persona.stato === 'DISABILITATO') return { errore: 'Persona non trovata.' };

  await prisma.cassa.update({
    where: { id: cassaId },
    data: { gestori: { connect: { id: userId } } },
  });
  aggiorna();
  return { ok: `${persona.nome} ${persona.cognome} gestisce questa cassa: la trova nel suo menu.` };
}

/**
 * Toglie a una persona la gestione di una cassa.
 *
 * I pagamenti restano dove sono: cambia solo chi li può vedere e confermare.
 */
export async function togliGestore(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Chi gestisce le casse lo decidono admin e segreteria.' };
  }

  await prisma.cassa.update({
    where: { id: str(fd, 'cassaId') },
    data: { gestori: { disconnect: { id: str(fd, 'userId') } } },
  });
  aggiorna();
  return { ok: 'Non gestisce più questa cassa.' };
}
