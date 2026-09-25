'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import {
  eAtleta,
  idoneoPer,
  inSquadra,
  isAdmin,
  serveCertificato,
  vedeAttivitaSquadra,
} from '@/lib/domain';
import type { Role } from '@prisma/client';
import { data, enumVal, str, strOpt, bool, type StatoForm } from '@/lib/form';
import {
  eAperto,
  loRiguarda,
  puoFareSondaggi,
  quantoManca,
  registraVoto,
  risultato,
} from '@/lib/sondaggi';
import { avvisaPersona } from '@/lib/avvisi';
import { avvisaChiusuraSondaggio } from '@/lib/sondaggi-chiusura';
import { copiaAllegato, eliminaAllegato as cancellaDalDisco, salvaAllegato } from '@/lib/storage';
import { gestisceSegnalazioni } from '@/lib/segnalazioni-canali';
import { REGOLE_BANNER } from '@/lib/bacheche';

const TIPI = ['TESTO', 'DATA', 'PRESENZE', 'DECISIONE'] as const;

/** Le due risposte di una decisione: sempre queste, in quest'ordine. */
const SI_NO = ['Sì', 'No'];
const DESTINATARI = ['SQUADRA', 'NUOVI', 'TUTTI'] as const;

/**
 * Modificare, chiudere, riaprire ed eliminare un sondaggio lo fa chi l'ha
 * aperto: la domanda è sua, e decide lui quando ha la risposta che cercava. Un
 * altro che lo chiude a metà gli toglie la decisione di mano. L'admin sì,
 * anche su quelli degli altri: è chi rimette a posto quando serve.
 */
const SOLO_AUTORE = 'Lo può fare solo chi ha aperto il sondaggio, o l’admin.';
const puoGovernare = (me: { id: string; roles: Role[] }, s: { creatoDaId: string }) =>
  s.creatoDaId === me.id || isAdmin(me.roles);

