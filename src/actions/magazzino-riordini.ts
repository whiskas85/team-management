'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestirePagamenti } from '@/lib/domain';
import { totaleRiordino } from '@/lib/mercatino';
import { data, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il magazzino: quello che il team ha in casa, e i riordini al fornitore.
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

function aggiorna() {
  revalidatePath('/admin/magazzino');
  revalidatePath('/admin/ordini');
  revalidatePath('/admin/cassa');
  revalidatePath('/merchandising');
}

// ------------------------------------------------------------------ riordini

export async function creaRiordino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const art = await prisma.articoloMagazzino.findUnique({ where: { id: str(fd, 'articoloId') } });
  if (!art) return { errore: 'Scegli un articolo di magazzino.' };

  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita <= 0) return { errore: 'Quanti pezzi si ordinano?' };

  const costo = num(fd, 'costoUnitario');
  if (costo === null || costo < 0) return { errore: 'Scrivi quanto costa un pezzo.' };

  const riordino = await prisma.riordino.create({
    data: {
      fornitore: strOpt(fd, 'fornitore'),
      note: strOpt(fd, 'note'),
      creatoDaId: me.id,
      righe: { create: { articoloId: art.id, quantita, costoUnitario: costo } },
    },
  });

  aggiorna();
  return { ok: `Riordino ${riordino.numero} aperto: ${quantita} × ${art.nome}.` };
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

  const art = await prisma.articoloMagazzino.findUnique({ where: { id: str(fd, 'articoloId') } });
  if (!art) return { errore: 'Scegli un articolo di magazzino.' };

  const quantita = intOpt(fd, 'quantita');
  if (quantita === null || quantita <= 0) return { errore: 'Quanti pezzi?' };

  const costo = num(fd, 'costoUnitario');
  if (costo === null || costo < 0) return { errore: 'Scrivi quanto costa un pezzo.' };

  await prisma.rigaRiordino.create({
    data: { riordinoId: riordino.id, articoloId: art.id, quantita, costoUnitario: costo },
  });

  aggiorna();
  return { ok: `Aggiunti ${quantita} × ${art.nome}.` };
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
    include: { righe: { include: { articolo: { select: { nome: true } } } } },
  });
  if (!riordino) return { errore: 'Riordino non trovato.' };
  if (riordino.stato === 'ANNULLATO') return { errore: 'Questo riordino è annullato.' };
  if (riordino.movimentoId) return { errore: 'Già pagato: l’uscita di cassa c’è.' };
  if (riordino.righe.length === 0) return { errore: 'Non c’è niente da pagare: aggiungi una riga.' };

  const totale = totaleRiordino(riordino.righe);
  const cosa = riordino.righe.map((r) => `${r.quantita} × ${r.articolo.nome}`).join(', ');

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
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
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
          articoloId: riga.articoloId,
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


// --------------------------------------------------------- gli articoli in casa

/**
 * Un articolo nuovo in magazzino.
 *
 * **Nasce e basta**: non finisce in vetrina, non ha un prezzo, non diventa una
 * riga del merchandising. Prima ci finiva da solo — si aggiungeva un
 * generatore alle scorte e ci si ritrovava un annuncio in bozza col generatore
 * dentro — perché magazzino e catalogo erano la stessa tabella.
 *
 * Il magazzino risponde a *cosa ho in casa*. Se poi quella cosa si venda è
 * un'altra domanda, e la si fa dal merchandising collegandoci una voce.
 */
export async function aggiungiArticolo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Come si chiama? "Patch PVC", "Generatore", "Bandiera".' };

  const art = await prisma.articoloMagazzino.create({
    data: {
      nome,
      categoria: strOpt(fd, 'categoria'),
      note: strOpt(fd, 'note'),
    },
  });

  aggiorna();
  return {
    ok: `${art.nome} è in magazzino. Quanti ce ne sono lo dirà il primo riordino ricevuto, o una rettifica.`,
  };
}

export async function salvaArticolo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome non può restare vuoto.' };

  await prisma.articoloMagazzino.update({
    where: { id: str(fd, 'id') },
    data: { nome, categoria: strOpt(fd, 'categoria'), note: strOpt(fd, 'note') },
  });

  aggiorna();
  return { ok: 'Articolo aggiornato.' };
}

/**
 * Toglie un articolo dal magazzino.
 *
 * Con dei riordini alle spalle non si cancella: sarebbero righe che parlano di
 * una cosa che non esiste più, e il registro non tornerebbe. I carichi invece
 * se ne vanno con lui — sono la sua storia, non quella di qualcun altro.
 *
 * Se è collegato a una voce in vetrina il collegamento si stacca da solo, e
 * quella voce torna a essere merce che si ordina al fornitore a ogni giro:
 * cancellare quello che si tiene in casa non deve far sparire quello che si
 * vende, sono due decisioni diverse.
 */
export async function eliminaArticolo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const art = await prisma.articoloMagazzino.findUnique({
    where: { id: str(fd, 'id') },
    include: { _count: { select: { riordini: true, voci: true } } },
  });
  if (!art) return { errore: 'Articolo non trovato.' };

  if (art._count.riordini > 0) {
    return { errore: 'C’è un riordino che lo nomina: cancella prima quello.' };
  }

  await prisma.articoloMagazzino.delete({ where: { id: art.id } });

  aggiorna();
  return {
    ok:
      art._count.voci > 0
        ? `${art.nome} eliminato dal magazzino. Resta in vetrina, ma senza giacenza: da ora si ordina al fornitore a ogni giro.`
        : `${art.nome} eliminato: se ne vanno anche i suoi carichi.`,
  };
}

/**
 * Stacca una riga di vetrina dal suo scaffale.
 *
 * Non cancella niente: l'articolo resta in magazzino con la sua giacenza, la
 * voce resta in vendita. Cambia solo da dove esce la merce — non più dallo
 * scaffale, ma da un ordine al fornitore a ogni giro. Serve quando si smette
 * di tenere in casa una cosa che si continua a vendere.
 */
export async function scollegaDaMagazzino(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoGestirePagamenti(me.roles)) {
    return { errore: 'Il magazzino lo tengono admin e segreteria.' };
  }

  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id: str(fd, 'voceId') },
    include: { articolo: { select: { nome: true } } },
  });
  if (!voce || !voce.articoloId) return { errore: 'Questa voce non pesca dal magazzino.' };

  await prisma.voceAnnuncio.update({ where: { id: voce.id }, data: { articoloId: null } });

  aggiorna();
  revalidatePath(`/merchandising/${voce.annuncioId}`);
  return {
    ok: `${voce.titolo} non pesca più da ${voce.articolo?.nome}: resta in vendita, si ordina al fornitore.`,
  };
}
