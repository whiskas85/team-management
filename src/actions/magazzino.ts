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

  // Un numero negativo toglie: è la rettifica in meno, e serve almeno quanto
  // quella in più — un 500 battuto al posto di 50 va potuto disfare senza
  // andare a cercare la riga sbagliata.
  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita === 0) {
    return { errore: 'Quanti pezzi? Un numero negativo li toglie.' };
  }

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
  return {
    ok:
      quantita > 0
        ? `Caricati ${quantita} pezzi di ${voce.titolo}.`
        : `Tolti ${-quantita} pezzi di ${voce.titolo}.`,
  };
}

/**
 * Si toglie una riga di carico sbagliata: il totale si ricalcola da solo.
 *
 * Se quella riga era la **ricezione di un riordino**, l'ordine torna indietro
 * di un passo: dire che la merce non è entrata e lasciare l'ordine segnato
 * come ricevuto vorrebbe dire tenersi due verità diverse sullo stesso fatto.
 */
export async function eliminaCarico(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const carico = await prisma.caricoMagazzino.findUnique({
    where: { id: str(fd, 'id') },
    include: {
      voce: { include: { annuncio: true } },
      rigaRiordino: { select: { riordino: { select: { id: true, pagatoIl: true } } } },
    },
  });
  if (!carico || (!eMio(carico.voce.annuncio, me.id) && !puoGestirePagamenti(me.roles))) {
    return { errore: 'Carico non trovato, o non è tuo.' };
  }

  const riordino = carico.rigaRiordino?.riordino;

  await prisma.$transaction(async (tx) => {
    await tx.caricoMagazzino.delete({ where: { id: carico.id } });
    if (riordino) {
      await tx.riordino.update({
        where: { id: riordino.id },
        data: { stato: riordino.pagatoIl ? 'PAGATO' : 'APERTO', ricevutoIl: null },
      });
    }
  });

  aggiorna(carico.voce.annuncioId);
  return {
    ok: riordino
      ? 'Carico annullato: il riordino torna in attesa della merce.'
      : 'Carico eliminato.',
  };
}
