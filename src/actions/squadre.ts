'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { decifra } from '@/lib/segreti';
import { bool, enumVal, intOpt, str, strOpt, type StatoForm } from '@/lib/form';
import {
  chiaveNome,
  COMITATO_PREDEFINITO,
  htmlDaFile,
  leggiSquadre,
  scaricaSquadre,
  type SquadraPortale,
} from '@/lib/figt-squadre';
import type { StatoSquadra } from '@prisma/client';

const STATI: StatoSquadra[] = ['PREFERITA', 'ATTIVA', 'DISATTIVATA'];

/** Le cariche che il portale FIGT porta con sé: all'import si riscrivono. */
const CARICHE_FIGT = ['Presidente', 'Vicepresidente', 'Segretario'];

function aggiorna() {
  revalidatePath('/admin/squadre', 'layout');
  revalidatePath('/admin/campi');
  revalidatePath('/calendario');
}

/** I contatti dal modulo: righe parallele, si tengono quelle con un nome. */
function contattiDalModulo(fd: FormData) {
  const ruoli = fd.getAll('contattoRuolo').map(String);
  const nomi = fd.getAll('contattoNome').map(String);
  const telefoni = fd.getAll('contattoTelefono').map(String);
  const email = fd.getAll('contattoEmail').map(String);
  return nomi.flatMap((n, i) => {
    const nome = n.trim();
    if (!nome) return [];
    return [
      {
        ruolo: ruoli[i]?.trim() || 'Contatto',
        nome,
        telefono: telefoni[i]?.trim() || null,
        email: email[i]?.trim().toLowerCase() || null,
        ordine: i,
      },
    ];
  });
}

