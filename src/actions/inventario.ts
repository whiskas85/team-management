'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestirePagamenti } from '@/lib/domain';
import { manigliaUnica, totaleRiordino } from '@/lib/mercatino';
import { data, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * L'inventario: quello che il team ha in casa, e i riordini al fornitore.
 *
 * È il contrario di un ordine del merchandising — lì la squadra compra dal
 * team, qui il team compra dal fornitore — e per questo tocca la cassa dalla
 * parte delle **uscite**.
 *
 * I due passaggi sono separati perché nella realtà lo sono: si paga quando si
 * paga e la roba arriva quando arriva. Un pulsante fa uscire i soldi dalla
 * cassa, l'altro fa entrare la merce in magazzino, e l'ordine si porta dietro
 * tutt'e due le date.
 */

function aggiorna(voceId?: string) {
  revalidatePath('/admin/inventario');
  revalidatePath('/admin/ordini');
  revalidatePath('/admin/cassa');
  revalidatePath('/merchandising');
  if (voceId) revalidatePath('/mercatino');
}

/** La voce, ma solo se è roba tenuta in magazzino. */
async function voceDiMagazzino(id: string) {
  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id },
    include: { annuncio: { select: { id: true, titolo: true } } },
  });
  if (!voce || !voce.aMagazzino) return null;
  return voce;
}

// ------------------------------------------------------------------ riordini

export async function creaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'L’inventario lo tengono admin e segreteria.' };
  }

  const voce = await voceDiMagazzino(str(fd, 'voceId'));
  if (!voce) return { errore: 'Scegli una voce tenuta a magazzino.' };

  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita <= 0) return { errore: 'Quanti pezzi si ordinano?' };

  const costo = num(fd, 'costoUnitario');
  if (costo === null || costo < 0) return { errore: 'Scrivi quanto costa un pezzo.' };

  const riordino = await prisma.riordino.create({
    data: {
      fornitore: strOpt(fd, 'fornitore'),
      note: strOpt(fd, 'note'),
      creatoDaId: me.id,
      righe: { create: { voceId: voce.id, quantita, costoUnitario: costo } },
    },
  });

  aggiorna(voce.id);
  return { ok: `Riordino ${riordino.numero} aperto: ${quantita} × ${voce.titolo}.` };
}

/** Un'altra riga sullo stesso ordine, finché non è stato pagato o ricevuto. */
export async function aggiungiRigaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) return { errore: 'Non è roba tua.' };

  const riordino = await prisma.riordino.findUnique({ where: { id: str(fd, 'riordinoId') } });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato !== 'APERTO') {
    return { errore: 'Questo riordino è già andato avanti: le righe non si toccano più.' };
  }

  const voce = await voceDiMagazzino(str(fd, 'voceId'));
  if (!voce) return { errore: 'Scegli una voce tenuta a magazzino.' };

  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita <= 0) return { errore: 'Quanti pezzi?' };

  const costo = num(fd, 'costoUnitario');
  if (costo === null || costo < 0) return { errore: 'Scrivi quanto costa un pezzo.' };

  await prisma.rigaRiordino.create({
    data: { riordinoId: riordino.id, voceId: voce.id, quantita, costoUnitario: costo },
  });

  aggiorna(voce.id);
  return { ok: `Aggiunti ${quantita} × ${voce.titolo}.` };
}

export async function eliminaRigaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) return { errore: 'Non è roba tua.' };

  const riga = await prisma.rigaRiordino.findUnique({
    where: { id: str(fd, 'id') },
    include: { riordino: true },
  });
  if (!riga) return { errore: 'Riga non trovata.' };
  if (riga.riordino.stato !== 'APERTO') {
    return { errore: 'Questo riordino è già andato avanti: le righe non si toccano più.' };
  }

  await prisma.rigaRiordino.delete({ where: { id: riga.id } });
  aggiorna();
  return { ok: 'Riga tolta.' };
}

/**
 * I soldi escono dalla cassa.
 *
 * L'uscita è un movimento normale, di quelli che si vedono in cassa insieme a
 * tutti gli altri: qui si scrive da sola con l'importo giusto, invece di
 * doverla ricopiare a mano e sbagliare una cifra.
 */
