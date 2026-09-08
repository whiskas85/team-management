'use server';

import { revalidatePath } from 'next/cache';
import type { TipoDocumento } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoScrivere, slugDa } from '@/lib/documenti';
import { SLUG_REGOLAMENTO } from '@/lib/mercatino';
import { enumVal, intOpt, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Statuto e regolamenti li scrivono comando, amministrazione e segreteria.
 *
 * Non è una bacheca aperta: chi li legge deve poter dare per buono che quello
 * che c'è scritto sia quello deciso, non l'ultima modifica di chiunque passasse
 * di lì. Per questo ogni salvataggio lascia il nome di chi l'ha fatto.
 */

const TIPI = ['STATUTO', 'REGOLAMENTO'] as const;

function aggiorna(slug?: string) {
  revalidatePath('/statuto');
  revalidatePath('/regolamenti');
  if (slug) revalidatePath(`/regolamenti/${slug}`);
  // il regolamento del mercatino si legge anche da dentro il mercatino, ed è
  // lì che tiene la porta chiusa finché non lo si accetta
  if (slug === SLUG_REGOLAMENTO) apriMercatino();
}

/** Le pagine che cambiano quando qualcuno accetta il regolamento. */
function apriMercatino() {
  revalidatePath('/mercatino');
  revalidatePath('/mercatino/regolamento');
  revalidatePath('/mercatino/carrello');
  revalidatePath('/merchandising');
}

/**
 * «L'ho letto.»
 *
 * Si tiene la versione accettata, cioè la data dell'ultima modifica del testo:
 * se il regolamento cambia si torna a chiedere, perché aver accettato altro
 * non è aver accettato questo.
 */
export async function accettaRegolamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const documento = await prisma.documento.findUnique({ where: { id: str(fd, 'id') } });
  if (!documento) return { errore: 'Regolamento non trovato.' };

  await prisma.accettazioneDocumento.upsert({
    where: { userId_documentoId: { userId: me.id, documentoId: documento.id } },
    create: { userId: me.id, documentoId: documento.id, versione: documento.aggiornatoIl },
    update: { versione: documento.aggiornatoIl, accettatoIl: new Date() },
  });

  apriMercatino();
  return { ok: 'Regolamento accettato: il mercatino è aperto.' };
}

export async function salvaDocumento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoScrivere(me.roles)) {
    return { errore: 'Questi testi li aggiornano comando, amministrazione e segreteria.' };
  }

  const id = strOpt(fd, 'id');
  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Serve un titolo.' };

  // il testo si accetta anche vuoto: svuotare una pagina è una scelta legittima
  const dati = {
    titolo,
    sottotitolo: strOpt(fd, 'sottotitolo'),
    testo: fd.get('testo')?.toString() ?? '',
    ordine: intOpt(fd, 'ordine') ?? 0,
    aggiornatoDaId: me.id,
  };

  if (id) {
    const esistente = await prisma.documento.findUnique({ where: { id } });
    if (!esistente) return { errore: 'Documento non trovato.' };

    // lo slug non si tocca: è l'indirizzo che qualcuno può aver già mandato in
    // chat, e cambiarlo trasformerebbe quel link in una pagina che non c'è
    await prisma.documento.update({ where: { id }, data: dati });
    aggiorna(esistente.slug);
    return { ok: `${titolo} aggiornato.` };
  }

  const tipo = enumVal(fd, 'tipo', TIPI, 'REGOLAMENTO') as TipoDocumento;
  const slug = slugDa(titolo);
  if (!slug) return { errore: 'Dal titolo non viene fuori un indirizzo valido: scrivilo diverso.' };
  if (await prisma.documento.findUnique({ where: { slug } })) {
    return { errore: `C'è già un documento con l'indirizzo "${slug}": cambia il titolo.` };
  }

  await prisma.documento.create({ data: { ...dati, tipo, slug } });
  aggiorna(slug);
  return { ok: `${titolo} creato.` };
}

export async function eliminaDocumento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoScrivere(me.roles)) {
    return { errore: 'Questi testi li gestiscono comando, amministrazione e segreteria.' };
  }

  const documento = await prisma.documento.findUnique({ where: { id: str(fd, 'id') } });
  if (!documento) return { errore: 'Documento non trovato.' };

  // lo statuto non si cancella: è il testo che dice come esiste il team, e una
  // pagina vuota è comunque meglio del non averla più
  if (documento.tipo === 'STATUTO') {
    return { errore: 'Lo statuto non si elimina: semmai si svuota il testo.' };
  }

  await prisma.documento.delete({ where: { id: documento.id } });
  aggiorna(documento.slug);
  return { ok: `${documento.titolo} eliminato.` };
}
