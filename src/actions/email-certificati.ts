'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoAmministrare } from '@/lib/domain';
import { bool, str, type StatoForm } from '@/lib/form';
import { indirizzi, provaEmailCertificato } from '@/lib/email-certificati';
import { serverPosta } from '@/lib/posta';
import { inStileSquadra } from '@/lib/email-corpo';
import { stileDellaSquadra } from '@/lib/email-stile';

const aggiorna = () => revalidatePath('/admin/certificati');

/** Crea o modifica una regola: quando, a chi, cosa dice. */
export async function salvaEmailCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };

  const id = str(fd, 'id');
  const quando = str(fd, 'quando') === 'SCADENZA' ? 'SCADENZA' : 'ACCETTATO';
  const giorniGrezzi = str(fd, 'giorni');
  const giorni = quando === 'SCADENZA' ? Number(giorniGrezzi) : null;
  if (
    quando === 'SCADENZA' &&
    (!giorniGrezzi || !Number.isInteger(giorni) || giorni! < 0 || giorni! > 365)
  ) {
    return { errore: 'Scrivi quanti giorni prima della scadenza: da 0 (il giorno stesso) a 365.' };
  }

  const grezzi = str(fd, 'destinatari');
  const scritti = indirizzi(grezzi);
  const allInteressato = bool(fd, 'allInteressato');
  if (scritti.length === 0 && !allInteressato) {
    return { errore: 'Scegli almeno un destinatario: la persona o un indirizzo.' };
  }
  const oggetto = str(fd, 'oggetto');
  const testo = str(fd, 'testo');
  if (!oggetto || !testo) return { errore: 'Scrivi oggetto e testo dell’email.' };

  const f = str(fd, 'formato');
  const formato = f === 'HTML' || f === 'MARKDOWN' ? f : 'TESTO';

  const dati = {
    quando,
    formato,
    giorni,
    allInteressato,
    destinatari: scritti.join(', '),
    oggetto: oggetto.slice(0, 200),
    // una pagina HTML fatta bene pesa più di un testo
    testo: testo.slice(0, formato === 'HTML' ? 100_000 : 10_000),
    allegato: bool(fd, 'allegato'),
    attivo: bool(fd, 'attivo'),
  };
  if (id) await prisma.emailCertificato.update({ where: { id }, data: dati });
  else await prisma.emailCertificato.create({ data: dati });

  aggiorna();
  return { ok: id ? 'Email salvata.' : 'Email creata.' };
}

export async function eliminaEmailCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };
  await prisma.emailCertificato.delete({ where: { id: str(fd, 'id') } }).catch(() => null);
  aggiorna();
  return { ok: 'Email eliminata.' };
}

export async function accendiEmailCertificato(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };
  const r = await prisma.emailCertificato.findUnique({ where: { id: str(fd, 'id') } });
  if (!r) return { errore: 'Email non trovata.' };
  await prisma.emailCertificato.update({ where: { id: r.id }, data: { attivo: !r.attivo } });
  aggiorna();
  return { ok: r.attivo ? 'Spenta.' : 'Accesa.' };
}

/** «Mandami una prova»: a me, con l'ultimo certificato approvato come esempio. */
export async function provaEmailCertificatoAMe(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };
  if (!(await serverPosta())) return { errore: 'Non c’è un server di posta collegato.' };
  const r = await prisma.emailCertificato.findUnique({ where: { id: str(fd, 'id') } });
  if (!r) return { errore: 'Email non trovata.' };
  const io = await prisma.user.findUnique({ where: { id: me.id }, select: { email: true } });
  if (!io?.email) return { errore: 'Il tuo account non ha un’email.' };
  const errore = await provaEmailCertificato(r, io.email);
  return errore ? { errore } : { ok: `Prova mandata a ${io.email}.` };
}

/**
 * Tutte le email non ancora in HTML trasformate nello stile della squadra:
 * il testo resta parola per parola quello, impaginato come il gestionale e
 * con il logo come firma. Quelle già in HTML restano come sono.
 */
export async function stileSquadraTutte(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoAmministrare(me.roles)) return { errore: 'Non hai i permessi.' };
  const stile = await stileDellaSquadra();
  const regole = await prisma.emailCertificato.findMany({ where: { formato: { not: 'HTML' } } });
  if (regole.length === 0) return { ok: 'Sono già tutte in HTML.' };
  for (const r of regole) {
    await prisma.emailCertificato.update({
      where: { id: r.id },
      data: {
        formato: 'HTML',
        testo: inStileSquadra(r.testo, r.formato, stile),
      },
    });
  }
  aggiorna();
  return {
    ok:
      regole.length === 1
        ? 'Un’email trasformata: aprila per vedere l’anteprima.'
        : `${regole.length} email trasformate: aprile per vedere l’anteprima.`,
  };
}