export async function pagaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Solo admin e segreteria possono muovere la cassa.' };
  }

  const riordino = await prisma.riordino.findUnique({
    where: { id: str(fd, 'id') },
    include: { righe: { include: { voce: { select: { titolo: true } } } } },
  });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato === 'ANNULLATO') return { errore: 'Questo riordino è annullato.' };
  if (riordino.movimentoId) return { errore: 'Già pagato: l’uscita di cassa c’è.' };
  if (riordino.righe.length === 0) return { errore: 'Non c’è niente da pagare: aggiungi una riga.' };

  const totale = totaleRiordino(riordino.righe);
  const cosa = riordino.righe.map((r) => `${r.quantita} × ${r.voce.titolo}`).join(', ');

  await prisma.$transaction(async (tx) => {
    const movimento = await tx.movimentoCassa.create({
      data: {
        tipo: 'USCITA',
        descrizione: `Riordino ${riordino.numero}${riordino.fornitore ? ` · ${riordino.fornitore}` : ''}: ${cosa}`.slice(0, 250),
        importo: totale,
        categoria: 'Merchandising',
        data: data(fd, 'data') ?? new Date(),
        metodoId: strOpt(fd, 'metodoId'),
        registratoById: me.id,
      },
    });

    await tx.riordino.update({
      where: { id: riordino.id },
      data: {
        movimentoId: movimento.id,
        pagatoIl: new Date(),
        // se la merce è già arrivata lo stato resta quello: pagare non fa
        // tornare indietro un ordine già ricevuto
        stato: riordino.stato === 'RICEVUTO' ? 'RICEVUTO' : 'PAGATO',
      },
    });
  });

  aggiorna();
  return { ok: 'Uscita registrata in cassa.' };
}

/**
 * La merce entra in magazzino.
 *
 * Ogni riga diventa un carico, cioè un *+50* nel registro con dentro il suo
 * ordine: senza quel legame, fra un mese nessuno saprebbe più da dove sono
 * usciti quei cinquanta pezzi.
 */
export async function riceviRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'L’inventario lo tengono admin e segreteria.' };
  }

  const riordino = await prisma.riordino.findUnique({
    where: { id: str(fd, 'id') },
    include: { righe: { include: { carico: true } } },
  });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato === 'ANNULLATO') return { errore: 'Questo riordino è annullato.' };
  if (riordino.stato === 'RICEVUTO') return { errore: 'Già ricevuto.' };
  if (riordino.righe.length === 0) return { errore: 'Non c’è niente da ricevere.' };

  const quando = data(fd, 'data') ?? new Date();

  await prisma.$transaction(async (tx) => {
    for (const riga of riordino.righe) {
      // una riga già ricevuta non si carica due volte
      if (riga.carico) continue;
      await tx.caricoMagazzino.create({
        data: {
          voceId: riga.voceId,
          quantita: riga.quantita,
          costoUnitario: riga.costoUnitario,
          fornitore: riordino.fornitore,
          note: `Riordino ${riordino.numero}`,
          compratoIl: quando,
          rigaRiordinoId: riga.id,
          registratoDaId: me.id,
        },
      });
    }

    await tx.riordino.update({
      where: { id: riordino.id },
      data: { stato: 'RICEVUTO', ricevutoIl: quando },
    });
  });

  aggiorna();
  const pezzi = riordino.righe.reduce((s, r) => s + r.quantita, 0);
  return { ok: `In magazzino: +${pezzi} pezzi.` };
}

/**
 * Annulla un riordino.
 *
 * Si può finché la merce non è arrivata. Se era già stato pagato se ne va
 * anche l'uscita di cassa: quei soldi non sono usciti, e lasciarli lì
 * sporcherebbe il saldo con una spesa mai fatta.
 */
