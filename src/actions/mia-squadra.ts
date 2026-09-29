'use server';

import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { UPLOAD_DIR, eliminaAllegato } from '@/lib/storage';
import { strOpt, type StatoForm } from '@/lib/form';
import { diffondiProfilo } from '@/lib/federazione-coda';

const MAX_BYTE = 1_500_000;

async function aggiorna() {
  // nome e logo stanno nell'intestazione di ogni pagina
  revalidatePath('/', 'layout');
  // e le squadre collegate hanno diritto al profilo aggiornato
  await diffondiProfilo().catch(() => null);
}

async function soloAdmin() {
  const me = await requireUser();
  return isAdmin(me.roles) ? me : null;
}

/** Il profilo della squadra: nome, motto, recapiti. Un campo vuoto torna al valore di partenza. */
export async function salvaMiaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (!(await soloAdmin())) return { errore: 'Solo l’admin cambia il profilo della squadra.' };
  const sito = strOpt(fd, 'sito');
  if (sito && !/^https?:\/\//i.test(sito))
    return { errore: 'Il sito va scritto per intero: https://…' };
  const dati = {
    nome: strOpt(fd, 'nome'),
    nomeGestionale: strOpt(fd, 'nomeGestionale'),
    motto: strOpt(fd, 'motto'),
    descrizione: strOpt(fd, 'descrizione'),
    citta: strOpt(fd, 'citta'),
    provincia: strOpt(fd, 'provincia')?.toUpperCase() ?? null,
    sito,
    email: strOpt(fd, 'email')?.toLowerCase() ?? null,
    telefono: strOpt(fd, 'telefono'),
  };
  await prisma.miaSquadra.upsert({ where: { id: 'mia' }, create: dati, update: dati });
  await aggiorna();
  return { ok: 'Profilo della squadra salvato.' };
}

/**
 * Il logo, già ritagliato quadrato dal browser. PNG per tenere la trasparenza
 * dei loghi disegnati; JPEG va bene per una foto.
 */
export async function salvaLogoSquadra(dati: string | null): Promise<{ errore?: string }> {
  if (!(await soloAdmin())) return { errore: 'Solo l’admin cambia il logo della squadra.' };
  const attuale = await prisma.miaSquadra.findUnique({ where: { id: 'mia' } });

  if (dati === null) {
    if (attuale?.logoPath) await eliminaAllegato(attuale.logoPath);
    await prisma.miaSquadra.upsert({
      where: { id: 'mia' },
      create: { logoPath: null },
      update: { logoPath: null },
    });
    await aggiorna();
    return {};
  }

  const intestazione = dati.match(/^data:image\/(png|jpeg);base64,/);
  if (!intestazione) return { errore: 'Formato non riconosciuto: serve un’immagine.' };
  const buffer = Buffer.from(dati.slice(intestazione[0].length), 'base64');
  if (buffer.length === 0) return { errore: 'Immagine vuota.' };
  if (buffer.length > MAX_BYTE) return { errore: 'Immagine troppo grande.' };

  const cartella = path.join(UPLOAD_DIR, 'squadra');
  await mkdir(cartella, { recursive: true });
  const nome = `logo-${randomUUID()}.${intestazione[1] === 'png' ? 'png' : 'jpg'}`;
  await writeFile(path.join(cartella, nome), buffer);
  if (attuale?.logoPath) await eliminaAllegato(attuale.logoPath);

  const logoPath = path.posix.join('squadra', nome);
  await prisma.miaSquadra.upsert({
    where: { id: 'mia' },
    create: { logoPath },
    update: { logoPath },
  });
  await aggiorna();
  return {};
}

/** I referenti: righe parallele del modulo, si tengono quelle con una persona. */
export async function salvaReferenti(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (!(await soloAdmin())) return { errore: 'Solo l’admin sceglie i referenti.' };
  const persone = fd.getAll('referenteId').map(String);
  const ruoli = fd.getAll('referenteRuolo').map(String);
  // le caselle portano il numero della riga: la persona si può cambiare dopo averle spuntate
  const telefoni = new Set(fd.getAll('mostraTelefono').map(String));
  const email = new Set(fd.getAll('mostraEmail').map(String));

  const visti = new Set<string>();
  const righe = persone.flatMap((userId, i) => {
    if (!userId || visti.has(userId)) return [];
    visti.add(userId);
    return [
      {
        userId,
        ruolo: ruoli[i]?.trim() || 'Referente',
        mostraTelefono: telefoni.has(String(i)),
        mostraEmail: email.has(String(i)),
        ordine: i,
      },
    ];
  });

  await prisma.$transaction([
    prisma.referenteMiaSquadra.deleteMany({}),
    prisma.referenteMiaSquadra.createMany({ data: righe }),
  ]);
  revalidatePath('/admin/squadra');
  return {
    ok: righe.length === 1 ? 'Un referente salvato.' : `${righe.length} referenti salvati.`,
  };
}
