'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoGestireCassa } from '@/lib/casse';
import { data, num, str, strOpt, type StatoForm } from '@/lib/form';
import { saldoCredito } from '@/lib/credito';
import { fmtEuro } from '@/lib/format';
import { eliminaAllegato, salvaAllegato } from '@/lib/storage';
import { avvisaPersona } from '@/lib/avvisi';

/**
 * Il versamento a credito fatto da chi paga.
 *
 * Funziona come una quota segnalata: la persona sceglie la cassa, vede i suoi
 * metodi (il link, l'IBAN), paga, e lo segnala con la ricevuta se il metodo la
 * chiede. Credito non ne nasce finché chi tiene la cassa non conferma che i
 * soldi sono arrivati: solo allora diventa un movimento di credito, da
 * spendere sulle prossime quote di quella cassa.
 */

function aggiorna() {
  revalidatePath('/pagamenti');
  revalidatePath('/profilo');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/cassa');
  revalidatePath('/admin/cassa');
  revalidatePath('/dashboard');
}

/** La persona segnala di aver versato a credito in una cassa. */
export async function segnalaVersamentoCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const cassaId = strOpt(fd, 'cassaId');
  const importo = num(fd, 'importo');
  if (importo === null || importo <= 0) return { errore: 'Indica quanto hai versato.' };
  if (importo > 5000)
    return {
      errore: 'Un versamento a credito così grande va concordato con chi tiene la cassa.',
    };

  const metodoId = str(fd, 'metodoId');
  const metodo = metodoId ? await prisma.metodoPagamento.findUnique({ where: { id: metodoId } }) : null;
  // un metodo di questa cassa, acceso e usabile da soli: il bonifico al club
  // non è un versamento nella cassa del corso
  if (!metodo || !metodo.attivo || !metodo.selfService || metodo.cassaId !== cassaId) {
    return { errore: 'Scegli con quale metodo hai pagato.' };
  }

  const quando = data(fd, 'quando') ?? new Date();
  if (quando > new Date()) return { errore: 'La data del pagamento non può essere nel futuro.' };

  const file = fd.get('allegato');
  const conFile = file instanceof File && file.size > 0;
  const titolo = metodo.titoloAllegato ?? 'Ricevuta';
  if (metodo.allegatoObbligatorio && !conFile) {
    return {
      errore: `Con ${metodo.nome} va allegata la ${titolo.toLowerCase()}.`,
    };
  }
  let allegato = {};
  if (conFile) {
    try {
      const salvato = await salvaAllegato(file, 'pagamenti');
      allegato = {
        allegatoPath: salvato.filePath,
        allegatoNome: salvato.fileName,
        allegatoTipo: salvato.mimeType,
        allegatoTitolo: titolo,
      };
    } catch (e) {
      return { errore: (e as Error).message };
    }
  }

  await prisma.versamentoCredito.create({
    data: {
      userId: me.id,
      cassaId,
      importo,
      metodoId: metodo.id,
      quando,
      note: strOpt(fd, 'note'),
      ...allegato,
    },
  });

  aggiorna();
  return {
    ok: `Versamento di ${fmtEuro(importo)} segnalato con ${metodo.nome}. Diventa credito quando ${
      cassaId ? 'chi tiene la cassa' : 'la segreteria'
    } avrà verificato l’incasso.`,
  };
}

/** Chi tiene la cassa conferma: i soldi sono arrivati e diventano credito. */
export async function confermaVersamentoCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const v = await prisma.versamentoCredito.findUnique({
    where: { id: str(fd, 'id') },
    include: { cassa: { select: { nome: true } } },
  });
  if (!v) return { errore: 'Versamento non trovato.' };
  if (!(await puoGestireCassa(me, v.cassaId))) {
    return { errore: 'Questo versamento lo conferma chi tiene la cassa.' };
  }
  if (v.confermatoIl) return { errore: 'Questo versamento è già stato confermato.' };

  const fatto = await prisma.$transaction(async (tx) => {
    // ricontrollato dentro: due conferme insieme non fanno il credito doppio
    const ancora = await tx.versamentoCredito.updateMany({
      where: { id: v.id, confermatoIl: null },
      data: { confermatoIl: new Date(), confermatoDaId: me.id },
    });
    if (ancora.count === 0) return false;
    const mov = await tx.movimentoCredito.create({
      data: {
        userId: v.userId,
        cassaId: v.cassaId,
        tipo: 'VERSAMENTO',
        importo: v.importo,
        metodoId: v.metodoId,
        descrizione: 'Versamento a credito',
        note: v.note,
        data: v.quando,
        registratoDaId: me.id,
      },
    });
    await tx.versamentoCredito.update({
      where: { id: v.id },
      data: { movimentoId: mov.id },
    });
    return true;
  });
  if (!fatto) return { errore: 'Questo versamento è già stato confermato.' };

  const credito = await saldoCredito(v.userId, v.cassaId);
  await avvisaPersona(v.userId, {
    titolo: 'Credito confermato',
    testo: `Il tuo versamento di ${fmtEuro(Number(v.importo))} è arrivato: ora hai ${fmtEuro(credito)} di credito presso ${v.cassa?.nome ?? 'il club'}.`,
    url: '/pagamenti#credito',
    tag: `versamento-credito-${v.id}`,
  }).catch(() => null);

  aggiorna();
  return {
    ok: `Confermato: ${fmtEuro(Number(v.importo))} diventano credito. Ora ne ha ${fmtEuro(credito)}.`,
  };
}

/**
 * Il versamento si toglie. Chi tiene la cassa lo annulla con un motivo — i
 * soldi non sono arrivati — e la persona riceve un avviso; chi l'ha segnalato
 * lo può ritirare da sé finché non è confermato.
 */
export async function annullaVersamentoCredito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const v = await prisma.versamentoCredito.findUnique({
    where: { id: str(fd, 'id') },
  });
  if (!v) return { errore: 'Versamento non trovato.' };
  if (v.confermatoIl)
    return {
      errore: 'Questo versamento è già confermato: è diventato credito.',
    };

  const suo = v.userId === me.id;
  const gestore = await puoGestireCassa(me, v.cassaId);
  if (!suo && !gestore) return { errore: 'Questo versamento lo gestisce chi tiene la cassa.' };

  const motivo = strOpt(fd, 'motivo');
  if (!suo && !motivo) {
    return {
      errore: 'Scrivi perché annulli il versamento: lo legge anche chi l’aveva segnalato.',
    };
  }

  await prisma.versamentoCredito.delete({ where: { id: v.id } });
  if (v.allegatoPath) await eliminaAllegato(v.allegatoPath).catch(() => null);

  if (!suo) {
    const segnalato = v.quando.toLocaleDateString('it-IT');
    await avvisaPersona(v.userId, {
      titolo: 'Versamento annullato',
      testo: `Il versamento a credito di ${fmtEuro(Number(v.importo))} che avevi segnalato è stato annullato: ${motivo}.`,
      url: '/pagamenti#credito',
      tag: `versamento-credito-${v.id}`,
      whatsapp: `Versamento a credito annullato

Il versamento di ${fmtEuro(Number(v.importo))} che avevi segnalato il ${segnalato} è stato annullato.
Motivo: ${motivo}

Non è diventato credito. Se hai pagato davvero, scrivi a chi tiene la cassa.`,
    }).catch(() => null);
  }

  aggiorna();
  return {
    ok: suo ? 'Versamento ritirato.' : 'Versamento annullato: la persona è stata avvisata con il motivo.',
  };
}