export async function annullaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) return { errore: 'Non è roba tua.' };

  const riordino = await prisma.riordino.findUnique({ where: { id: str(fd, 'id') } });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato === 'RICEVUTO') {
    return { errore: 'La merce è già arrivata: non si annulla più. Semmai si rettifica la giacenza.' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.riordino.update({
      where: { id: riordino.id },
      data: { stato: 'ANNULLATO', movimentoId: null, pagatoIl: null },
    });
    if (riordino.movimentoId) {
      await tx.movimentoCassa.delete({ where: { id: riordino.movimentoId } });
    }
  });

  aggiorna();
  return {
    ok: riordino.movimentoId
      ? 'Riordino annullato, e con lui l’uscita di cassa.'
      : 'Riordino annullato.',
  };
}

export async function eliminaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) return { errore: 'Non è roba tua.' };

  const riordino = await prisma.riordino.findUnique({ where: { id: str(fd, 'id') } });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato === 'RICEVUTO' || riordino.movimentoId) {
    return {
      errore: 'Ha già mosso soldi o merce: si annulla, non si cancella — la traccia resta.',
    };
  }

  await prisma.riordino.delete({ where: { id: riordino.id } });
  aggiorna();
  return { ok: 'Riordino eliminato.' };
}

// ------------------------------------------------------------------ la merce

/**
 * Aggiunge merce al magazzino, da qui.
 *
 * Prima si poteva solo dalla scheda dell'articolo, spuntando un interruttore
 * dentro il modulo di una voce: chi apriva l'inventario per metterci qualcosa
 * si trovava una pagina che gli spiegava dove andare, e non un posto dove
 * farlo. La merce resta quella del catalogo — una voce dentro un articolo del
 * team — perché è la stessa cosa vista da due parti: qui quante ce ne sono, lì
 * come si comprano.
 */
export async function aggiungiMerce(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'L’inventario lo tengono admin e segreteria.' };
  }

  const annuncio = await prisma.annuncio.findUnique({ where: { id: str(fd, 'annuncioId') } });
  if (!annuncio || !annuncio.ufficiale) {
    return { errore: 'Scegli un articolo del catalogo del team.' };
  }

  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Come si chiama la merce?' };

  const prezzo = num(fd, 'prezzo');
  if (prezzo === null || prezzo < 0) {
    return { errore: 'Scrivi a quanto la vendi: il prezzo è sempre obbligatorio.' };
  }

  const gia = await prisma.voceAnnuncio.findMany({
    where: { annuncioId: annuncio.id },
    select: { maniglia: true },
  });

  const voce = await prisma.voceAnnuncio.create({
    data: {
      annuncioId: annuncio.id,
      titolo,
      maniglia: manigliaUnica(gia.map((v) => v.maniglia), titolo),
      prezzo,
      descrizione: strOpt(fd, 'descrizione'),
      // roba comprata in blocco: si riordina, e la giacenza la tiene questa
      // pagina
      natura: 'RIORDINABILE',
      aMagazzino: true,
      ordine: gia.length,
    },
  });

  aggiorna(voce.id);
  return { ok: `${voce.titolo} è in magazzino, dentro «${annuncio.titolo}».` };
}

/**
 * Porta dentro o fuori dal magazzino una voce che nel catalogo c'è già.
 *
 * Fuori dal magazzino una voce si ordina al fornitore a ogni giro e non
 * finisce mai; dentro, ha una giacenza che scende. È la stessa distinzione che
 * sta nel modulo della voce, messa dove si guardano le scorte.
 */
export async function tieniAMagazzino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'L’inventario lo tengono admin e segreteria.' };
  }

  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id: str(fd, 'id') },
    include: { annuncio: { select: { ufficiale: true } }, _count: { select: { carichi: true } } },
  });
  if (!voce || !voce.annuncio.ufficiale) return { errore: 'Voce non trovata.' };

  const dentro = str(fd, 'verso') !== 'fuori';
  if (!dentro && voce._count.carichi > 0) {
    return {
      errore: 'Ha dei carichi alle spalle: toglierla dal magazzino cancellerebbe la sua storia.',
    };
  }

  await prisma.voceAnnuncio.update({ where: { id: voce.id }, data: { aMagazzino: dentro } });

  aggiorna(voce.id);
  return {
    ok: dentro
      ? `${voce.titolo} è passata a magazzino: adesso ha una giacenza.`
      : `${voce.titolo} torna a ordinarsi a ogni giro.`,
  };
}
