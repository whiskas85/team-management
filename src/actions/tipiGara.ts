'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bool, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * I tipi di gara: 24 ore, scenario, speedsoft, torneo a squadre.
 *
 * È un'anagrafica a parte dalle tipologie di attività, e vale la pena dire
 * perché non sono la stessa cosa. La **tipologia** governa il gestionale: se
 * si schierano titolari e riserve, se serve il certificato, in che categoria
 * finisce la quota. Il **tipo di gara** non governa niente: racconta che gara
 * è, e serve a chi legge il calendario e a chi un anno dopo si chiede a quante
 * ventiquattr'ore siamo andati.
 *
 * Tenerli separati vuol dire che si può aggiungere un formato nuovo senza
 * toccare le regole, che è quello che succede davvero: i formati li inventano
 * gli organizzatori.
 */

function aggiorna() {
  revalidatePath('/admin/tipi-gara');
  revalidatePath('/calendario');
}

export async function salvaTipoGara(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome del tipo di gara è obbligatorio.' };

  const doppione = await prisma.tipoGara.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già un tipo di gara chiamato "${nome}".` };
  }

  // l'ordine non passa da qui: si decide trascinando le righe nell'elenco
  const valori = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    attivo: bool(fd, 'attivo'),
  };

  if (id) {
    await prisma.tipoGara.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Tipo di gara aggiornato.' };
  }

  const ultimo = await prisma.tipoGara.aggregate({ _max: { ordine: true } });
  await prisma.tipoGara.create({ data: { ...valori, ordine: (ultimo._max.ordine ?? -1) + 1 } });
  aggiorna();
  return { ok: 'Tipo di gara aggiunto: lo trovi in fondo all’elenco, trascinalo dove serve.' };
}

/**
 * Nuovo ordine dei tipi di gara, come sono stati trascinati.
 *
 * Arriva la sequenza intera degli id e si riscrive la posizione di ognuno: è
 * l'unico modo di cambiarla, così non esistono due verità — la tendina del
 * modulo segue questo.
 */
export async function riordinaTipiGara(ids: string[]): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };
  if (ids.length === 0) return { errore: 'Non c’è niente da riordinare.' };

  // le posizioni si riscrivono tutte insieme: a metà strada l'elenco avrebbe
  // due voci nello stesso posto
  await prisma.$transaction(
    ids.map((id, posizione) =>
      prisma.tipoGara.update({ where: { id }, data: { ordine: posizione } }),
    ),
  );

  aggiorna();
  return { ok: 'Ordine salvato.' };
}

export async function eliminaTipoGara(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const usato = await prisma.event.count({ where: { tipoGaraId: id } });

  if (usato > 0) {
    // è legato allo storico: si disattiva invece di cancellarlo, o le gare
    // dell'anno scorso perderebbero il loro nome
    await prisma.tipoGara.update({ where: { id }, data: { attivo: false } });
    aggiorna();
    return { ok: `Usato in ${usato} attività: disattivato anziché eliminato.` };
  }

  await prisma.tipoGara.delete({ where: { id } });
  aggiorna();
  return { ok: 'Tipo di gara eliminato.' };
}
