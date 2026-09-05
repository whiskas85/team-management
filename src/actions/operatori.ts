'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Prisma, Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { hashPassword, requireUser, verifyPassword } from '@/lib/auth';
import { isAdmin, isContatto, puoVedereNuovi, puoVedereOperatori } from '@/lib/domain';
import { VERSIONE_PRIVACY } from '@/lib/gdpr';
import { data, enumVal, str, strOpt, bool, type StatoForm } from '@/lib/form';

const RUOLI = ['ADMIN', 'AMMINISTRAZIONE', 'SEGRETERIA', 'TL', 'ATLETA'] as const;
const STATI = [
  'NUOVO',
  'ATTESA_COMPILAZIONE',
  'ATTESA_ACCETTAZIONE',
  'SQUADRA',
  'RIFIUTATO',
  'SOSPESO',
  'DISABILITATO',
] as const;

function aggiorna(userId?: string) {
  revalidatePath('/profilo');
  revalidatePath('/admin/operatori');
  revalidatePath('/admin/nuovi');
  if (userId) revalidatePath(`/admin/operatori/${userId}`);
}

/** Legge le checkbox dei ruoli (name="roles", più valori). */
function leggiRuoli(fd: FormData): Role[] {
  return fd
    .getAll('roles')
    .map((v) => v.toString())
    .filter((v): v is Role => (RUOLI as readonly string[]).includes(v));
}

/** Ognuno aggiorna la propria anagrafica; l'admin può farlo per chiunque. */
export async function aggiornaProfilo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const target = str(fd, 'userId');
  const userId = target && isAdmin(me.roles) ? target : me.id;

  // La scheda è divisa in più sezioni, ognuna con il suo modulo: si aggiornano
  // solo i campi che sono stati davvero inviati, altrimenti salvare i recapiti
  // azzererebbe l'anagrafica e viceversa.
  const cambi: Prisma.UserUpdateInput = {};
  const testo = (campo: 'callsign' | 'frase' | 'telefono' | 'luogoNascita' | 'indirizzo' | 'citta' | 'cap' | 'emergenzaNome' | 'emergenzaTel' | 'gruppoSanguigno' | 'allergie') => {
    if (fd.has(campo)) cambi[campo] = strOpt(fd, campo);
  };

  if (fd.has('nome') || fd.has('cognome')) {
    const nome = str(fd, 'nome');
    const cognome = str(fd, 'cognome');
    if (!nome || !cognome) return { errore: 'Nome e cognome sono obbligatori.' };
    cambi.nome = nome;
    cambi.cognome = cognome;
  }

  // il callsign serve anche ad accedere: due uguali renderebbero ambiguo il
  // login, quindi si rifiuta il doppione invece di scoprirlo dopo
  if (fd.has('callsign')) {
    const cs = strOpt(fd, 'callsign');
    if (cs) {
      const preso = await prisma.user.findFirst({
        where: { callsign: { equals: cs, mode: 'insensitive' }, NOT: { id: userId } },
        select: { nome: true, cognome: true },
      });
      if (preso) {
        return { errore: `Il callsign "${cs}" è già di ${preso.nome} ${preso.cognome}.` };
      }
    }
  }

  (['callsign', 'frase', 'telefono', 'luogoNascita', 'indirizzo', 'citta', 'cap', 'emergenzaNome', 'emergenzaTel', 'gruppoSanguigno', 'allergie'] as const).forEach(testo);

  if (fd.has('dataNascita')) cambi.dataNascita = data(fd, 'dataNascita');
  if (fd.has('codiceFiscale')) cambi.codiceFiscale = strOpt(fd, 'codiceFiscale')?.toUpperCase() ?? null;
  if (fd.has('provincia')) cambi.provincia = strOpt(fd, 'provincia')?.toUpperCase() ?? null;

  if (Object.keys(cambi).length === 0) return { errore: 'Non c’è niente da salvare.' };

  await prisma.user.update({ where: { id: userId }, data: cambi });

  aggiorna(userId);
  return { ok: 'Dati aggiornati.' };
}

