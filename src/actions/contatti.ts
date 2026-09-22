'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { puoVedereNuovi } from '@/lib/domain';
import { nascitaCredibile, nuovaChiaveSito } from '@/lib/contatti-esterni';
import { isAdmin } from '@/lib/domain';
import { bool, data, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * I contatti: le persone da chiamare prima che diventino nuovi.
 *
 * Arrivano dai siti collegati, attraverso la porta `/api/contatti`, o da chi
 * li scrive a mano dopo una telefonata.
 * Li segue chi segue i nuovi — admin, amministrazione, segreteria — perché sono
 * la stessa persona in un momento prima.
 */

function aggiorna() {
  revalidatePath('/admin/contatti');
  // il pallino nel menu
  revalidatePath('/', 'layout');
}

// ------------------------------------------------------------ dal gestionale

async function chiSegue() {
  const me = await requireUser();
  return puoVedereNuovi(me.roles) ? me : null;
}

/** Un contatto scritto a mano: il passaparola, la telefonata ricevuta. */
export async function aggiungiContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  const nome = str(fd, 'nome');
  const telefono = str(fd, 'telefono');
  if (!nome || !telefono) return { errore: 'Servono almeno nome e telefono.' };
  // a mano la data è facoltativa: al telefono non sempre la si chiede subito
  const dataNascita = data(fd, 'dataNascita');
  if (dataNascita && !nascitaCredibile(dataNascita)) {
    return { errore: 'La data di nascita non sembra giusta: controllala o lasciala vuota.' };
  }

  await prisma.contatto.create({
    data: {
      nome,
      cognome: strOpt(fd, 'cognome'),
      telefono,
      dataNascita,
      email: strOpt(fd, 'email')?.toLowerCase() ?? null,
      zona: strOpt(fd, 'zona'),
      comeCiHaConosciuto: strOpt(fd, 'come'),
      nota: strOpt(fd, 'nota'),
      origine: 'MANO',
      creatoDaId: me.id,
    },
  });
  aggiorna();
  return { ok: `${nome} è fra i contatti da chiamare.` };
}

/**
 * La nota della telefonata, e il segno «l'ho chiamato».
 *
 * Il segno serve a non chiamarlo in due: chi apre la pagina vede che qualcuno
 * ci ha già parlato ieri, e cosa si sono detti.
 */
export async function salvaNotaContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  await prisma.contatto.update({
    where: { id: str(fd, 'id') },
    data: {
      nota: strOpt(fd, 'nota'),
      ...(bool(fd, 'chiamato') ? { chiamatoIl: new Date() } : {}),
    },
  });
  aggiorna();
  return { ok: 'Salvato.' };
}

/**
 * Scarta: la riga sparisce del tutto.
 *
 * Di chi non è mai entrato non si tengono i dati «nel caso»: ce li ha dati per
 * essere richiamato, e se non se ne fa niente non c'è motivo di conservarli.
 */
export async function scartaContatto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await chiSegue();
  if (!me) return { errore: 'I contatti li segue chi segue i nuovi.' };

  await prisma.contatto.delete({ where: { id: str(fd, 'id') } }).catch(() => null);
  aggiorna();
  return { ok: 'Contatto scartato: i suoi dati sono stati cancellati.' };
}

// ------------------------------------------------------------ siti collegati

/**
 * Collega un sito esterno: gli dà una chiave per consegnare i contatti.
 *
 * Lo fa l'admin, perché è una porta aperta verso l'esterno. La chiave si vede
 * una volta sola, in chiaro, insieme all'indirizzo a cui mandare i moduli:
 * nel gestionale ne resta soltanto l'impronta.
 */
export async function collegaSito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'I siti li collega l’admin.' };

  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome al sito: «Sito della squadra», «Pagina dell’evento»…' };

  const nuova = nuovaChiaveSito();
  await prisma.sitoCollegato.create({
    data: { id: nuova.id, nome, hash: nuova.hash, prefisso: nuova.prefisso, creatoDaId: me.id },
  });

  // l'indirizzo com'è visto da chi sta guardando la pagina: dietro il proxy
  // sono le intestazioni inoltrate a dire quello vero
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost';
  const proto = h.get('x-forwarded-proto') ?? 'https';

  aggiorna();
  return {
    ok: 'Sito collegato.',
    chiaveSito: { nome, chiave: nuova.chiave, indirizzo: `${proto}://${host}/api/contatti` },
  };
}

/** Scollega un sito: la sua chiave smette di valere subito. I contatti arrivati restano. */
export async function scollegaSito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'I siti li scollega l’admin.' };
  await prisma.sitoCollegato.delete({ where: { id: str(fd, 'id') } }).catch(() => null);
  aggiorna();
  return { ok: 'Sito scollegato: la sua chiave non vale più.' };
}
