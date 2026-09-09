'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import type { StatoForm } from '@/lib/form';

/**
 * I preferiti di chi sta usando il gestionale.
 *
 * Sono voci di menu messe da parte, e appartengono alla persona: nessuno
 * decide i preferiti di qualcun altro, nemmeno l'admin. Per questo qui non c'è
 * nessun controllo di ruolo — c'è solo `requireUser`, e si scrive sempre e
 * comunque sulla propria riga.
 *
 * Il menu si ricostruisce nel layout, quindi ogni modifica lo invalida per
 * intero: è l'unico modo perché la stellina si accenda e la voce compaia nello
 * stesso istante, invece che al prossimo giro di pagina.
 */

/** Quanti se ne possono tenere: oltre, il menu smette di essere una scorciatoia. */
const MASSIMO = 12;

function aggiorna() {
  // 'layout' e non la sola pagina: il menu vive lì, e sta su tutte
  revalidatePath('/', 'layout');
}

/**
 * Accende o spegne la stellina sulla pagina che si sta guardando.
 *
 * Arriva l'indirizzo e basta: etichetta e icona non si conservano, se le
 * ripesca il menu. Una voce nuova si mette in fondo — chi la vuole più su la
 * trascina, e non è il gestionale a indovinare dove.
 */
export async function commutaPreferito(href: string): Promise<StatoForm> {
  const me = await requireUser();
  if (!href.startsWith('/')) return { errore: 'Indirizzo non valido.' };

  const gia = await prisma.preferito.findUnique({
    where: { userId_href: { userId: me.id, href } },
  });

  if (gia) {
    await prisma.preferito.delete({ where: { userId_href: { userId: me.id, href } } });
    aggiorna();
    return { ok: 'Tolta dai preferiti.' };
  }

  const quanti = await prisma.preferito.count({ where: { userId: me.id } });
  if (quanti >= MASSIMO) {
    return {
      errore: `Hai già ${MASSIMO} preferiti: togline uno. Oltre, non sono più una scorciatoia.`,
    };
  }

  const ultimo = await prisma.preferito.aggregate({
    where: { userId: me.id },
    _max: { ordine: true },
  });
  await prisma.preferito.create({
    data: { userId: me.id, href, ordine: (ultimo._max.ordine ?? -1) + 1 },
  });

  aggiorna();
  return { ok: 'Aggiunta ai preferiti.' };
}

/**
 * Il nuovo ordine, come è stato trascinato.
 *
 * Arriva la sequenza intera e si riscrive la posizione di ognuno, invece di
 * «questa sale di uno»: chi trascina può spostare una voce di quattro posti in
 * un gesto solo, e mandare il risultato è l'unico modo perché quello che si
 * vede sotto il dito e quello che finisce nel database siano la stessa cosa.
 *
 * Si scrive solo su quello che è davvero suo: un indirizzo che non è fra i
 * propri preferiti viene ignorato, non creato.
 */
export async function riordinaPreferiti(hrefs: string[]): Promise<StatoForm> {
  const me = await requireUser();
  if (hrefs.length === 0) return { errore: 'Non c’è niente da riordinare.' };

  const miei = new Set(
    (await prisma.preferito.findMany({ where: { userId: me.id }, select: { href: true } })).map(
      (p) => p.href,
    ),
  );
  const daScrivere = hrefs.filter((h) => miei.has(h));

  // le posizioni si riscrivono tutte insieme: a metà strada l'elenco avrebbe
  // due voci nello stesso posto
  await prisma.$transaction(
    daScrivere.map((href, posizione) =>
      prisma.preferito.update({
        where: { userId_href: { userId: me.id, href } },
        data: { ordine: posizione },
      }),
    ),
  );

  aggiorna();
  return { ok: 'Ordine salvato.' };
}