export async function cambiaPassword(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const attuale = str(fd, 'attuale');
  const nuova = str(fd, 'nuova');
  const conferma = str(fd, 'conferma');

  if (nuova.length < 8) return { errore: 'La nuova password deve avere almeno 8 caratteri.' };
  if (nuova !== conferma) return { errore: 'Le due password non coincidono.' };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await verifyPassword(attuale, user.passwordHash))) {
    return { errore: 'Password attuale errata.' };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { passwordHash: await hashPassword(nuova), deveCambiarePassword: false },
  });

  // dal cambio obbligatorio si entra nell'applicazione: restare fermi sulla
  // pagina dopo aver fatto quello che chiedeva sarebbe un vicolo cieco. Dal
  // profilo invece non si va da nessuna parte, e il campo non viene mandato
  const ritorno = strOpt(fd, 'ritorno');
  if (ritorno?.startsWith('/')) redirect(ritorno);

  return { ok: 'Password aggiornata.' };
}

/** Creazione manuale di un operatore da parte dell'admin. */
export async function creaOperatore(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può creare operatori.' };

  const email = str(fd, 'email').toLowerCase();
  const nome = str(fd, 'nome');
  const cognome = str(fd, 'cognome');
  const password = str(fd, 'password');

  if (!email || !nome || !cognome) return { errore: 'Email, nome e cognome sono obbligatori.' };
  if (password.length < 8) return { errore: 'La password provvisoria richiede almeno 8 caratteri.' };
  if (await prisma.user.findUnique({ where: { email } })) {
    return { errore: 'Esiste già un account con questa email.' };
  }

  const stato = enumVal(fd, 'stato', STATI, 'SQUADRA');
  const roles = leggiRuoli(fd);

  await prisma.user.create({
    data: {
      email,
      nome,
      cognome,
      passwordHash: await hashPassword(password),
      callsign: strOpt(fd, 'callsign'),
      telefono: strOpt(fd, 'telefono'),
      roles: stato === 'SQUADRA' && roles.length === 0 ? ['ATLETA'] : roles,
      stato,
    },
  });

  aggiorna();
  return { ok: `${nome} ${cognome} è stato creato. Comunicagli la password provvisoria.` };
}

/** Ruoli e stato dell'operatore. */
export async function aggiornaAccesso(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può modificare ruoli e stati.' };

  const userId = str(fd, 'userId');
  const roles = leggiRuoli(fd);
  const stato = enumVal(fd, 'stato', STATI, 'SQUADRA');

  if (userId === me.id && !roles.includes('ADMIN')) {
    return { errore: 'Non puoi togliere a te stesso i permessi di admin.' };
  }
  if (userId === me.id && stato !== 'SQUADRA') {
    return { errore: 'Non puoi cambiare lo stato del tuo stesso account.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { roles, stato, disabledAt: stato === 'DISABILITATO' ? new Date() : null },
  });

  aggiorna(userId);
  return { ok: 'Ruoli e stato aggiornati.' };
}

/**
 * Alfabeto senza caratteri che si confondono a voce o a occhio: niente 0/O,
 * 1/l/I, 5/S. La password si detta al telefono, quindi deve essere dettabile.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRTUVWXYZ2346789';

function generaPassword(): string {
  const b = randomBytes(12);
  const c = [...b].map((n) => ALFABETO[n % ALFABETO.length]).join('');
  // a gruppi di quattro: si legge e si ricopia senza perdere il segno
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8, 12)}`;
}

/**
 * Reset della password da parte dell'admin.
 *
 * Non si mandano email, quindi la password nuova la genera il gestionale e la
 * mostra una volta sola a chi l'ha chiesta: sta a lei consegnarla di persona.
 * L'operatore resta segnato come "deve cambiarla", e al prossimo accesso non
 * fa altro finche' non se ne sceglie una sua: una password passata a voce non
 * deve restare in giro.
 */
