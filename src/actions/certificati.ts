'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare, scadenzaCertificato } from '@/lib/domain';
import { eliminaAllegato, salvaAllegato } from '@/lib/storage';
import { data, str, strOpt, enumVal, type StatoForm } from '@/lib/form';

const TIPI = ['NON_AGONISTICO', 'AGONISTICO'] as const;

function aggiorna() {
  revalidatePath('/certificati');
  revalidatePath('/admin/certificati');
  revalidatePath('/dashboard');
  revalidatePath('/admin/operatori');
}

/** Carica un certificato. Il giocatore carica per sé, lo staff può caricare per altri. */
export async function caricaCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();

  const perUtente = str(fd, 'userId');
  const userId = perUtente && puoAmministrare(me.roles) ? perUtente : me.id;

  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { errore: 'Allega il file del certificato (PDF o immagine).' };
  }

  const rilasciatoIl = data(fd, 'rilasciatoIl');
  if (!rilasciatoIl) return { errore: 'Indica la data di rilascio del certificato.' };
  if (rilasciatoIl > new Date()) {
    return { errore: 'La data di rilascio non può essere nel futuro.' };
  }

  // la validità è fissa: la scadenza non si digita, si calcola
  const scadeIl = scadenzaCertificato(rilasciatoIl);

  let salvato;
  try {
    salvato = await salvaAllegato(file, 'certificati');
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Caricamento non riuscito.' };
  }

  await prisma.medicalCertificate.create({
    data: {
      userId,
      tipo: enumVal(fd, 'tipo', TIPI, 'NON_AGONISTICO'),
      rilasciatoIl,
      scadeIl,
      note: strOpt(fd, 'note'),
      status: 'IN_ATTESA',
      ...salvato,
    },
  });

  aggiorna();
  return { ok: 'Certificato caricato. Resta in attesa di approvazione.' };
}

/** Approvazione da parte dello staff: le date possono essere corrette in questa fase. */
export async function approvaCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per approvare i certificati.' };

  const id = str(fd, 'id');
  const rilasciatoIl = data(fd, 'rilasciatoIl');
  if (!id) return { errore: 'Certificato non trovato.' };
  if (!rilasciatoIl) return { errore: 'Indica la data di rilascio prima di approvare.' };

  const attuale = await prisma.medicalCertificate.findUnique({ where: { id } });
  if (attuale?.status === 'VALIDO') {
    return { errore: 'Questo certificato è già validato e non si può più modificare.' };
  }

  await prisma.medicalCertificate.update({
    where: { id },
    data: {
      status: 'VALIDO',
      rilasciatoIl,
      scadeIl: scadenzaCertificato(rilasciatoIl),
      motivoRifiuto: null,
      reviewedById: me.id,
      reviewedAt: new Date(),
    },
  });

  aggiorna();
  return { ok: 'Certificato approvato.' };
}

export async function rifiutaCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi per rifiutare i certificati.' };

  const id = str(fd, 'id');
  const motivo = str(fd, 'motivoRifiuto');
  if (!id) return { errore: 'Certificato non trovato.' };
  if (!motivo) return { errore: 'Indica il motivo del rifiuto: il giocatore lo vedrà.' };

  const attuale = await prisma.medicalCertificate.findUnique({ where: { id } });
  if (attuale?.status === 'VALIDO') {
    return { errore: 'Questo certificato è già validato e non si può più rifiutare.' };
  }

  await prisma.medicalCertificate.update({
    where: { id },
    data: {
      status: 'RIFIUTATO',
      motivoRifiuto: motivo,
      reviewedById: me.id,
      reviewedAt: new Date(),
    },
  });

  aggiorna();
  return { ok: 'Certificato rifiutato.' };
}

/**
 * Si può ritirare solo un caricamento non ancora vagliato: un certificato
 * approvato è un documento sanitario validato e resta intoccabile.
 */
export async function eliminaCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const cert = await prisma.medicalCertificate.findUnique({ where: { id } });
  if (!cert) return { errore: 'Certificato non trovato.' };

  // Chi amministra i certificati può togliere qualsiasi riga, anche una già
  // approvata. Sembra pericoloso e non lo è: il caso vero è il doppione, e
  // costringere a *rifiutarlo* per farlo sparire lascia in elenco una riga
  // rossa che racconta una bocciatura mai avvenuta. Chi tiene l'elenco deve
  // poterlo tenere pulito.
  const mioNonAncoraVagliato = cert.userId === me.id && cert.status === 'IN_ATTESA';
  if (!mioNonAncoraVagliato && !puoAmministrare(me.roles)) {
    return { errore: 'Puoi eliminare solo un tuo certificato non ancora approvato.' };
  }

  await prisma.medicalCertificate.delete({ where: { id } });
  await eliminaAllegato(cert.filePath);

  aggiorna();
  return { ok: 'Certificato eliminato.' };
}
