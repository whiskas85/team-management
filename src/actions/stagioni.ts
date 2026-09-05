'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { data, enumVal, num, str, strOpt, type StatoForm } from '@/lib/form';

function aggiorna() {
  revalidatePath('/admin/stagioni');
  revalidatePath('/admin/inviti');
  revalidatePath('/admin/operatori');
  revalidatePath('/calendario');
}

export async function salvaStagione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce le stagioni.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  const inizio = data(fd, 'inizio');
  const fine = data(fd, 'fine');

  if (!nome) return { errore: 'Il nome della stagione è obbligatorio (es. 2026/2027).' };
  if (!inizio || !fine) return { errore: 'Indica inizio e fine della stagione.' };
  if (fine <= inizio) return { errore: 'La fine deve venire dopo l’inizio.' };

  const omonima = await prisma.stagione.findUnique({ where: { nome } });
  if (omonima && omonima.id !== id) return { errore: `La stagione ${nome} esiste già.` };

  const valori = { nome, inizio, fine, note: strOpt(fd, 'note') };

  if (id) {
    await prisma.stagione.update({ where: { id }, data: valori });
    aggiorna();
    return { ok: 'Stagione aggiornata.' };
  }

  await prisma.stagione.create({ data: valori });
  aggiorna();
  return { ok: `Stagione ${nome} creata. Aprila quando vuoi renderla quella in corso.` };
}

/**
 * Apre una stagione: diventa quella corrente e la rosa si azzera. Chi era in
 * squadra passa in "da riconfermare" e rientra solo con un nuovo invito, che
 * è esattamente il senso di ricominciare l'anno.
 *
 * Non tocca chi è nuovo, rifiutato o disabilitato: quelli non erano in rosa.
 */
export async function apriStagione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può aprire una stagione.' };

  const id = str(fd, 'id');
  const stagione = await prisma.stagione.findUnique({ where: { id } });
  if (!stagione) return { errore: 'Stagione non trovata.' };
  if (stagione.corrente) return { errore: `${stagione.nome} è già la stagione in corso.` };

  const azzera = str(fd, 'azzera') === '1';

  const [, , svuotati] = await prisma.$transaction([
    prisma.stagione.updateMany({ where: { corrente: true }, data: { corrente: false } }),
    prisma.stagione.update({ where: { id }, data: { corrente: true, chiusa: false } }),
    azzera
      ? prisma.user.updateMany({
          where: { stato: { in: ['SQUADRA', 'SOSPESO'] } },
          data: { stato: 'DA_RICONFERMARE' },
        })
      : prisma.user.updateMany({ where: { id: '' }, data: {} }),
  ]);

  aggiorna();
  return {
    ok: azzera
      ? `Stagione ${stagione.nome} aperta. ${svuotati.count} operatori sono da riconfermare: invia le richieste di reiscrizione per ricomporre la rosa.`
      : `Stagione ${stagione.nome} aperta. La rosa è rimasta com’era.`,
  };
}

/**
 * Chiude o riapre una stagione. Una stagione chiusa e' storia: resta
 * consultabile ma non e' piu' la stagione in cui nascono le cose nuove.
 */
export async function chiudiStagione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce le stagioni.' };

  const id = str(fd, 'id');
  const stagione = await prisma.stagione.findUnique({ where: { id } });
  if (!stagione) return { errore: 'Stagione non trovata.' };
  if (stagione.corrente) {
    return { errore: 'Non si chiude la stagione in corso: aprine un’altra e questa si archivia da sé.' };
  }

  await prisma.stagione.update({ where: { id }, data: { chiusa: !stagione.chiusa } });
  aggiorna();
  return { ok: stagione.chiusa ? `${stagione.nome} riaperta.` : `${stagione.nome} chiusa.` };
}

/**
 * Registra a posteriori chi c'era in una stagione passata.
 *
 * Serve a ricostruire lo storico: non manda inviti e non cambia lo stato di
 * nessuno, scrive solo le iscrizioni come gia' attive. Chi ce l'ha gia' viene
 * saltato, cosi' si puo' rilanciare senza fare danni.
 */
