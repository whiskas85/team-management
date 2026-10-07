'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin, vedeAttivitaSquadra } from '@/lib/domain';
import { puoGestireCassa } from '@/lib/casse';
import { bool, data, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';
import { eliminaAllegato, salvaAllegato } from '@/lib/storage';

const TIPI = ['ENTRATA', 'USCITA'] as const;

function aggiorna() {
  revalidatePath('/admin/cassa');
  revalidatePath('/cassa');
  revalidatePath('/admin/statistiche');
  revalidatePath('/admin/magazzino');
}

/**
 * Una spesa può essere un acquisto: si dice quale merce e quanti pezzi, e la
 * giacenza sale da sola.
 *
 * Il costo del pezzo si ricava dividendo l'importo per i pezzi, invece di
 * chiederlo di nuovo: sono gli stessi soldi, e farli scrivere due volte è il
 * modo più sicuro perché un giorno non tornino.
 */
async function allineaMagazzino(
  movimentoId: string,
  tipo: string,
  importo: number,
  fd: FormData,
) {
  const gia = await prisma.caricoMagazzino.findUnique({ where: { movimentoId } });

  const articoloId = strOpt(fd, 'articoloId');
  const pezzi = intOpt(fd, 'quantita');
  const art = articoloId
    ? await prisma.articoloMagazzino.findUnique({ where: { id: articoloId }, select: { id: true } })
    : null;

  const buona = tipo === 'USCITA' && art !== null && pezzi !== null && pezzi > 0;

  // tolta la merce dal movimento, se ne va anche il carico: la spesa resta,
  // ma non dice più che è entrato qualcosa
  if (!buona) {
    if (gia) await prisma.caricoMagazzino.delete({ where: { id: gia.id } });
    return;
  }

  const dati = {
    articoloId: art!.id,
    quantita: pezzi!,
    costoUnitario: importo / pezzi!,
    note: 'Comprata con un’uscita di cassa',
  };

  if (gia) await prisma.caricoMagazzino.update({ where: { id: gia.id }, data: dati });
  else await prisma.caricoMagazzino.create({ data: { ...dati, movimentoId } });
}

/**
 * Movimento di cassa inserito a mano: tutto ciò che non nasce dalle quote
 * delle attività (contributi, acquisti di materiale, affitto campo, il fondo
 * con cui una cassa parte…). Vale per ogni cassa: quella del club la muovono
 * admin e segreteria, le altre chi le gestisce.
 */
export async function salvaMovimento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const id = str(fd, 'id');
  // un movimento non cambia cassa: modificandolo resta dov'è
  const prima = id
    ? await prisma.movimentoCassa.findUnique({
        where: { id },
        select: { cassaId: true, allegatoPath: true },
      })
    : null;
  if (id && !prima) return { errore: 'Movimento non trovato.' };
  const cassaId = prima ? prima.cassaId : strOpt(fd, 'cassaId');
  if (!(await puoGestireCassa(me, cassaId))) {
    return { errore: 'Muove questa cassa solo chi la gestisce.' };
  }
  // la cassa del club: modificare lo fa l'admin, come eliminare
  if (id && !cassaId && !isAdmin(me.roles)) {
    return { errore: 'Solo l’admin corregge un movimento della cassa del club.' };
  }

  const descrizione = str(fd, 'descrizione');
  const importo = num(fd, 'importo');

  if (!descrizione) return { errore: 'La descrizione è obbligatoria.' };
  if (importo === null || importo <= 0) return { errore: 'Indica un importo maggiore di zero.' };

  // il metodo deve essere di questa cassa: quelli del club non valgono altrove
  const metodoScelto = strOpt(fd, 'metodoId');
  const metodo = metodoScelto
    ? await prisma.metodoPagamento.findFirst({
        where: { id: metodoScelto, cassaId },
        select: { id: true },
      })
    : null;

  const valori = {
    tipo: enumVal(fd, 'tipo', TIPI, 'USCITA'),
    descrizione,
    importo,
    data: data(fd, 'data') ?? new Date(),
    categoria: strOpt(fd, 'categoria'),
    metodoId: metodo?.id ?? null,
    note: strOpt(fd, 'note'),
    // a quale operatore vanno i soldi di un'uscita: solo chi è in squadra
    beneficiarioId: null as string | null,
  };
  const beneficiarioId = strOpt(fd, 'beneficiarioId');
  if (valori.tipo === 'USCITA' && beneficiarioId) {
    const chi = await prisma.user.findUnique({
      where: { id: beneficiarioId },
      select: { id: true, stato: true },
    });
    if (!chi || !vedeAttivitaSquadra(chi.stato)) {
      return { errore: 'Un’uscita può andare a un operatore della squadra, non a un nuovo.' };
    }
    valori.beneficiarioId = chi.id;
  }

  // Lo scontrino o la fattura: foto o PDF. Uno nuovo sostituisce il vecchio;
  // «togli» lo leva senza metterne un altro.
  const file = fd.get('allegato');
  let allegato: { allegatoPath: string | null; allegatoNome: string | null; allegatoTipo: string | null } | null =
    null;
  if (file instanceof File && file.size > 0) {
    try {
      const salvato = await salvaAllegato(file, 'cassa');
      allegato = {
        allegatoPath: salvato.filePath,
        allegatoNome: salvato.fileName,
        allegatoTipo: salvato.mimeType,
      };
    } catch (e) {
      return { errore: (e as Error).message };
    }
  } else if (id && bool(fd, 'togliAllegato')) {
    allegato = { allegatoPath: null, allegatoNome: null, allegatoTipo: null };
  }
  if (allegato && prima?.allegatoPath) await eliminaAllegato(prima.allegatoPath).catch(() => null);

  if (id) {
    await prisma.movimentoCassa.update({ where: { id }, data: { ...valori, ...(allegato ?? {}) } });
    // il magazzino è del club: le spese delle altre casse non ci entrano
    if (!cassaId) await allineaMagazzino(id, valori.tipo, importo, fd);
    aggiorna();
    return { ok: 'Movimento aggiornato.' };
  }

  const movimento = await prisma.movimentoCassa.create({
    data: { ...valori, ...(allegato ?? {}), cassaId, registratoById: me.id },
  });
  if (!cassaId) await allineaMagazzino(movimento.id, valori.tipo, importo, fd);

  const pezzi = intOpt(fd, 'quantita');
  const inMagazzino =
    !cassaId && valori.tipo === 'USCITA' && strOpt(fd, 'articoloId') && pezzi && pezzi > 0;

  aggiorna();
  return {
    ok: inMagazzino
      ? `Uscita registrata, e ${pezzi} pezzi sono entrati in magazzino.`
      : valori.tipo === 'ENTRATA'
        ? 'Entrata registrata.'
        : 'Uscita registrata.',
  };
}

export async function eliminaMovimento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const quale = await prisma.movimentoCassa.findUnique({ where: { id }, select: { cassaId: true } });
  if (!quale) return { errore: 'Movimento non trovato.' };
  // del club: solo l'admin; di un'altra cassa: chi la gestisce
  const puo = quale.cassaId ? await puoGestireCassa(me, quale.cassaId) : isAdmin(me.roles);
  if (!puo) return { errore: 'Non puoi eliminare un movimento di questa cassa.' };

  const movimento = await prisma.movimentoCassa.delete({ where: { id } });
  if (movimento.allegatoPath) await eliminaAllegato(movimento.allegatoPath).catch(() => null);
  aggiorna();
  return { ok: 'Movimento eliminato.' };
}
