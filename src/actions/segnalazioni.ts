'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoModerareChat } from '@/lib/domain';
import { comeChiamare } from '@/lib/format';
import { enumVal, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Le segnalazioni: chi legge una cosa fuori posto la passa a chi se ne occupa.
 *
 * Non è un pulsante per litigare meglio. È l'alternativa a rispondere a tono
 * sotto, ed è l'unico modo perché una bacheca resti un posto dove si ha voglia
 * di scrivere. A guardarle è il moderatore, che di mestiere fa solo quello.
 *
 * Il testo del messaggio si copia dentro la segnalazione: se poi il messaggio
 * sparisce resta scritto cosa era stato segnalato, altrimenti chi la legge si
 * troverebbe un rimando a niente.
 */

function aggiorna() {
  revalidatePath('/admin/segnalazioni');
}

const TIPI = ['annuncio', 'evento'] as const;

export async function segnalaCommento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const tipo = enumVal(fd, 'tipo', TIPI, 'annuncio');
  const id = str(fd, 'id');

  const commento =
    tipo === 'annuncio'
      ? await prisma.commentoAnnuncio.findUnique({
          where: { id },
          include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
        })
      : await prisma.commentoEvento.findUnique({
          where: { id },
          include: { utente: { select: { nome: true, cognome: true, callsign: true } } },
        });
  if (!commento) return { errore: 'Messaggio non trovato.' };

  if (commento.userId === me.id) {
    return { errore: 'È un tuo messaggio: se non ti convince più, cancellalo.' };
  }

  const dove =
    tipo === 'annuncio' ? { commentoAnnuncioId: id } : { commentoEventoId: id };

  const gia = await prisma.segnalazione.findFirst({
    where: { segnalatoreId: me.id, ...dove },
    select: { id: true },
  });
  if (gia) return { ok: 'L’avevi già segnalato: la vede un moderatore.' };

  await prisma.segnalazione.create({
    data: {
      ...dove,
      segnalatoreId: me.id,
      testo: commento.testo,
      autore: comeChiamare(commento.utente, { incarico: false, diSquadra: true }).nome,
      motivo: strOpt(fd, 'motivo'),
    },
  });

  aggiorna();
  return {
    ok: 'Segnalato. Lo guarda un moderatore: non serve rispondere sotto.',
  };
}

/**
 * Il moderatore chiude una segnalazione.
 *
 * *Accolta* toglie il messaggio; *respinta* la archivia e basta. In tutti e due
 * i casi resta scritto chi l'ha guardata e quando: una moderazione senza
 * traccia è una moderazione di cui nessuno può rispondere.
 */
export async function gestisciSegnalazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoModerareChat(me.roles)) {
    return { errore: 'Le segnalazioni le guardano i moderatori e l’admin.' };
  }

  const segnalazione = await prisma.segnalazione.findUnique({ where: { id: str(fd, 'id') } });
  if (!segnalazione) return { errore: 'Segnalazione non trovata.' };

  const accolta = str(fd, 'esito') === 'ACCOLTA';

  await prisma.$transaction(async (tx) => {
    if (accolta) {
      // il messaggio se ne va, la segnalazione resta con la sua copia del testo
      if (segnalazione.commentoAnnuncioId) {
        await tx.commentoAnnuncio
          .delete({ where: { id: segnalazione.commentoAnnuncioId } })
          .catch(() => null);
      }
      if (segnalazione.commentoEventoId) {
        await tx.commentoEvento
          .delete({ where: { id: segnalazione.commentoEventoId } })
          .catch(() => null);
      }
    }

    await tx.segnalazione.update({
      where: { id: segnalazione.id },
      data: {
        stato: accolta ? 'ACCOLTA' : 'RESPINTA',
        gestitaDaId: me.id,
        gestitaIl: new Date(),
      },
    });
  });

  aggiorna();
  revalidatePath('/mercatino');
  revalidatePath('/merchandising');
  revalidatePath('/calendario');
  return { ok: accolta ? 'Messaggio tolto.' : 'Segnalazione chiusa senza togliere niente.' };
}