export async function registraRosaStorica(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin ricostruisce lo storico.' };

  const stagioneId = str(fd, 'stagioneId');
  const stagione = await prisma.stagione.findUnique({ where: { id: stagioneId } });
  if (!stagione) return { errore: 'Stagione non trovata.' };

  const ids = fd.getAll('userIds').map((v) => v.toString()).filter(Boolean);
  if (ids.length === 0) return { errore: 'Seleziona almeno un operatore.' };

  const tipo = enumVal(fd, 'tipo', ['ISCRIZIONE', 'REISCRIZIONE'] as const, 'REISCRIZIONE');
  const quota = num(fd, 'quota');

  const gia = await prisma.membership.findMany({
    where: { stagioneId, userId: { in: ids } },
    select: { userId: true },
  });
  const daScrivere = ids.filter((id) => !gia.some((g) => g.userId === id));
  if (daScrivere.length === 0) {
    return { errore: `Risultano già tutti iscritti per ${stagione.nome}.` };
  }

  await prisma.membership.createMany({
    data: daScrivere.map((userId) => ({
      userId,
      stagioneId,
      tipo,
      status: 'ATTIVA' as const,
      quota,
      note: 'Inserita a posteriori per ricostruire lo storico.',
      invitedById: me.id,
      compilataIl: stagione.inizio,
      decisaIl: stagione.inizio,
      decidedById: me.id,
    })),
  });

  aggiorna();
  const saltati = ids.length - daScrivere.length;
  return {
    ok:
      `${daScrivere.length} iscrizioni registrate su ${stagione.nome}` +
      (saltati > 0 ? `, ${saltati} già presenti e saltate.` : '.'),
  };
}

export async function eliminaStagione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce le stagioni.' };

  const id = str(fd, 'id');
  const stagione = await prisma.stagione.findUnique({
    where: { id },
    include: { _count: { select: { memberships: true, figtCards: true, eventi: true } } },
  });
  if (!stagione) return { errore: 'Stagione non trovata.' };
  if (stagione.corrente) return { errore: 'Non si elimina la stagione in corso: aprine un’altra prima.' };

  const legami = stagione._count.memberships + stagione._count.figtCards + stagione._count.eventi;
  if (legami > 0) {
    await prisma.stagione.update({ where: { id }, data: { chiusa: true } });
    aggiorna();
    return { ok: `${stagione.nome} ha ${legami} elementi collegati: è stata chiusa invece che eliminata.` };
  }

  await prisma.stagione.delete({ where: { id } });
  aggiorna();
  return { ok: 'Stagione eliminata.' };
}

// ------------------------------------------------------------------ tariffe

const USI = [
  'ISCRIZIONE',
  'REISCRIZIONE',
  'TESSERA_FIGT',
  'GIOCATA_NUOVO',
  'ATTIVITA',
  'AFFITTO',
] as const;

export async function salvaTariffa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce il tariffario.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome alla voce, es. "Reiscrizione" o "Cassa comune".' };

  const importo = num(fd, 'importo');
  if (importo === null || importo < 0) return { errore: 'Indica un importo valido.' };

  // stagione facoltativa: senza, l'importo vale per tutte le stagioni
  const stagioneId = strOpt(fd, 'stagioneId');

  // gli usi sono facoltativi e possono essere piu' d'uno: la stessa voce puo'
  // valere sia per l'iscrizione sia per il rinnovo
  const usi = fd
    .getAll('usi')
    .map((v) => v.toString())
    .filter((v): v is (typeof USI)[number] => (USI as readonly string[]).includes(v));

  const omonima = await prisma.tariffa.findFirst({
    where: { nome, stagioneId, ...(id ? { NOT: { id } } : {}) },
  });
  if (omonima) {
    return {
      errore: stagioneId
        ? `Esiste già una voce "${nome}" per quella stagione.`
        : `Esiste già una voce "${nome}" valida per tutte le stagioni.`,
    };
  }

  const valori = { nome, usi, importo, stagioneId, note: strOpt(fd, 'note'), attiva: true };

  if (id) {
    await prisma.tariffa.update({ where: { id }, data: valori });
  } else {
    await prisma.tariffa.create({ data: valori });
  }

  revalidatePath('/admin/stagioni');
  revalidatePath('/admin/inviti');
  return { ok: 'Tariffa salvata.' };
}

export async function eliminaTariffa(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce il tariffario.' };

  await prisma.tariffa.delete({ where: { id: str(fd, 'id') } });
  revalidatePath('/admin/stagioni');
  return { ok: 'Tariffa eliminata.' };
}