function aggiorna(id?: string) {
  revalidatePath('/sondaggi');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/sondaggi/${id}`);
}

/**
 * La copertina che arriva dal modulo: una foto nuova prende il posto della
 * vecchia, «togli» la toglie, altrimenti resta com'è. Il titolo va con lei.
 */
async function copertinaDalModulo(
  fd: FormData,
): Promise<
  | { errore: string }
  | { dati: { copertinaPath?: string | null; copertinaTipo?: string | null; copertinaTitolo: string | null } }
> {
  const copertinaTitolo = strOpt(fd, 'copertinaTitolo')?.slice(0, 120) ?? null;
  const file = fd.get('copertina');
  if (file instanceof File && file.size > 0) {
    try {
      const salvato = await salvaAllegato(file, 'sondaggi', REGOLE_BANNER);
      return {
        dati: { copertinaPath: salvato.filePath, copertinaTipo: salvato.mimeType, copertinaTitolo },
      };
    } catch (e) {
      return { errore: e instanceof Error ? e.message : 'Copertina non caricata.' };
    }
  }
  if (bool(fd, 'togliCopertina')) {
    return { dati: { copertinaPath: null, copertinaTipo: null, copertinaTitolo: null } };
  }
  return { dati: { copertinaTitolo } };
}

/**
 * Crea un sondaggio e lo annuncia a chi riguarda.
 *
 * Le opzioni arrivano come righe del modulo: il testo di ognuna e, per le
 * domande sulle date, il giorno e l'ora. Le righe vuote si buttano — chi
 * compila lascia sempre un paio di caselle in bianco in fondo, e trasformarle
 * in opzioni «senza nome» renderebbe il sondaggio illeggibile.
 */
export async function creaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) {
    return { errore: 'Solo l’admin e chi schiera la squadra possono aprire un sondaggio.' };
  }

  const domanda = str(fd, 'domanda');
  if (!domanda) return { errore: 'Scrivi la domanda: è quello che la gente legge nella notifica.' };

  const tipo = enumVal(fd, 'tipo', TIPI, 'TESTO');
  const scadeIl = data(fd, 'scadeIl');
  if (scadeIl && scadeIl <= new Date()) {
    return { errore: 'La scadenza è già passata: mettila più avanti, o lasciala vuota.' };
  }

  const testi = fd.getAll('opzioneTesto').map((v) => v.toString().trim());
  const quandi = fd.getAll('opzioneQuando').map((v) => v.toString().trim());

  const opzioni = testi
    .map((testo, i) => ({
      testo,
      quando: quandi[i] ? new Date(quandi[i]) : null,
      ordine: i,
    }))
    // una riga conta se ha un testo o una data: sulle domande di data il testo
    // si scrive da sé, e chiederlo due volte sarebbe una pignoleria
    .filter((o) => o.testo !== '' || o.quando !== null)
    .map((o) => ({
      ...o,
      testo: o.testo || (o.quando ? o.quando.toLocaleString('it-IT') : ''),
    }));

  // una decisione è sì o no, sempre: le risposte non passano dal modulo
  const risposte =
    tipo === 'DECISIONE' ? SI_NO.map((testo, ordine) => ({ testo, quando: null, ordine })) : opzioni;

  if (risposte.length < 2) {
    return { errore: 'Servono almeno due risposte possibili: con una sola non c’è niente da scegliere.' };
  }

  const copertina = await copertinaDalModulo(fd);
  if ('errore' in copertina) return { errore: copertina.errore };

  /*
   * Nato da una segnalazione: si lega a quella, e se non si è caricata un'altra
   * copertina prende la foto scelta fra le sue. **La foto si copia**: gli
   * allegati di una segnalazione li vede solo chi la gestisce, il sondaggio lo
   * vede la squadra — deve avere la sua.
   */
  const segnalazioneId = strOpt(fd, 'segnalazioneId');
  let daSegnalazione: { segnalazioneId: string; copertinaPath?: string; copertinaTipo?: string } | null =
    null;
  if (segnalazioneId) {
    if (!gestisceSegnalazioni(me.roles)) {
      return { errore: 'Da una segnalazione nasce un sondaggio solo per mano di chi la gestisce.' };
    }
    const segnalazione = await prisma.segnalazioneCanale.findUnique({
      where: { id: segnalazioneId },
      include: { allegati: { where: { mimeType: { startsWith: 'image/' } } } },
    });
    if (!segnalazione) return { errore: 'Segnalazione non trovata.' };
    daSegnalazione = { segnalazioneId };
    const foto = segnalazione.allegati.find((a) => a.id === strOpt(fd, 'fotoSegnalazione'));
    if (foto && !copertina.dati.copertinaPath) {
      daSegnalazione.copertinaPath = await copiaAllegato(foto.filePath, 'sondaggi');
      daSegnalazione.copertinaTipo = foto.mimeType;
    }
  }

  const sondaggio = await prisma.sondaggio.create({
    data: {
      ...copertina.dati,
      ...daSegnalazione,
      domanda,
      dettaglio: strOpt(fd, 'dettaglio'),
      tipo,
      destinatari: enumVal(fd, 'destinatari', DESTINATARI, 'SQUADRA'),
      // su una decisione si risponde una volta sola
      sceltaMultipla: tipo === 'DECISIONE' ? false : bool(fd, 'sceltaMultipla'),
      segreto: bool(fd, 'segreto'),
      proposteAperte: tipo === 'TESTO' && bool(fd, 'proposteAperte'),
      scadeIl,
      creatoDaId: me.id,
      opzioni: { create: risposte },
    },
  });

  await annuncia(sondaggio.id);

  aggiorna(sondaggio.id);
  redirect(`/sondaggi/${sondaggio.id}`);
}

/**
 * Corregge un sondaggio già aperto.
 *
 * Si cambia tutto tranne il tipo: le risposte date a «chi viene?» non vogliono
 * dire niente sotto «quando giochiamo?». Ogni risposta del modulo porta il suo
 * id: **correggerla tiene i voti** — un refuso nella data non deve far
 * rivotare tutti — mentre toglierla li cancella con lei.
 *
 * Non si riannuncia: chi aveva la notifica ci ritrova il sondaggio corretto, e
 * una seconda notifica per un refuso è rumore.
 */
export async function modificaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) {
    return { errore: 'Solo l’admin e chi schiera la squadra possono modificare un sondaggio.' };
  }

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: { opzioni: { select: { id: true } }, voti: { select: { userId: true } } },
  });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!puoGovernare(me, s)) return { errore: SOLO_AUTORE };
  // chiuso è chiuso: il risultato non si ritocca a cose fatte. Chi deve
  // correggere qualcosa lo riapre, e si vede che l'ha riaperto
  if (!eAperto(s)) return { errore: 'Il sondaggio è chiuso: riaprilo per modificarlo.' };

  const domanda = str(fd, 'domanda');
  if (!domanda) return { errore: 'La domanda non può restare vuota.' };

  const scadeIl = data(fd, 'scadeIl');
  const scadenzaCambiata = (scadeIl?.getTime() ?? null) !== (s.scadeIl?.getTime() ?? null);
  if (scadeIl && scadenzaCambiata && scadeIl <= new Date()) {
    return { errore: 'La scadenza è già passata: mettila più avanti, o lasciala vuota.' };
  }

  const sceltaMultipla = s.tipo === 'DECISIONE' ? false : bool(fd, 'sceltaMultipla');

  // spegnere il segreto con dei voti dentro svelerebbe chi ha votato cosa:
  // chi ha risposto l'ha fatto contando che restasse segreto
  const segreto = bool(fd, 'segreto');
  if (s.segreto && !segreto && s.voti.length > 0) {
    return { errore: 'Qualcuno ha già votato in segreto: il voto segreto non si può più togliere.' };
  }

  if (s.sceltaMultipla && !sceltaMultipla) {
    // chi ha spuntato due risposte ne avrebbe due su una domanda a scelta
    // singola: il conto non tornerebbe più
    const perPersona = new Map<string, number>();
    for (const v of s.voti) perPersona.set(v.userId, (perPersona.get(v.userId) ?? 0) + 1);
    if ([...perPersona.values()].some((n) => n > 1)) {
      return {
        errore: 'Qualcuno ha già spuntato più risposte: la scelta multipla non si può più togliere.',
      };
    }
  }

  const ids = fd.getAll('opzioneId').map((v) => v.toString());
  const testi = fd.getAll('opzioneTesto').map((v) => v.toString().trim());
  const quandi = fd.getAll('opzioneQuando').map((v) => v.toString().trim());
  const sue = new Set(s.opzioni.map((o) => o.id));

  const righe = ids
    .map((oid, i) => {
      const quando = s.tipo === 'DATA' && quandi[i] ? new Date(quandi[i]) : null;
      const testo = s.tipo === 'DATA' ? (quando ? quando.toLocaleString('it-IT') : '') : testi[i];
      // un id che non è di questo sondaggio vale come risposta nuova
      return { id: sue.has(oid) ? oid : null, testo: testo ?? '', quando };
    })
    .filter((r) => r.testo !== '');

  // una decisione resta sì o no: le sue due risposte non si toccano
  if (s.tipo === 'DECISIONE') {
    righe.splice(0, righe.length, ...s.opzioni.map((o) => ({ id: o.id, testo: '', quando: null })));
  }

  if (righe.length < 2) {
    return { errore: 'Servono almeno due risposte possibili: con una sola non c’è niente da scegliere.' };
  }

  const copertina = await copertinaDalModulo(fd);
  if ('errore' in copertina) return { errore: copertina.errore };
  // la foto vecchia se ne va dal disco quando ne arriva un'altra o la si toglie
  const vecchiaCopertina =
    copertina.dati.copertinaPath !== undefined ? s.copertinaPath : null;

  const tenute = new Set(righe.flatMap((r) => (r.id ? [r.id] : [])));
  const tolte = s.opzioni.filter((o) => !tenute.has(o.id)).map((o) => o.id);

  await prisma.$transaction([
    prisma.sondaggio.update({
      where: { id },
      data: {
        ...copertina.dati,
        domanda,
        dettaglio: strOpt(fd, 'dettaglio'),
        destinatari: enumVal(fd, 'destinatari', DESTINATARI, s.destinatari),
        sceltaMultipla,
        segreto,
        proposteAperte: s.tipo === 'TESTO' && bool(fd, 'proposteAperte'),
        scadeIl,
        // una scadenza spostata avanti riapre il voto: alla prossima chiusura
        // l'avviso riparte
        ...(scadenzaCambiata && (!scadeIl || scadeIl > new Date())
          ? { chiusuraAvvisataIl: null }
          : {}),
      },
    }),
    // le risposte tolte si portano via i loro voti (in cascata)
    prisma.opzioneSondaggio.deleteMany({ where: { id: { in: tolte } } }),
    ...righe.map((r, ordine) =>
      r.id
        ? prisma.opzioneSondaggio.update({
            where: { id: r.id },
            // di una decisione si tiene il testo com'è: si riscrive solo l'ordine
            data: s.tipo === 'DECISIONE' ? { ordine } : { testo: r.testo, quando: r.quando, ordine },
          })
        : prisma.opzioneSondaggio.create({
            data: { sondaggioId: id, testo: r.testo, quando: r.quando, ordine },
          }),
    ),
  ]);

  if (vecchiaCopertina) await cancellaDalDisco(vecchiaCopertina);

  aggiorna(id);
  return { ok: 'Sondaggio aggiornato.' };
}

/**
 * L'annuncio a chi riguarda, con dentro quanto manca.
 *
 * Il conto alla rovescia nella notifica è una fotografia: dice «mancano 3
 * giorni» nel momento in cui parte, e non si aggiorna più. È il motivo per cui
 * dentro il gestionale il tempo scorre davvero — lì la notifica ci porta.
 *
 * Non si avvisa chi l'ha scritto: sa già cosa ha chiesto.
 */
async function annuncia(id: string) {
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: { opzioni: { orderBy: { ordine: 'asc' }, select: { id: true, testo: true } } },
  });
  if (!s) return;

  const persone = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] } },
    select: { id: true, stato: true },
  });

  const manca = quantoManca(s.scadeIl);
  const dove = `/sondaggi/${s.id}`;

  /*
   * I pulsanti sotto la notifica: solo per «chi viene?».
   *
   * Sono le uniche risposte che si danno senza guardare niente — ci sono, non
   * ci sono — e sono proprio quelle che uno rimanda ad aprire l'applicazione e
   * poi non dà piu'. Su una data, invece, la risposta dipende da cosa hanno
   * detto gli altri: quella vuole la pagina, altrimenti il sondaggio non
   * serviva a niente.
   *
   * **«Forse» non e' un pulsante**: ne entrano due, e «forse» e' la risposta
   * di chi ci deve pensare — chi ci pensa apre.
   */
  const azioni =
    s.tipo === 'PRESENZE' || s.tipo === 'DECISIONE'
      ? [s.opzioni.at(0), s.opzioni.at(-1)]
          .filter((o) => o !== undefined)
          .map((o) => ({ id: o.id, testo: o.testo }))
      : undefined;

  await Promise.all(
    persone
      .filter((p) => p.id !== s.creatoDaId && loRiguarda(s.destinatari, p.stato))
      .map((p) =>
        avvisaPersona(p.id, {
          titolo: 'C’è una domanda per te',
          testo: manca ? `${s.domanda} · mancano ${manca}` : s.domanda,
          url: dove,
          tag: `sondaggio-${s.id}`,
          azioni,
          whatsapp: `Zero Dark Ops — c’è una domanda per te

${s.domanda}${s.dettaglio ? `\n${s.dettaglio}` : ''}
${manca ? `\nSi vota entro ${manca}.` : ''}
Rispondi dal gestionale, in «Sondaggi».`,
        }),
      ),
  );
}

/**
 * Il voto di una persona, mandato dalla pagina a ogni clic.
 *
 * **Si riscrive tutto ogni volta.** Votare di nuovo cancella le scelte di
 * prima e mette quelle nuove: cambiare idea è normale — uno scopre di essere
 * libero anche sabato — e la differenza fra «ha cambiato idea» e «ha votato
 * due volte» non la deve fare chi legge il risultato. Nessuna scelta vuol dire
 * che la risposta si ritira: è l'ultima spunta tolta.
 */
export async function vota(sondaggioId: string, scelte: string[]): Promise<StatoForm> {
  const me = await requireUser();

  const esito = await registraVoto(me, sondaggioId, scelte, true);
  if (!esito.ok) return { errore: esito.errore };

  aggiorna(sondaggioId);
  return { ok: scelte.length > 0 ? 'Salvato.' : 'Risposta tolta.' };
}

/**
 * Una risposta aggiunta da chi risponde, sui sondaggi che lo permettono.
 *
 * Chi la propone la vuole: la proposta vale anche come suo voto — su una
 * domanda a risposta singola prende il posto di quello di prima. Una proposta
 * uguale a una che c'è già non si aggiunge due volte: si vota quella.
 */
export async function proponiRisposta(sondaggioId: string, testo: string): Promise<StatoForm> {
  const me = await requireUser();
  const pulito = testo.trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!pulito) return { errore: 'Scrivi la tua proposta.' };

  const s = await prisma.sondaggio.findUnique({
    where: { id: sondaggioId },
    include: {
      opzioni: { select: { id: true, testo: true, ordine: true } },
      voti: { where: { userId: me.id }, select: { opzioneId: true } },
    },
  });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!s.proposteAperte) return { errore: 'Su questo sondaggio non si aggiungono risposte.' };
  if (!loRiguarda(s.destinatari, me.stato)) return { errore: 'Questo sondaggio non è per te.' };
  if (!eAperto(s)) return { errore: 'Il sondaggio è chiuso.' };

  const uguale = s.opzioni.find((o) => o.testo.toLowerCase() === pulito.toLowerCase());
  const opzioneId =
    uguale?.id ??
    (
      await prisma.opzioneSondaggio.create({
        data: {
          sondaggioId,
          testo: pulito,
          ordine: Math.max(-1, ...s.opzioni.map((o) => o.ordine)) + 1,
          propostaDaId: me.id,
        },
      })
    ).id;

  const miei = s.voti.map((v) => v.opzioneId);
  const scelte = s.sceltaMultipla ? [...new Set([...miei, opzioneId])] : [opzioneId];
  const esito = await registraVoto(me, sondaggioId, scelte);
  if (!esito.ok) return { errore: esito.errore };

  aggiorna(sondaggioId);
  return { ok: uguale ? 'C’era già: l’hai votata.' : 'Proposta aggiunta, e votata.' };
}

/** Chiude un sondaggio prima della scadenza: la decisione è già presa. */
export async function chiudiSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!puoGovernare(me, s)) return { errore: SOLO_AUTORE };
  if (s.chiusoIl) return { errore: 'Era già chiuso.' };

  await prisma.sondaggio.update({ where: { id }, data: { chiusoIl: new Date() } });
  // chi l'ha ricevuto sa com'è andata, senza tornare a guardare
  await avvisaChiusuraSondaggio(id);

  aggiorna(id);
  return { ok: 'Sondaggio chiuso: resta nello storico con il suo risultato.' };
}

/** Riapre un sondaggio chiuso per sbaglio, se la scadenza non è passata. */
export async function riapriSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!puoGovernare(me, s)) return { errore: SOLO_AUTORE };
  if (s.scadeIl && s.scadeIl <= new Date()) {
    return { errore: 'La scadenza è passata: per riaprirlo spostala più avanti.' };
  }

  // riaperto, l'avviso di chiusura si rimanda con il risultato nuovo
  await prisma.sondaggio.update({
    where: { id },
    data: { chiusoIl: null, chiusuraAvvisataIl: null },
  });
  aggiorna(id);
  return { ok: 'Sondaggio riaperto.' };
}

export async function eliminaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({ where: { id } });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (!puoGovernare(me, s)) return { errore: SOLO_AUTORE };

  await prisma.sondaggio.delete({ where: { id } });
  if (s.copertinaPath) await cancellaDalDisco(s.copertinaPath);
  revalidatePath('/sondaggi');
  revalidatePath('/dashboard');
  redirect('/sondaggi');
}

/**
 * Dal sondaggio nasce l'attività.
 *
 * È il punto di tutto: la domanda serviva a decidere, e quello che si decide
 * finisce nel calendario senza ricopiarlo a mano. Dalla data che ha vinto
 * nasce l'attività; da un sondaggio sulle presenze nasce con dentro **chi ha
 * detto di esserci**, già segnato.
 *
 * L'attività nasce in bozza, sempre: le manca tutto il resto — il campo, la
 * quota, chi ne risponde — e rilasciarla senza guardarla vorrebbe dire
 * mandare alla squadra una giornata a metà.
 */
export async function creaEventoDaSondaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return { errore: 'Non puoi creare attività da un sondaggio.' };

  const id = str(fd, 'id');
  const s = await prisma.sondaggio.findUnique({
    where: { id },
    include: {
      opzioni: { include: { voti: { select: { userId: true } } }, orderBy: { ordine: 'asc' } },
    },
  });
  if (!s) return { errore: 'Sondaggio non trovato.' };
  if (s.eventoId) return { errore: 'Da questo sondaggio è già nata un’attività.' };

  const esito = risultato(s.opzioni);
  // si può forzare quale opzione vale, e serve: a pari merito decide una
  // persona, non il gestionale
  const sceltaId = strOpt(fd, 'opzioneId') ?? esito.vincitrice;
  const scelta = s.opzioni.find((o) => o.id === sceltaId);
  if (!scelta) {
    return {
      errore: esito.pari
        ? 'Due risposte sono a pari merito: scegli tu quale vale.'
        : 'Nessuno ha ancora votato: non c’è una risposta da cui partire.',
    };
  }

  const inizio = scelta.quando ?? s.scadeIl ?? new Date();

  const evento = await prisma.event.create({
    data: {
      titolo: str(fd, 'titolo') || s.domanda,
      descrizione: s.dettaglio,
      inizio,
      fine: scelta.fino,
      status: 'CREATA',
      createdById: me.id,
      stagioneId: (await prisma.stagione.findFirst({ where: { corrente: true } }))?.id ?? null,
    },
  });

  /*
   * Chi ha votato la risposta che vale entra già segnato come presente.
   *
   * Sui sondaggi di presenza è chi ha detto «ci sono»; su quelli di data è chi
   * ha detto di poter venire quel giorno — e quel giorno è la giocata. Iscriverli
   * a mano uno per uno, dopo averglielo appena chiesto, era lavoro doppio; chi
   * poi non viene si toglie dall'attività come sempre.
   */
  // su un voto segreto i nomi non escono nemmeno da qui: chi ha risposto l'ha
  // fatto contando che restasse fra sé e il conteggio
  const esclusi: string[] = [];
  let segnati = 0;
  if (!s.segreto && scelta.voti.length > 0) {
    /*
     * Entra solo chi potrebbe entrare anche aggiunto a mano: le stesse regole
     * di «Aggiungi partecipanti» (iscriviOperatori). Chi resta fuori si dice,
     * con il perché, e lo si aggiunge a mano quando è a posto.
     *
     * - chi è del club ma non è atleta in campo non ci va;
     * - chi è in squadra ci va con il certificato valido: l'attività nasce
     *   senza tipologia, e senza tipologia il certificato si chiede;
     * - i nuovi entrano con un prezzo deciso dall'admin, e un'attività appena
     *   nata un prezzo non ce l'ha ancora.
     */
    const persone = await prisma.user.findMany({
      where: {
        id: { in: scelta.voti.map((v) => v.userId) },
        stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
      },
      select: {
        id: true,
        nome: true,
        cognome: true,
        callsign: true,
        stato: true,
        roles: true,
        certificates: { select: { status: true, scadeIl: true, tipo: true } },
      },
    });
    const chi = (u: (typeof persone)[number]) => u.callsign ?? `${u.nome} ${u.cognome}`;
    const ammessi: string[] = [];
    for (const u of persone) {
      if (!vedeAttivitaSquadra(u.stato)) esclusi.push(`${chi(u)} (nuovo: prima il prezzo)`);
      else if (!eAtleta(u.roles)) esclusi.push(`${chi(u)} (non è atleta)`);
      else if (inSquadra(u.stato) && serveCertificato(null) && !idoneoPer(u.certificates, false))
        esclusi.push(`${chi(u)} (certificato)`);
      else ammessi.push(u.id);
    }
    if (ammessi.length > 0) {
      await prisma.eventRsvp.createMany({
        data: ammessi.map((userId) => ({ eventId: evento.id, userId, status: 'PRESENTE' as const })),
        skipDuplicates: true,
      });
    }
    segnati = ammessi.length;
  }

  await prisma.sondaggio.update({
    where: { id },
    data: { eventoId: evento.id, chiusoIl: s.chiusoIl ?? new Date() },
  });
  // se l'ha chiuso questo, parte l'avviso; se era già chiuso, era già partito
  await avvisaChiusuraSondaggio(id);

  aggiorna(id);
  revalidatePath('/calendario');
  // se qualcuno è rimasto fuori lo si dice qui, sul sondaggio — che ha già il
  // link all'attività: portarci dritti farebbe perdere il perché
  if (esclusi.length > 0) {
    return {
      ok: `Attività creata in bozza con ${segnati} ${segnati === 1 ? 'persona' : 'persone'} dentro. Non segnati: ${esclusi.join(', ')}. Aggiungili dall'attività quando sono a posto.`,
    };
  }
  redirect(`/calendario/${evento.id}`);
}

/** Chi ha votato cosa: lo vede chi ha fatto la domanda. */
export async function chiHaVotato(sondaggioId: string) {
  const me = await requireUser();
  if (!puoFareSondaggi(me.roles)) return null;
  const s = await prisma.sondaggio.findUnique({ where: { id: sondaggioId }, select: { segreto: true } });
  if (!s || s.segreto) return null;

  const voti = await prisma.votoSondaggio.findMany({
    where: { sondaggioId },
    select: {
      opzioneId: true,
      utente: { select: { id: true, nome: true, cognome: true, callsign: true, stato: true } },
    },
  });

  return voti.map((v) => ({
    opzioneId: v.opzioneId,
    nome: v.utente.callsign ?? `${v.utente.nome} ${v.utente.cognome}`,
    diSquadra: inSquadra(v.utente.stato),
  }));
}
