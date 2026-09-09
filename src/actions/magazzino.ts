'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestirePagamenti } from '@/lib/domain';
import { data, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * I carichi: quanti pezzi di un articolo sono entrati, e a quanto.
 *
 * Si sommano invece di aggiornare un totale, così resta la storia dei prezzi
 * pagati e una quantità sbagliata si corregge togliendo la riga sbagliata
 * invece di indovinare il totale giusto. Il costo del pezzo è il numero che
 * dice se su una patch venduta a 5 il team ci guadagna o ci rimette.
 *
 * Stanno sull'**articolo** e non sulla riga di vetrina: sono fatti del
 * magazzino. Appesi al catalogo, sparivano insieme a una voce cancellata e
 * con loro la storia di quanto era costata quella merce.
 */

function aggiorna() {
  revalidatePath('/admin/magazzino');
  revalidatePath('/admin/ordini');
  revalidatePath('/admin/cassa');
  revalidatePath('/merchandising');
}

/**
 * Il magazzino lo tiene chi tiene i conti.
 *
 * Prima ci metteva mano anche chi aveva scritto l'annuncio, perché magazzino e
 * catalogo erano la stessa cosa. Adesso che sono due elenchi diversi la
 * risposta è più semplice: le giacenze sono roba di cassa, e le muove chi la
 * cassa la gestisce.
 */
async function articolo(id: string) {
  return prisma.articoloMagazzino.findUnique({ where: { id } });
}

export async function registraCarico(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const art = await articolo(str(fd, 'articoloId'));
  if (!art) return { errore: 'Articolo non trovato.' };

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
      articoloId: art.id,
      quantita,
      costoUnitario: costo,
      fornitore: strOpt(fd, 'fornitore'),
      note: strOpt(fd, 'note'),
      compratoIl: data(fd, 'compratoIl') ?? new Date(),
      registratoDaId: me.id,
    },
  });

  aggiorna();
  return {
    ok:
      quantita > 0
        ? `Caricati ${quantita} pezzi di ${art.nome}.`
        : `Tolti ${-quantita} pezzi di ${art.nome}.`,
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
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const carico = await prisma.caricoMagazzino.findUnique({
    where: { id: str(fd, 'id') },
    include: { rigaRiordino: { select: { riordino: { select: { id: true, pagatoIl: true } } } } },
  });
  if (!carico) return { errore: 'Carico non trovato.' };

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

  aggiorna();
  return {
    ok: riordino
      ? 'Carico annullato: il riordino torna in attesa della merce.'
      : 'Carico eliminato.',
  };
}
