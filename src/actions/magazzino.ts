'use server';

import { revalidatePath } from 'next/cache';
import type { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestirePagamenti } from '@/lib/domain';
import { eMio } from '@/lib/mercatino';
import { data, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il magazzino: la merce che il team compra in blocco e tiene in casa.
 *
 * Le patch si ordinano cento alla volta e poi si consegnano man mano: quella
 * roba non ha senso chiederla al fornitore a ogni giro, ha una giacenza che
 * scende. Il carico tiene anche **quanto è costata**, che è il numero che dice
 * se su una patch venduta a 5 il team ci guadagna o ci rimette.
 *
 * I carichi si sommano invece di aggiornare un totale: resta la storia dei
 * prezzi pagati, e una quantità sbagliata si corregge togliendo la riga
 * sbagliata invece di indovinare il totale giusto.
 */

function aggiorna(annuncioId: string) {
  revalidatePath(`/mercatino/${annuncioId}`);
  revalidatePath(`/merchandising/${annuncioId}`);
  revalidatePath('/admin/inventario');
  revalidatePath('/admin/ordini');
}

/**
 * La voce, per chi può metterci mano sul magazzino.
 *
 * Chi ha scritto l'annuncio, e la segreteria: il magazzino è roba di cassa
 * prima che di catalogo, e chi tiene i conti deve poter correggere una
 * giacenza senza passare dall'admin.
 */
async function miaVoce(id: string, me: { id: string; roles: Role[] }) {
  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id },
    include: { annuncio: true },
  });
  if (!voce) return null;
  if (!eMio(voce.annuncio, me.id) && !puoGestirePagamenti(me.roles)) return null;
  return voce;
}

export async function registraCarico(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const voce = await miaVoce(str(fd, 'voceId'), me);
  if (!voce) return { errore: 'Voce non trovata, o non è tua.' };
  if (!voce.aMagazzino) {
    return { errore: 'Questa voce non è tenuta a magazzino: accendi l’interruttore nel modulo.' };
  }

  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita <= 0) return { errore: 'Quanti pezzi sono arrivati?' };

  const costo = num(fd, 'costoUnitario');
  if (costo === null || costo < 0) {
    return { errore: 'Scrivi quanto è costato un pezzo: serve a sapere se ci si guadagna.' };
  }

  await prisma.caricoMagazzino.create({
    data: {
      voceId: voce.id,
      quantita,
      costoUnitario: costo,
      fornitore: strOpt(fd, 'fornitore'),
      note: strOpt(fd, 'note'),
      compratoIl: data(fd, 'compratoIl') ?? new Date(),
      registratoDaId: me.id,
    },
  });

  aggiorna(voce.annuncioId);
  return { ok: `Caricati ${quantita} pezzi di ${voce.titolo}.` };
}

/** Si toglie un carico sbagliato: il totale si ricalcola da solo. */
export async function eliminaCarico(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const carico = await prisma.caricoMagazzino.findUnique({
    where: { id: str(fd, 'id') },
    include: { voce: { include: { annuncio: true } } },
  });
  if (!carico || (!eMio(carico.voce.annuncio, me.id) && !puoGestirePagamenti(me.roles))) {
    return { errore: 'Carico non trovato, o non è tuo.' };
  }

  await prisma.caricoMagazzino.delete({ where: { id: carico.id } });
  aggiorna(carico.voce.annuncioId);
  return { ok: 'Carico eliminato.' };
}
