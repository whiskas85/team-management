'use server';

import { revalidatePath } from 'next/cache';
import type { StatoOrdine } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  descriviRiga,
  dettaglioRighe,
  giacenzaDi,
  ordinabile,
  puoVedereMerchandising,
  puoVedereOrdini,
  totaleRighe,
} from '@/lib/mercatino';
import { enumVal, intOpt, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Il carrello e gli ordini del merchandising.
 *
 * Il carrello sta nel database e non nella pagina: è **uno per persona e
 * attraversa il catalogo**, così si gira il merchandising, si aggiunge quello
 * che serve e si ordina alla fine. Un carrello che vive dentro una pagina si
 * svuota ogni volta che si cambia articolo.
 *
 * Ordinare **genera una quota**, che compare fra i pagamenti di chi ordina e in
 * cassa insieme a iscrizioni e quote delle attività: da lì in poi non c'è
 * niente di nuovo da imparare, la segreteria incassa con il pulsante di
 * sempre. Una vendita privata fra due soci invece non passa di qui — il
 * gestionale non tocca quei soldi.
 */

/** Quanti pezzi della stessa voce ha senso ordinare in un colpo solo. */
const MAX_PEZZI = 50;

function aggiorna(annuncioId?: string) {
  revalidatePath('/mercatino/carrello');
  revalidatePath('/admin/ordini');
  revalidatePath('/admin/pagamenti');
  revalidatePath('/admin/cassa');
  revalidatePath('/pagamenti');
  revalidatePath('/dashboard');
  revalidatePath('/merchandising');
  if (annuncioId) {
    revalidatePath(`/mercatino/${annuncioId}`);
    revalidatePath(`/merchandising/${annuncioId}`);
  }
}

/** Un ordine si tocca finché non ci sono soldi sopra. Dopo no. */
const incassato = (o: { payment: { pagato: unknown; status: string } | null }) =>
  o.payment != null && (Number(o.payment.pagato) > 0 || o.payment.status === 'PAGATO');

/**
 * La voce, ma solo se è una cosa che questa persona può davvero ordinare.
 *
 * Le stesse condizioni con cui il pulsante compare, ricontrollate qui: un
 * modulo si può anche costruire a mano e mandare da fuori.
 */
async function voceOrdinabile(voceId: string, stato: string) {
  const voce = await prisma.voceAnnuncio.findUnique({
    where: { id: voceId },
    include: { annuncio: { select: { id: true, titolo: true, stato: true, ufficiale: true } } },
  });
  if (!voce) return null;
  if (!voce.annuncio.ufficiale || voce.annuncio.stato !== 'PUBBLICATO') return null;
  if (!puoVedereMerchandising(stato as never)) return null;
  if (!ordinabile(voce)) return null;
  return voce;
}

/**
 * Quanti pezzi restano di una voce tenuta a magazzino.
 *
 * `null` vuol dire che la voce non sta in magazzino: si ordina al fornitore a
 * ogni giro, e quindi non finisce mai.
 */
async function disponibiliDi(voce: { id: string; aMagazzino: boolean }) {
  if (!voce.aMagazzino) return null;

  const [carichi, righe] = await Promise.all([
    prisma.caricoMagazzino.findMany({
      where: { voceId: voce.id },
      select: { quantita: true, costoUnitario: true },
    }),
    prisma.rigaOrdine.findMany({
      where: { voceId: voce.id, ordine: { stato: { not: 'ANNULLATO' } } },
      select: { quantita: true, ordine: { select: { stato: true } } },
    }),
  ]);

  return giacenzaDi(
    carichi,
    righe.map((r) => ({ quantita: r.quantita, stato: r.ordine.stato })),
  ).disponibili;
}

// ------------------------------------------------------------------ carrello

export async function aggiungiAlCarrello(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const voce = await voceOrdinabile(str(fd, 'voceId'), me.stato);
  if (!voce) return { errore: 'Questo articolo non si può ordinare.' };

  const quanti = Math.max(1, Math.min(MAX_PEZZI, intOpt(fd, 'quantita') ?? 1));

  // aggiungerla di nuovo alza il numero invece di raddoppiare la riga: è
  // quello che si aspetta chi torna sull'articolo e ne mette un'altra
  const gia = await prisma.rigaCarrello.findUnique({
    where: { userId_voceId: { userId: me.id, voceId: voce.id } },
    select: { quantita: true },
  });
  const totale = Math.min(MAX_PEZZI, (gia?.quantita ?? 0) + quanti);

  // di quello che sta in magazzino non si mette nel carrello più di quello che
  // c'è: prometterlo e poi non averlo è peggio che dirlo subito
  const restano = await disponibiliDi(voce);
  if (restano !== null && totale > restano) {
    return {
      errore:
        restano <= 0
          ? `${voce.titolo}: finita. Il team ne riordina un blocco appena può.`
          : `Di ${voce.titolo} ne restano ${restano}.`,
    };
  }

  await prisma.rigaCarrello.upsert({
    where: { userId_voceId: { userId: me.id, voceId: voce.id } },
    create: { userId: me.id, voceId: voce.id, quantita: totale },
    update: { quantita: totale },
  });

  aggiorna(voce.annuncio.id);
  return { ok: `Nel carrello: ${voce.titolo} × ${totale}.` };
}

/** Cambia la quantità di una riga. A zero la riga se ne va. */
export async function cambiaRigaCarrello(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const riga = await prisma.rigaCarrello.findUnique({
    where: { id: str(fd, 'id') },
    include: { voce: { select: { titolo: true, annuncioId: true } } },
  });
  if (!riga || riga.userId !== me.id) return { errore: 'Riga non trovata.' };

  const quanti = Math.min(MAX_PEZZI, intOpt(fd, 'quantita') ?? 0);
  if (quanti <= 0) {
    await prisma.rigaCarrello.delete({ where: { id: riga.id } });
    aggiorna(riga.voce.annuncioId);
    return { ok: `${riga.voce.titolo} tolta dal carrello.` };
  }

  await prisma.rigaCarrello.update({ where: { id: riga.id }, data: { quantita: quanti } });
  aggiorna(riga.voce.annuncioId);
  return {};
}

export async function svuotaCarrello(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  await prisma.rigaCarrello.deleteMany({ where: { userId: me.id } });
  aggiorna();
  return { ok: 'Carrello svuotato.' };
}

// ------------------------------------------------------------------ ordinare

/**
 * Il checkout: quello che c'è nel carrello diventa un ordine e una quota.
 *
 * Le righe si rileggono dal database e non dal modulo — prezzi compresi — così
 * nessuno può farsi lo sconto ritoccando la pagina.
 */
export async function inviaOrdine(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const carrello = await prisma.rigaCarrello.findMany({
    where: { userId: me.id },
    include: {
      voce: {
        include: { annuncio: { select: { id: true, titolo: true, stato: true, ufficiale: true } } },
      },
    },
    orderBy: { aggiuntaIl: 'asc' },
  });
  if (carrello.length === 0) return { errore: 'Il carrello è vuoto.' };

  // quello che nel frattempo è stato ritirato o spento non si ordina: sono
  // passati giorni fra il primo pezzo messo dentro e questo momento
  const buone = carrello.filter(
    (r) =>
      r.voce.annuncio.ufficiale &&
      r.voce.annuncio.stato === 'PUBBLICATO' &&
      ordinabile(r.voce) &&
      r.quantita > 0,
  );
  const scartate = carrello.filter((r) => !buone.includes(r));

  if (buone.length === 0) {
    return { errore: 'Quello che avevi nel carrello non è più in vendita: il carrello resta lì, sistemalo.' };
  }

  // ultimo controllo sulle scorte: fra il primo pezzo messo nel carrello e
  // adesso può essere passata una settimana, e qualcun altro può aver preso
  // gli ultimi
  for (const r of buone) {
    const restano = await disponibiliDi(r.voce);
    if (restano !== null && r.quantita > restano) {
      return {
        errore:
          restano <= 0
            ? `${r.voce.titolo}: finita. Toglila dal carrello e manda il resto.`
            : `Di ${r.voce.titolo} ne restano ${restano}: sistema il carrello e riprova.`,
      };
    }
  }

  const righe = buone.map((r) => ({
    voceId: r.voceId,
    titolo: r.voce.titolo,
    // il prezzo si congela adesso: se la maglietta domani passa da 25 a 28,
    // questa quota è già stata emessa a 25 e deve restare quella
    prezzo: Number(r.voce.prezzo),
    quantita: Math.min(MAX_PEZZI, r.quantita),
  }));

  const totale = totaleRighe(righe);
  // nella descrizione della quota l'articolo sta dentro la riga: "2× Patch -
  // PVC" si capisce anche fra sei mesi, "PVC × 2" no
  const dettaglio = buone
    .map((r) =>
      descriviRiga({
        titolo: r.voce.titolo,
        quantita: r.quantita,
        articolo: r.voce.annuncio.titolo,
      }),
    )
    .join(', ');

  await prisma.$transaction(async (tx) => {
    const quota = await tx.payment.create({
      data: {
        userId: me.id,
        tipo: 'MERCHANDISING',
        descrizione: `Merchandising: ${dettaglio}`.slice(0, 250),
        importo: totale,
        status: 'DA_PAGARE',
      },
    });

    await tx.ordine.create({
      data: {
        userId: me.id,
        note: strOpt(fd, 'note'),
        paymentId: quota.id,
        righe: { create: righe },
      },
    });

    // il carrello si svuota solo di quello che è finito nell'ordine
    await tx.rigaCarrello.deleteMany({ where: { id: { in: buone.map((r) => r.id) } } });
  });

  aggiorna();
  return {
    ok:
      scartate.length === 0
        ? `Ordine inviato: ${dettaglio}. La quota è fra i tuoi pagamenti, la incassa la segreteria.`
        : `Ordine inviato: ${dettaglio}. ${scartate.length === 1 ? 'Una voce non era' : `${scartate.length} voci non erano`} più in vendita e ${scartate.length === 1 ? 'è rimasta' : 'sono rimaste'} nel carrello.`,
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

  aggiorna();
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

  aggiorna();
  return {
    ok:
      stato === 'RACCOLTA'
        ? `Ordine ${ordine.numero} rimesso in raccolta.`
        : `Ordine ${ordine.numero}: ${stato.toLowerCase()}.`,
  };
}

/**
 * Chiude il giro di raccolta.
 *
 * È il gesto che fa quadrare il riepilogo: *magliette M da ordinare: 7* vale
 * finché il giro è aperto, poi quei sette si comprano e chi ordina dopo entra
 * nel giro successivo senza che nessuno debba ricordarsi niente.
 *
 * Il giro è uno per tutto il merchandising e non uno per articolo, perché un
 * ordine può contenere una maglietta e due patch: spezzarlo vorrebbe dire
 * spezzare anche la sua quota.
 */
export async function chiudiRaccolta(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoVedereOrdini(me.roles)) {
    return { errore: 'Solo admin e segreteria chiudono la raccolta.' };
  }

  const quanti = await prisma.ordine.updateMany({
    where: { stato: 'RACCOLTA' },
    data: { stato: 'ORDINATO', ordinatoIl: new Date() },
  });

  if (quanti.count === 0) return { errore: 'Non c’è nessun ordine in raccolta da chiudere.' };

  aggiorna();
  return {
    ok:
      quanti.count === 1
        ? 'Giro chiuso: 1 ordine passato al fornitore.'
        : `Giro chiuso: ${quanti.count} ordini passati al fornitore.`,
  };
}