export async function salvaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome della squadra è obbligatorio.' };

  const doppione = await prisma.squadraEsterna.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già una squadra chiamata "${nome}".` };
  }

  const valori = {
    nome,
    telefono: strOpt(fd, 'telefono'),
    email: strOpt(fd, 'email'),
    sito: strOpt(fd, 'sito'),
    indirizzo: strOpt(fd, 'indirizzo'),
    cap: strOpt(fd, 'cap'),
    citta: strOpt(fd, 'citta'),
    provincia: strOpt(fd, 'provincia')?.toUpperCase() ?? null,
    disciplina: strOpt(fd, 'disciplina'),
    settoreGiovanile: bool(fd, 'settoreGiovanile'),
    note: strOpt(fd, 'note'),
    stato: enumVal(fd, 'stato', STATI, 'ATTIVA'),
  };
  const contatti = contattiDalModulo(fd);

  if (id) {
    await prisma.$transaction([
      prisma.squadraEsterna.update({ where: { id }, data: valori }),
      prisma.contattoSquadra.deleteMany({ where: { squadraId: id } }),
      prisma.contattoSquadra.createMany({
        data: contatti.map((c) => ({ ...c, squadraId: id })),
      }),
    ]);
    aggiorna();
    return { ok: 'Squadra aggiornata.' };
  }

  await prisma.squadraEsterna.create({
    data: { ...valori, contatti: { create: contatti } },
  });
  aggiorna();
  return { ok: 'Squadra aggiunta.' };
}

/** La stella: preferita o no, con un tocco dall'elenco o dal profilo. */
export async function impostaStatoSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const stato = enumVal(fd, 'stato', STATI, 'ATTIVA');
  await prisma.squadraEsterna.update({ where: { id: str(fd, 'id') }, data: { stato } });
  aggiorna();
  return {
    ok:
      stato === 'PREFERITA'
        ? 'Fra le preferite: la trovi in cima.'
        : stato === 'DISATTIVATA'
          ? 'Squadra disattivata.'
          : 'Tolta dalle preferite.',
  };
}

export async function eliminaSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const campi = await prisma.field.count({ where: { squadraId: id } });

  if (campi > 0) {
    // resta agganciata ai campi: la disattiviamo per non perdere il riferimento
    await prisma.squadraEsterna.update({ where: { id }, data: { stato: 'DISATTIVATA' } });
    aggiorna();
    return { ok: `Squadra collegata a ${campi} campi: disattivata anziché eliminata.` };
  }

  await prisma.squadraEsterna.delete({ where: { id } });
  aggiorna();
  return { ok: 'Squadra eliminata.' };
}

/**
 * Le società affiliate FIGT, dentro l'anagrafica delle squadre.
 *
 * Dal portale, con l'accesso già salvato per le tessere, oppure da un file:
 * la pagina salvata dal browser o un HAR. Le nuove entrano come **attive**,
 * non preferite: si importano tutte e poi si sceglie. Quelle che ci sono già
 * — ritrovate col nome del portale, o col nome ripulito da «A.S.D.» e simili —
 * si aggiornano: indirizzo, disciplina, settore giovanile e le cariche
 * (presidente, vicepresidente, segretario). Telefono ed email della società
 * si scrivono solo se mancano, e i contatti aggiunti a mano restano.
 */
export async function importaSquadreFigt(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const file = fd.get('file');
  let lette: SquadraPortale[];
  if (file instanceof File && file.size > 0) {
    if (file.size > 20 * 1024 * 1024) return { errore: 'Il file è troppo grande (massimo 20 MB).' };
    lette = leggiSquadre(htmlDaFile(await file.text()));
    if (lette.length === 0) {
      return {
        errore:
          'Nel file non ho trovato l’elenco delle società: serve la pagina «Statistiche» del comitato regionale.',
      };
    }
  } else {
    const salvate = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
    if (!salvate) {
      return {
        errore:
          'Il portale FIGT non è collegato: salva l’accesso nella pagina delle tessere, o carica la pagina salvata.',
      };
    }
    const comitato = str(fd, 'comitato') || COMITATO_PREDEFINITO;
    const anno = intOpt(fd, 'anno') ?? new Date().getFullYear();
    try {
      lette = await scaricaSquadre(
        {
          login: salvate.login,
          password: decifra(salvate.passwordCifrata),
          idAnagrafica: salvate.idAnagrafica,
        },
        comitato,
        anno,
      );
    } catch (e) {
      return { errore: `Il portale non ha risposto come doveva: ${(e as Error).message}` };
    }
    if (lette.length === 0) {
      return {
        errore: `Il portale non ha restituito società per il comitato ${comitato} nel ${anno}.`,
      };
    }
  }

  const esistenti = await prisma.squadraEsterna.findMany({
    select: { id: true, nome: true, nomeFigt: true, telefono: true, email: true },
  });
  const perFigt = new Map(esistenti.filter((s) => s.nomeFigt).map((s) => [s.nomeFigt!, s]));
  const perChiave = new Map(esistenti.map((s) => [chiaveNome(s.nome), s]));
  const nomiUsati = new Set(esistenti.map((s) => s.nome));

  const ora = new Date();
  let nuove = 0;
  let aggiornate = 0;
  for (const p of lette) {
    const trovata = perFigt.get(p.nomeFigt) ?? perChiave.get(chiaveNome(p.nomeFigt));
    const dati = {
      nomeFigt: p.nomeFigt,
      indirizzo: p.indirizzo,
      cap: p.cap,
      citta: p.citta,
      provincia: p.provincia,
      disciplina: p.disciplina,
      settoreGiovanile: p.settoreGiovanile,
      figtAggiornataIl: ora,
    };
    const cariche = p.cariche.map((c, i) => ({ ...c, ordine: i }));

    if (trovata) {
      await prisma.$transaction([
        prisma.squadraEsterna.update({
          where: { id: trovata.id },
          data: {
            ...dati,
            telefono: trovata.telefono ?? p.telefono,
            email: trovata.email ?? p.email,
          },
        }),
        prisma.contattoSquadra.deleteMany({
          where: { squadraId: trovata.id, ruolo: { in: CARICHE_FIGT } },
        }),
        prisma.contattoSquadra.createMany({
          data: cariche.map((c) => ({ ...c, squadraId: trovata.id })),
        }),
      ]);
      aggiornate++;
      continue;
    }

    // un nome già preso da un'altra squadra: si tiene quello del portale
    const nome = nomiUsati.has(p.nome) ? p.nomeFigt : p.nome;
    nomiUsati.add(nome);
    await prisma.squadraEsterna.create({
      data: {
        ...dati,
        nome,
        telefono: p.telefono,
        email: p.email,
        contatti: { create: cariche },
      },
    });
    nuove++;
  }

  aggiorna();
  return {
    ok: `Dal portale FIGT: ${nuove} squadre nuove, ${aggiornate} aggiornate. Segna con la stella le preferite.`,
  };
}
