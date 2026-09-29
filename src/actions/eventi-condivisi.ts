'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { str, strOpt, type StatoForm } from '@/lib/form';
import { puoFareSondaggi } from '@/lib/sondaggi';
import { eAtleta, idoneoPer, inSquadra, isAdmin, serveCertificato } from '@/lib/domain';
import { annunciaSondaggioNuovo } from '@/actions/sondaggi';
import { accoda } from '@/lib/federazione-coda';
import { manda, profiloDi } from '@/lib/federazione';
import {
  contaPresenti,
  datiOrigine,
  descriviCosto,
  dovutoAllOrganizzatore,
  segnalaNumeri,
} from '@/lib/eventi-condivisi';

/**
 * Gli inviti delle squadre collegate alle loro attività
 * (docs/COLLEGAMENTO-SQUADRE.md). Si accettano o si rifiutano; lasciati lì
 * restano fra gli inviti, visibili solo a chi gestisce il calendario.
 */

async function invito(fd: FormData) {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo chi gestisce il calendario risponde agli inviti.' };
  const e = await prisma.event.findUnique({
    where: { id: str(fd, 'id') },
    include: { origineCollegamento: true },
  });
  if (!e || !e.origineCollegamento || !e.origineIdRemoto) return { errore: 'Invito non trovato.' };
  if (e.status !== 'INVITATA') return { errore: 'A questo invito si è già risposto.' };
  return { e, c: e.origineCollegamento, idRemoto: e.origineIdRemoto };
}

