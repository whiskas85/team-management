'use server';

import { revalidatePath } from 'next/cache';
import type { StatoOrdine } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  dettaglioRighe,
  ordinabile,
  puoVedereMerchandising,
  puoVedereOrdini,
  totaleRighe,
} from '@/lib/mercatino';
import { enumVal, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Gli ordini del merchandising.
 *
 * Ordinare dal catalogo del team **genera una quota**, che compare fra i
 * pagamenti di chi ordina e in cassa insieme a iscrizioni e quote delle
 * attività: da lì in poi non c'è niente di nuovo da imparare, la segreteria
 * incassa con il pulsante di sempre. Una vendita privata fra due soci invece
 * non passa di qui — il gestionale non tocca quei soldi.
 */

/** Quanti pezzi della stessa voce ha senso ordinare in un colpo solo. */
const MAX_PEZZI = 50;

function aggiorna(annuncioId?: string) {
  revalidatePath('/admin/ordini');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/admin/cassa');
  revalidatePath('/pagamenti');
  revalidatePath('/dashboard');
  revalidatePath('/merchandising');
  if (annuncioId) revalidatePath(`/mercatino/${annuncioId}`);
}

/** Un ordine si tocca finché non ci sono soldi sopra. Dopo no. */
const incassato = (o: { payment: { pagato: unknown; status: string } | null }) =>
  o.payment != null && (Number(o.payment.pagato) > 0 || o.payment.status === 'PAGATO');

// ------------------------------------------------------------------ ordinare

export async function inviaOrdine(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const annuncio = await prisma.annuncio.findUnique({
    where: { id: str(fd, 'annuncioId') },
    include: { voci: true },
  });
  if (!annuncio) return { errore: 'Articolo non trovato.' };

  // il catalogo del club lo ordina chi è nel club: è la stessa regola con cui
  // la pagina si apre, ripetuta qui perché un modulo si può anche costruire a
  // mano e mandare da fuori
  if (!annuncio.ufficiale) {
    return {
      errore: 'Questa è una vendita privata: ci si accorda con chi vende, senza passare di qui.',
    };
  }
  if (!puoVedereMerchandising(me.stato)) {
    return { errore: 'Il catalogo del team è riservato alla squadra.' };
  }
  if (annuncio.stato !== 'PUBBLICATO') return { errore: 'L’articolo non è in vendita.' };

  let carrello: { voceId?: unknown; quantita?: unknown }[] = [];
  try {
    const letto = JSON.parse(str(fd, 'carrello') || '[]');
    if (Array.isArray(letto)) carrello = letto;
  } catch {
    return { errore: 'Carrello illeggibile: ricarica la pagina e riprova.' };
  }

  const righe = carrello
    .map((r) => {
      const voce = annuncio.voci.find((v) => v.id === String(r.voceId));
      const quantita = Math.trunc(Number(r.quantita));
      if (!voce || !ordinabile(voce) || !Number.isFinite(quantita) || quantita < 1) return null;
      return {
        voceId: voce.id,
        titolo: voce.titolo,
        // il prezzo si congela adesso: se la maglietta domani passa da 25 a 28,
        // questa quota è già stata emessa a 25 e deve restare quella
        prezzo: Number(voce.prezzo),
        quantita: Math.min(quantita, MAX_PEZZI),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (righe.length === 0) return { errore: 'Il carrello è vuoto: scegli almeno un pezzo.' };

  const totale = totaleRighe(righe);
  const dettaglio = dettaglioRighe(righe);

  await prisma.$transaction(async (tx) => {
    const quota = await tx.payment.create({
      data: {
        userId: me.id,
        tipo: 'MERCHANDISING',
        descrizione: `${annuncio.titolo}: ${dettaglio}`.slice(0, 250),
        importo: totale,
        status: 'DA_PAGARE',
      },
    });

    await tx.ordine.create({
      data: {
        annuncioId: annuncio.id,
        userId: me.id,
        note: strOpt(fd, 'note'),
        paymentId: quota.id,
        righe: { create: righe },
      },
    });
  });

  aggiorna(annuncio.id);
  return {
    ok: `Ordine inviato: ${dettaglio}. La quota è fra i tuoi pagamenti, la incassa la segreteria.`,
  };
}

/**
 * Ritira un ordine.
 *
 * Si può finché non è stato incassato, e dopo no: è la stessa regola che vale
 * già per gli altri pagamenti. Chi ha ordinato può tornare indietro solo
 * mentre la raccolta è aperta — a fornitore avvisato i pezzi sono comprati, e
 * a quel punto la cosa si sistema parlandosi, non cliccando.
 */
export async function annullaOrdine(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const ordine = await prisma.ordine.findUnique({
    where: { id: str(fd, 'id') },
    include: { payment: true },
  });
  if (!ordine) return { errore: 'Ordine non trovato.' };

  const dellaSegreteria = puoVedereOrdini(me.roles);
  if (ordine.userId !== me.id && !dellaSegreteria) return { errore: 'Non è un tuo ordine.' };
  if (ordine.stato === 'ANNULLATO') return { errore: 'Già annullato.' };

  if (incassato(ordine)) {
    return {
      errore: 'La quota è già stata incassata: l’ordine non si annulla più, serve un rimborso.',
    };
  }
  if (!dellaSegreteria && ordine.stato !== 'RACCOLTA') {
    return {
      errore: 'La raccolta è chiusa e i pezzi sono già stati ordinati: parlane con la segreteria.',
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ordine.update({ where: { id: ordine.id }, data: { stato: 'ANNULLATO' } });
    // la quota si annulla, non si cancella: in cassa deve restare traccia che
    // quel movimento c'è stato e com'è finito
    if (ordine.paymentId) {
      await tx.payment.update({ where: { id: ordine.paymentId }, data: { status: 'ANNULLATO' } });
    }
  });

  aggiorna(ordine.annuncioId);
  return { ok: 'Ordine annullato, e con lui la quota.' };
}

// ------------------------------------------------------------------ segreteria

const STATI = ['RACCOLTA', 'ORDINATO', 'ARRIVATO', 'CONSEGNATO'] as const;

/** Dove si trova la merce. I soldi stanno sul pagamento, e sono un'altra cosa. */
export async function statoOrdine(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoVedereOrdini(me.roles)) {
    return { errore: 'Solo admin e segreteria gestiscono gli ordini.' };
  }

  const ordine = await prisma.ordine.findUnique({ where: { id: str(fd, 'id') } });
  if (!ordine) return { errore: 'Ordine non trovato.' };

  const stato = enumVal(fd, 'stato', STATI, 'RACCOLTA') as StatoOrdine;
  await prisma.ordine.update({
    where: { id: ordine.id },
    data: {
      stato,
      // le date si scrivono la prima volta che si passa di lì: tornare
      // indietro per correggere un clic non deve riscrivere la storia
      ordinatoIl: stato === 'ORDINATO' ? (ordine.ordinatoIl ?? new Date()) : ordine.ordinatoIl,
      arrivatoIl: stato === 'ARRIVATO' ? (ordine.arrivatoIl ?? new Date()) : ordine.arrivatoIl,
      consegnatoIl:
        stato === 'CONSEGNATO' ? (ordine.consegnatoIl ?? new Date()) : ordine.consegnatoIl,
    },
  });

  aggiorna(ordine.annuncioId);
  return {
    ok:
      stato === 'RACCOLTA'
        ? `Ordine ${ordine.numero} rimesso in raccolta.`
        : `Ordine ${ordine.numero}: ${stato.toLowerCase()}.`,
  };
}

/**
 * Chiude il giro di raccolta di un articolo.
 *
 * È il gesto che fa quadrare il riepilogo: *magliette M da ordinare: 7* vale
 * finché il giro è aperto, poi quei sette si comprano e chi ordina dopo entra
 * nel giro successivo senza che nessuno debba ricordarsi niente.
 */
export async function chiudiRaccolta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoVedereOrdini(me.roles)) {
    return { errore: 'Solo admin e segreteria chiudono la raccolta.' };
  }

  const annuncioId = str(fd, 'annuncioId');
  const quanti = await prisma.ordine.updateMany({
    where: { annuncioId, stato: 'RACCOLTA' },
    data: { stato: 'ORDINATO', ordinatoIl: new Date() },
  });

  if (quanti.count === 0) return { errore: 'Non c’è nessun ordine in raccolta da chiudere.' };

  aggiorna(annuncioId);
  return {
    ok:
      quanti.count === 1
        ? 'Giro chiuso: 1 ordine passato al fornitore.'
        : `Giro chiuso: ${quanti.count} ordini passati al fornitore.`,
  };
}