export async function resettaPassword(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può resettare le password.' };

  const userId = str(fd, 'userId');
  const utente = await prisma.user.findUnique({
    where: { id: userId },
    select: { nome: true, cognome: true },
  });
  if (!utente) return { errore: 'Operatore non trovato.' };

  const nuova = generaPassword();

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(nuova), deveCambiarePassword: true },
  });

  aggiorna(userId);
  return {
    ok:
      `Password di ${utente.nome} ${utente.cognome}: ${nuova} — annotala adesso, ` +
      'non verrà più mostrata. Al primo accesso dovrà sceglierne una sua.',
  };
}

/**
 * Cancellazione definitiva (art. 17 GDPR). Usata anche per i nuovi che si
 * presentano una volta e non tornano più.
 */
export async function eliminaOperatore(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin può cancellare un operatore.' };

  const userId = str(fd, 'userId');
  if (userId === me.id) return { errore: 'Non puoi cancellare il tuo stesso account.' };

  const utente = await prisma.user.findUnique({
    where: { id: userId },
    include: { certificates: { select: { filePath: true } } },
  });
  if (!utente) return { errore: 'Operatore non trovato.' };

  // gli allegati vivono su disco: vanno rimossi insieme al record
  const { eliminaAllegato } = await import('@/lib/storage');
  for (const c of utente.certificates) await eliminaAllegato(c.filePath);

  await prisma.user.delete({ where: { id: userId } });

  aggiorna();
  redirect(str(fd, 'ritorno') || '/admin/operatori');
}

/** Consensi facoltativi, modificabili dall'interessato in qualsiasi momento. */
export async function aggiornaConsensi(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const immagini = bool(fd, 'consensoImmagini');
  const comunicaz = bool(fd, 'consensoComunicaz');

  const attuale = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });

  await prisma.user.update({
    where: { id: me.id },
    data: {
      consensoImmagini: immagini,
      consensoImmaginiIl: immagini
        ? (attuale.consensoImmaginiIl ?? new Date())
        : null,
      consensoComunicaz: comunicaz,
      consensoComunicazIl: comunicaz ? (attuale.consensoComunicazIl ?? new Date()) : null,
      privacyAccettataIl: attuale.privacyAccettataIl ?? new Date(),
      privacyVersione: attuale.privacyVersione ?? VERSIONE_PRIVACY,
    },
  });

  revalidatePath('/profilo');
  return { ok: 'Preferenze di consenso aggiornate.' };
}

/** Richiesta di cancellazione dell'account: la registra e avvisa l'admin. */
export async function chiediCancellazione(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const conferma = str(fd, 'conferma').trim().toUpperCase();
  if (conferma !== 'CANCELLA') {
    return { errore: 'Scrivi CANCELLA per confermare la richiesta.' };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: { cancellazioneChiesta: new Date() },
  });

  revalidatePath('/profilo');
  revalidatePath('/admin/operatori');
  return {
    ok: 'Richiesta registrata. L’amministrazione procederà nei termini di legge.',
  };
}

/** Nota interna su un operatore: visibile solo a chi ha incarichi. */
export async function aggiungiNota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoVedereOperatori(me.roles)) return { errore: 'Non hai i permessi per scrivere note.' };

  const userId = str(fd, 'userId');
  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'La nota è vuota.' };

  // sulla scheda di un contatto scrive solo chi la può aprire
  const bersaglio = await prisma.user.findUnique({
    where: { id: userId },
    select: { stato: true },
  });
  if (!bersaglio) return { errore: 'Operatore non trovato.' };
  if (isContatto(bersaglio.stato) && !puoVedereNuovi(me.roles)) {
    return { errore: 'Non hai i permessi per scrivere note.' };
  }

  await prisma.playerNote.create({ data: { userId, testo, authorId: me.id } });
  aggiorna(userId);
  return { ok: 'Nota aggiunta.' };
}

export async function eliminaNota(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');

  const nota = await prisma.playerNote.findUnique({ where: { id } });
  if (!nota) return { errore: 'Nota non trovata.' };
  if (nota.authorId !== me.id && !isAdmin(me.roles)) {
    return { errore: 'Puoi eliminare solo le note che hai scritto.' };
  }

  await prisma.playerNote.delete({ where: { id } });
  aggiorna(nota.userId);
  return { ok: 'Nota eliminata.' };
}