function aggiorna(id?: string) {
  revalidatePath('/calendario');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/calendario/${id}`);
}

/** Accettato: diventa una bozza nostra, e l'organizzatore lo sa. */
export async function accettaInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  // la tipologia è nostra: le loro possono chiamarsi in un altro modo
  const tipo = await prisma.tipoAttivita.findFirst({
    where: { id: str(fd, 'tipoId'), attivo: true },
    select: { id: true },
  });
  if (!tipo) return { errore: 'Scegli la tipologia fra le nostre.' };
  await prisma.event.update({
    where: { id: r.e.id },
    data: { status: 'CREATA', tipoId: tipo.id },
  });
  await impostaQuotaInterna(r.e.id, fd, profiloDi(r.c).nome);
  // chi ha risposto al sondaggio sulle partecipazioni entra già fra gli iscritti
  const dalSondaggio = await iscriviDalSondaggio(r.e.id, tipo.id);
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-risposta', { id: r.idRemoto, risposta: 'ACCETTATA' }).catch(
      () => null,
    );
  }
  // da qui in poi l'organizzatore riceve i nostri numeri
  await segnalaNumeri(r.e.id).catch(() => null);
  aggiorna(r.e.id);
  return {
    ok:
      `Accettato: ora è una bozza. Sistema quote e posti, poi rilasciala alla squadra.` +
      (dalSondaggio ? ` ${dalSondaggio}` : ''),
  };
}

/**
 * Rifiutato: l'invito sparisce, e l'organizzatore sa che non veniamo — e
 * perché, se lo si scrive.
 */
export async function rifiutaInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  const motivo = strOpt(fd, 'motivo')?.slice(0, 500) ?? null;
  await prisma.event.delete({ where: { id: r.e.id } });
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-risposta', {
      id: r.idRemoto,
      risposta: 'RIFIUTATA',
      motivo,
    }).catch(() => null);
  }
  aggiorna();
  const ritorno = str(fd, 'ritorno');
  if (ritorno.startsWith('/calendario')) redirect(ritorno);
  return { ok: `Invito rifiutato: ${profiloDi(r.c).nome} lo sa.` };
}

/**
 * Cancella: l'invito sparisce dalla nostra vista, **senza dirlo** a chi l'ha
 * mandato — per loro resta «invitato». Non lo si elimina: se lo si facesse, il
 * primo aggiornamento dell'organizzatore lo farebbe rinascere fra gli inviti.
 */
export async function nascondiInvitoEvento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await invito(fd);
  if ('errore' in r) return { errore: r.errore };
  await prisma.event.update({ where: { id: r.e.id }, data: { origineNascosta: true } });
  aggiorna(r.e.id);
  const ritorno = str(fd, 'ritorno');
  if (ritorno.startsWith('/calendario')) redirect(ritorno);
  return { ok: 'Invito tolto dalla vista. L’altra squadra non ne sa niente.' };
}

/** Un'attività di un'altra squadra che abbiamo accettato. */
async function accettata(fd: FormData) {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo chi gestisce il calendario lo decide.' };
  const e = await prisma.event.findUnique({
    where: { id: str(fd, 'id') },
    include: { origineCollegamento: true, rsvps: { select: { status: true, presente: true } } },
  });
  if (!e?.origineCollegamento || !e.origineIdRemoto || e.status === 'INVITATA') {
    return { errore: 'Attività non trovata.' };
  }
  return { e, c: e.origineCollegamento, idRemoto: e.origineIdRemoto };
}

/** Se mandare all'organizzatore anche i «forse», su questa attività. */
export async function impostaMandaForse(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await accettata(fd);
  if ('errore' in r) return { errore: r.errore };
  const si = str(fd, 'forse') === '1';
  await prisma.event.update({ where: { id: r.e.id }, data: { origineMandaForse: si } });
  await segnalaNumeri(r.e.id).catch(() => null);
  aggiorna(r.e.id);
  return {
    ok: si
      ? `${profiloDi(r.c).nome} vede anche i vostri «forse».`
      : `${profiloDi(r.c).nome} vede solo i vostri presenti.`,
  };
}

/**
 * «Paga»: un pagamento all'organizzatore, come la quota di un operatore. Lo si
 * segnala e resta da confermare finché chi incassa non lo vede arrivare; da lì
 * è nella sua cassa. Se ne fanno quanti servono: se dopo il primo si aggiunge
 * qualcuno, il dovuto cresce e il resto si paga con un altro.
 */
export async function segnalaVersamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await accettata(fd);
  if ('errore' in r) return { errore: r.errore };
  const { costo, metodi } = datiOrigine(r.e.origineDati);
  if (!costo) return { errore: 'L’organizzatore non ha chiesto niente.' };
  const importo = Math.round(Number(str(fd, 'importo').replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(importo) || importo <= 0 || importo > 100_000) {
    return { errore: 'Scrivi quanto avete pagato.' };
  }
  // il metodo è uno dei loro: quello che arriva dal modulo si controlla qui
  const metodo = metodi.find((m) => m.nome === str(fd, 'metodo'))?.nome ?? null;
  if (metodi.length > 0 && !metodo) return { errore: 'Scegli come avete pagato.' };
  const note = strOpt(fd, 'note')?.slice(0, 300) ?? null;
  const v = await prisma.versamentoSquadra.create({
    data: { eventId: r.e.id, importo, metodo, note },
  });
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-versato', {
      id: r.idRemoto,
      versamento: { id: v.id, importo, metodo, note },
    }).catch(() => null);
  }
  aggiorna(r.e.id);
  return {
    ok: `Pagamento di ${importo.toFixed(2)} € segnalato a ${profiloDi(r.c).nome}: resta da confermare finché non lo vedono arrivare.`,
  };
}

/** Una segnalazione sbagliata, tolta prima che l'organizzatore la confermi. */
export async function ritiraVersamento(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await accettata(fd);
  if ('errore' in r) return { errore: r.errore };
  const v = await prisma.versamentoSquadra.findFirst({
    where: { id: str(fd, 'versamento'), eventId: r.e.id },
  });
  if (!v) return { errore: 'Pagamento non trovato.' };
  if (v.confermatoIl) return { errore: 'L’incasso è già stato confermato: non si ritira più.' };
  await prisma.versamentoSquadra.delete({ where: { id: v.id } });
  if (r.c.stato === 'ATTIVO') {
    await accoda(r.c.id, 'evento-versato', {
      id: r.idRemoto,
      versamento: { id: idDelVersamento(v.id, r.e.id) },
      ritira: true,
    }).catch(() => null);
  }
  aggiorna(r.e.id);
  return { ok: 'Segnalazione ritirata.' };
}

/** L'id con cui l'altro lato conosce un versamento (quello di prima si chiama «precedente»). */
function idDelVersamento(id: string, eventId: string) {
  return id === `precedente-${eventId}` ? 'precedente' : id;
}

/**
 * La quota per i nostri, scelta accettando un invito a pagamento: una quota
 * dell'attività come quelle aggiunte col + nella scheda Pagamenti, nella cassa
 * scelta. Riaprendo la modifica la si ritrova lì, e lì la si cambia.
 */
async function impostaQuotaInterna(eventId: string, fd: FormData, organizzatore: string) {
  const importo = Number(str(fd, 'quotaInterna').replace(',', '.'));
  if (!Number.isFinite(importo) || importo <= 0) return;
  const cassaScelta = strOpt(fd, 'cassaQuota');
  const cassa = cassaScelta
    ? await prisma.cassa.findFirst({ where: { id: cassaScelta, attiva: true }, select: { id: true } })
    : null;
  const nome = `Quota ${organizzatore}`;
  await prisma.voceAttivita.create({
    data: { eventId, perEsterni: false, nome, importo, cassaId: cassa?.id ?? null, scelta: true },
  });
  if (cassa) {
    await prisma.quotaCassa.upsert({
      where: { eventId_cassaId: { eventId, cassaId: cassa.id } },
      create: { eventId, cassaId: cassa.id, descrizione: nome, importo },
      update: { descrizione: nome, importo },
    });
  } else {
    await prisma.event.update({ where: { id: eventId }, data: { costo: importo, dettaglioCosto: nome } });
  }
}

/**
 * «Partecipiamo?»: prima di accettare un invito, lo si chiede alla squadra.
 *
 * È un sondaggio di presenza come gli altri — ci sono, forse, non ci sono — e
 * resta legato all'invito: accettandolo, chi ha detto «ci sono» entra già
 * segnato presente e chi ha detto «forse» fra i forse. Se c'è già, ci si va.
 */
export async function apriSondaggioInvito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Solo chi può aprire sondaggi lo fa.' };
  const e = await prisma.event.findUnique({
    where: { id: str(fd, 'id') },
    include: { origineCollegamento: true, sondaggio: { select: { id: true } } },
  });
  if (!e?.origineCollegamento) return { errore: 'Invito non trovato.' };
  if (e.sondaggio) redirect(`/sondaggi/${e.sondaggio.id}`);

  const scadeIl = str(fd, 'scadeIl') ? new Date(str(fd, 'scadeIl')) : null;
  if (scadeIl && (Number.isNaN(scadeIl.getTime()) || scadeIl <= new Date())) {
    return { errore: 'La scadenza è già passata: mettila più avanti, o lasciala vuota.' };
  }
  const organizzatore = profiloDi(e.origineCollegamento).nome;
  const { costo } = datiOrigine(e.origineDati);
  const quando = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(e.inizio);
  const sondaggio = await prisma.sondaggio.create({
    data: {
      domanda: `Partecipiamo a «${e.titolo}» di ${organizzatore}?`,
      dettaglio: [
        `Ci invita ${organizzatore}: ${quando}${e.luogo ? `, ${e.luogo}` : ''}.`,
        costo ? `È a pagamento: ${descriviCosto(costo)}.` : null,
        strOpt(fd, 'nota'),
      ]
        .filter(Boolean)
        .join('\n'),
      tipo: 'PRESENZE',
      destinatari: 'SQUADRA',
      scadeIl,
      creatoDaId: me.id,
      eventoId: e.id,
      opzioni: {
        create: ['Ci sono', 'Forse', 'Non ci sono'].map((testo, ordine) => ({ testo, ordine })),
      },
    },
  });
  await annunciaSondaggioNuovo(sondaggio.id).catch(() => null);
  revalidatePath('/sondaggi');
  aggiorna(e.id);
  redirect(`/sondaggi/${sondaggio.id}`);
}

/**
 * Accettato l'invito, chi ha risposto al sondaggio entra fra gli iscritti:
 * «ci sono» presente, «forse» fra i forse. Con le regole di sempre — atleti in
 * squadra, col certificato valido se la tipologia lo chiede. Chi resta fuori
 * lo si dice, e lo si aggiunge a mano quando è a posto.
 */
async function iscriviDalSondaggio(eventId: string, tipoId: string): Promise<string | null> {
  const [s, tipo] = await Promise.all([
    prisma.sondaggio.findUnique({
      where: { eventoId: eventId },
      include: { opzioni: { include: { voti: { select: { userId: true } } } } },
    }),
    prisma.tipoAttivita.findUnique({
      where: { id: tipoId },
      select: { certMedico: true, certAgonistico: true },
    }),
  ]);
  if (!s || s.segreto) return null;
  const per = (ordine: number) => s.opzioni.find((o) => o.ordine === ordine)?.voti ?? [];
  const presenti = new Set(per(0).map((v) => v.userId));
  const forse = new Set(per(1).map((v) => v.userId).filter((id) => !presenti.has(id)));
  if (presenti.size + forse.size === 0) return null;

  const persone = await prisma.user.findMany({
    where: { id: { in: [...presenti, ...forse] } },
    select: {
      id: true,
      nome: true,
      callsign: true,
      stato: true,
      roles: true,
      certificates: { select: { status: true, scadeIl: true, tipo: true } },
    },
  });
  const esclusi: string[] = [];
  const righe: { eventId: string; userId: string; status: 'PRESENTE' | 'FORSE' }[] = [];
  for (const u of persone) {
    const chi = u.callsign ?? u.nome;
    if (!inSquadra(u.stato) || !eAtleta(u.roles)) {
      esclusi.push(chi);
      continue;
    }
    const presente = presenti.has(u.id);
    if (presente && serveCertificato(tipo) && !idoneoPer(u.certificates, tipo?.certAgonistico)) {
      esclusi.push(`${chi} (certificato)`);
      continue;
    }
    righe.push({ eventId, userId: u.id, status: presente ? 'PRESENTE' : 'FORSE' });
  }
  if (righe.length > 0) {
    await prisma.eventRsvp.createMany({ data: righe, skipDuplicates: true });
    await segnalaNumeri(eventId).catch(() => null);
  }
  await prisma.sondaggio.update({ where: { id: s.id }, data: { chiusoIl: s.chiusoIl ?? new Date() } });
  return (
    `Dal sondaggio: ${righe.length} ${righe.length === 1 ? 'persona iscritta' : 'persone iscritte'}.` +
    (esclusi.length ? ` Non iscritti: ${esclusi.join(', ')}.` : '')
  );
}

/**
 * Proponiamo una nostra squadra collegata per un'attività di un'altra squadra
 * che ci ha dato il permesso di invitarne altre. L'invito lo fa chi organizza:
 * se non è ancora collegato con quella squadra, le chiediamo un link per lui,
 * e lui le manda la richiesta di collegamento — l'invito parte quando la
 * accettano.
 */
export async function proponiSquadra(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const r = await accettata(fd);
  if ('errore' in r) return { errore: r.errore };
  if (!r.e.origineInvitaAltri) return { errore: 'Su questa attività non potete invitare altre squadre.' };
  if (r.c.stato !== 'ATTIVO') return { errore: 'Il collegamento con chi organizza non c’è più.' };
  const terza = await prisma.collegamentoSquadra.findUnique({
    where: { id: str(fd, 'collegamentoId') },
  });
  if (!terza || terza.stato !== 'ATTIVO' || terza.id === r.c.id) {
    return { errore: 'Scegli una squadra collegata con noi.' };
  }
  const organizzatore = profiloDi(r.c).nome;
  const nome = profiloDi(terza).nome;
  const corpo = { id: r.idRemoto, squadra: { indirizzo: terza.indirizzo, nome } };
  type Esito = { stato?: string; nome?: string };
  let esito = await manda<Esito>(r.c.indirizzo, 'evento-proponi', corpo);
  if (esito.ok && esito.dati.stato === 'SERVE_GETTONE') {
    // non si conoscono: ci facciamo dare da loro un link per l'organizzatore
    const g = await manda<{ token?: string }>(terza.indirizzo, 'gettone-collegamento', {
      organizzatore,
      attivita: r.e.titolo,
    });
    if (!g.ok || !g.dati.token) {
      return { errore: `${nome} non risponde: ${g.ok ? 'nessun link' : g.errore}. Riprova più tardi.` };
    }
    esito = await manda<Esito>(r.c.indirizzo, 'evento-proponi', { ...corpo, token: g.dati.token });
  }
  if (!esito.ok) return { errore: `${organizzatore}: ${esito.errore}.` };
  aggiorna(r.e.id);
  switch (esito.dati.stato) {
    case 'INVITATA':
      return { ok: `${organizzatore} ha invitato ${nome}: l’attività arriva fra i loro inviti.` };
    case 'GIA_INVITATA':
      return { ok: `${nome} è già invitata.` };
    case 'COLLEGAMENTO_RICHIESTO':
      return {
        ok: `${organizzatore} non era collegata con ${nome}: le ha chiesto il collegamento. Quando ${nome} lo accetta, l’invito parte da solo.`,
      };
    case 'IN_ATTESA_NOSTRA':
      return {
        ok: `${nome} aveva già chiesto il collegamento a ${organizzatore}: quando lo accettano, l’invito parte da solo.`,
      };
    default:
      return { errore: 'Risposta inattesa dall’organizzatore.' };
  }
}
