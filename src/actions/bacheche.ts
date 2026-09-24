'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { PubblicoBacheca } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser, type SessionUser } from '@/lib/auth';
import {
  EMOJI_BACHECA,
  REGOLE_ALLEGATO_BACHECA,
  REGOLE_BANNER,
  destinatariBacheca,
  gestisceBacheche,
  manigliaDocumento,
  moderaBacheca,
  puoCreareBacheche,
  scriveInBacheca,
  vedeBacheca,
} from '@/lib/bacheche';
import { citabili, citatiIn } from '@/lib/note';
import { iconaBacheca } from '@/lib/icone-bacheca';
import { firma } from '@/lib/segreti';
import { avvisaConEsito, avvisa } from '@/lib/push';
import { nomeCompleto } from '@/lib/format';
import { eliminaAllegato as cancellaDalDisco, salvaAllegato } from '@/lib/storage';
import { bool, enumVal, str, strOpt, type StatoForm } from '@/lib/form';

/**
 * Le bacheche: comunicazioni che restano, e si sa chi le ha lette.
 *
 * Tutte le azioni passano da `lib/bacheche` per sapere chi può cosa: chi vede,
 * chi scrive, chi modera. Qui si decide solo **cosa succede**.
 */

const PUBBLICI: PubblicoBacheca[] = ['SQUADRA', 'NUOVI', 'TUTTI', 'SELEZIONE'];

const conRegole = {
  lettori: { select: { userId: true } },
  scrittori: { select: { userId: true } },
} as const;

function aggiorna(bachecaId?: string) {
  revalidatePath('/bacheca');
  if (bachecaId) revalidatePath(`/bacheca/${bachecaId}`);
  // il pallino del menu conta i messaggi da leggere, e il menu sta nel layout
  revalidatePath('/', 'layout');
}

async function bachecaPer(id: string) {
  return prisma.bacheca.findUnique({ where: { id }, include: conRegole });
}

/** Il messaggio con la sua bacheca, per sapere chi può toccarlo. */
async function messaggioPer(id: string) {
  return prisma.messaggioBacheca.findUnique({
    where: { id },
    include: { bacheca: { include: conRegole } },
  });
}

/** Le chiocciole di una bacheca: persone che la vedono, e i suoi documenti. */
async function citabiliIn(b: NonNullable<Awaited<ReturnType<typeof bachecaPer>>>) {
  const [persone, utenti] = await Promise.all([
    citabili(),
    prisma.user.findMany({
      where: { stato: { not: 'DISABILITATO' } },
      select: { id: true, stato: true, roles: true },
    }),
  ]);
  const chiVede = new Set(utenti.filter((u) => vedeBacheca(b, u)).map((u) => u.id));
  return persone.filter((p) => chiVede.has(p.id));
}

// ------------------------------------------------------------ le bacheche

const idScelti = (fd: FormData, k: string) => [
  ...new Set(fd.getAll(k).map((v) => v.toString()).filter(Boolean)),
];

/**
 * Crea o configura una bacheca.
 *
 * Il moderatore, se non lo si sceglie, è chi la crea: una bacheca senza
 * nessuno che tenga l'ordine è una bacheca dove il messaggio sbagliato resta
 * lì finché non passa l'admin.
 */
export async function salvaBacheca(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoCreareBacheche(me.roles)) return { errore: 'Le bacheche le crea l’admin.' };

  const id = strOpt(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Dai un nome alla bacheca: «Comunicazioni», «Direttivo»…' };

  const pubblico = enumVal(fd, 'pubblico', PUBBLICI, 'SQUADRA');
  const lettori = pubblico === 'SELEZIONE' ? idScelti(fd, 'lettori') : [];
  if (pubblico === 'SELEZIONE' && lettori.length === 0) {
    return { errore: 'Una bacheca per persone scelte ha bisogno di almeno una persona.' };
  }
  // scrivere e moderare e' di chi e' in squadra: chi arriva nel modulo senza
  // esserlo si scarta qui, non solo nell'elenco
  const inSquadra = new Set(
    (
      await prisma.user.findMany({
        where: { id: { in: [...idScelti(fd, 'scrittori'), str(fd, 'moderatoreId')].filter(Boolean) } },
        select: { id: true, stato: true },
      })
    )
      .filter((u) => gestisceBacheche(u.stato))
      .map((u) => u.id),
  );
  const scrittori = idScelti(fd, 'scrittori').filter((u) => inSquadra.has(u));
  const scelto = strOpt(fd, 'moderatoreId');
  if (scelto && !inSquadra.has(scelto)) {
    return { errore: 'Il moderatore dev’essere una persona in squadra: un nuovo la bacheca la legge.' };
  }
  const moderatoreId = scelto ?? (id ? null : me.id);

  const dati = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    pubblico,
    // solo fra quelle previste: un valore qualsiasi finirebbe nel menu di tutti
    icona: iconaBacheca(strOpt(fd, 'icona')),
    moderatoreId,
    conNotifica: bool(fd, 'conNotifica'),
  };

  const bachecaId = await prisma.$transaction(async (tx) => {
    const b = id
      ? await tx.bacheca.update({ where: { id }, data: dati })
      : await tx.bacheca.create({ data: { ...dati, creataDaId: me.id } });

    await tx.lettoreBacheca.deleteMany({ where: { bachecaId: b.id } });
    await tx.scrittoreBacheca.deleteMany({ where: { bachecaId: b.id } });
    if (lettori.length) {
      await tx.lettoreBacheca.createMany({ data: lettori.map((userId) => ({ bachecaId: b.id, userId })) });
    }
    if (scrittori.length) {
      await tx.scrittoreBacheca.createMany({
        data: scrittori.map((userId) => ({ bachecaId: b.id, userId })),
      });
    }
    return b.id;
  });

  aggiorna(bachecaId);
  if (!id) redirect(`/bacheca/${bachecaId}`);
  return { ok: 'Bacheca aggiornata.' };
}

export async function eliminaBacheca(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!puoCreareBacheche(me.roles)) return { errore: 'Le bacheche le elimina l’admin.' };

  const id = str(fd, 'id');
  const b = await prisma.bacheca.findUnique({
    where: { id },
    include: {
      allegati: { select: { filePath: true } },
      messaggi: { select: { bannerPath: true } },
    },
  });
  if (!b) return { errore: 'Bacheca non trovata.' };

  await prisma.bacheca.delete({ where: { id } });
  // i file se ne vanno con lei: restare sul disco senza una riga che li
  // indichi vorrebbe dire restarci per sempre
  await Promise.all([
    ...b.allegati.map((a) => cancellaDalDisco(a.filePath)),
    ...b.messaggi.filter((m) => m.bannerPath).map((m) => cancellaDalDisco(m.bannerPath!)),
  ]);

  aggiorna();
  redirect('/bacheca');
}

// --------------------------------------------------------------- i messaggi

/**
 * Scrive o corregge un messaggio.
 *
 * Nasce **bozza**: lo vedono solo quelli che scrivono in quella bacheca, e la
 * notifica parte al rilascio. Dopo il rilascio si può ancora correggere — un
 * orario sbagliato va sistemato, non ripubblicato — e la correzione lascia la
 * data dell'ultima modifica, perché chi l'ha letto ieri sappia che oggi dice
 * un'altra cosa.
 */
export async function salvaMessaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const id = strOpt(fd, 'id');
  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'Il messaggio è vuoto.' };

  let bachecaId: string;
  let esistente: Awaited<ReturnType<typeof messaggioPer>> = null;

  if (id) {
    esistente = await messaggioPer(id);
    if (!esistente) return { errore: 'Messaggio non trovato.' };
    // lo corregge chi l'ha scritto; il moderatore lo può togliere, non
    // riscriverlo con la firma di un altro
    if (esistente.autoreId !== me.id) {
      return { errore: 'Questo messaggio lo corregge chi l’ha scritto.' };
    }
    bachecaId = esistente.bachecaId;
  } else {
    bachecaId = str(fd, 'bachecaId');
    const b = await bachecaPer(bachecaId);
    if (!b) return { errore: 'Bacheca non trovata.' };
    if (!scriveInBacheca(b, me)) return { errore: 'In questa bacheca non scrivi: puoi rispondere.' };
  }

  // il banner: se ne arriva uno nuovo prende il posto del vecchio
  let banner: { bannerPath: string | null; bannerTipo: string | null } | undefined;
  const file = fd.get('banner');
  if (file instanceof File && file.size > 0) {
    try {
      const salvato = await salvaAllegato(file, 'bacheca', REGOLE_BANNER);
      banner = { bannerPath: salvato.filePath, bannerTipo: salvato.mimeType };
    } catch (e) {
      return { errore: e instanceof Error ? e.message : 'Immagine non caricata.' };
    }
  } else if (bool(fd, 'togliBanner')) {
    banner = { bannerPath: null, bannerTipo: null };
  }

  const dati = {
    titolo: strOpt(fd, 'titolo'),
    testo,
    ...(banner ?? {}),
  };

  if (esistente) {
    await prisma.messaggioBacheca.update({
      where: { id: esistente.id },
      data: { ...dati, ...(esistente.pubblicatoIl ? { modificatoIl: new Date() } : {}) },
    });
    if (banner && esistente.bannerPath) await cancellaDalDisco(esistente.bannerPath);
  } else {
    await prisma.messaggioBacheca.create({ data: { ...dati, bachecaId, autoreId: me.id } });
  }

  aggiorna(bachecaId);
  return {
    ok: esistente?.pubblicatoIl
      ? 'Messaggio corretto: chi lo apre vede la data della modifica.'
      : 'Bozza salvata: la vedono solo quelli che scrivono qui. Rilasciala quando è pronta.',
  };
}

/** Le prime parole di un messaggio, per la notifica: senza i simboli del Markdown. */
function anteprima(titolo: string | null, testo: string) {
  if (titolo) return titolo;
  const pulito = testo
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~|-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return pulito.length > 110 ? `${pulito.slice(0, 107)}…` : pulito;
}

/**
 * Rilascia una bozza: da qui la vedono tutti, e parte la notifica.
 *
 * **Solo push, niente WhatsApp.** La bacheca è il posto dove le cose restano:
 * chi non ha le notifiche la trova col pallino nel menu la prossima volta che
 * entra. Mandarle anche su WhatsApp vorrebbe dire riportare l'avviso proprio
 * nel posto da cui la bacheca lo doveva tirare fuori.
 *
 * Per ognuno si scrive una riga di consegna: è da lì che nascono le spunte.
 */
export async function pubblicaMessaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const m = await messaggioPer(str(fd, 'id'));
  if (!m) return { errore: 'Messaggio non trovato.' };
  if (m.autoreId !== me.id && !moderaBacheca(m.bacheca, me)) {
    return { errore: 'Lo rilascia chi l’ha scritto.' };
  }
  if (m.pubblicatoIl) return { errore: 'È già in bacheca.' };

  const adesso = new Date();
  const persone = (await destinatariBacheca(m.bacheca)).filter((id) => id !== m.autoreId);
  // bacheca silenziosa: nessuno ha il push: le consegne nascono senza, e le spunte
  // si fermano a «pubblicato» finché non lo aprono
  const conPush = new Set(
    m.bacheca.conNotifica
      ? (
          await prisma.iscrizionePush.findMany({
            where: { userId: { in: persone } },
            select: { userId: true },
          })
        ).map((i) => i.userId)
      : [],
  );

  await prisma.$transaction([
    prisma.messaggioBacheca.update({ where: { id: m.id }, data: { pubblicatoIl: adesso } }),
    prisma.consegnaBacheca.createMany({
      data: persone.map((userId) => ({ messaggioId: m.id, userId, conPush: conPush.has(userId) })),
      skipDuplicates: true,
    }),
  ]);

  const partiti = await avvisaConEsito(
    [...conPush],
    {
      titolo: `Bacheca · ${m.bacheca.nome}`,
      testo: anteprima(m.titolo, m.testo),
      url: `/bacheca/${m.bachecaId}#m-${m.id}`,
      tag: `bacheca-${m.id}`,
    },
    {
      urgenza: 'high',
      /*
       * La ricevuta porta con sé chi è e una firma, e non dipende dalla
       * sessione: chi non ha spuntato «ricordami» dopo dodici ore non ha più
       * una sessione valida, e il suo telefono riceveva la notifica senza
       * poterlo dire. La firma è dentro la notifica, cifrata per quel
       * telefono: nessun altro la conosce.
       */
      perPersona: (userId) => ({
        ricevuta: `/api/bacheca/ricevuta/${m.id}?u=${userId}&f=${firma(`ricevuta:${m.id}:${userId}`)}`,
      }),
    },
  );
  if (partiti.size > 0) {
    await prisma.consegnaBacheca.updateMany({
      where: { messaggioId: m.id, userId: { in: [...partiti] } },
      data: { inviataIl: new Date() },
    });
  }

  aggiorna(m.bachecaId);
  return {
    ok:
      persone.length === 0
        ? 'Messaggio in bacheca. Non c’è nessun altro a cui mandarlo, per ora.'
        : !m.bacheca.conNotifica
          ? 'Messaggio in bacheca, senza notifica: lo trovano col pallino nel menu.'
          : `Messaggio in bacheca: notifica partita a ${partiti.size} su ${persone.length}. Gli altri lo trovano col pallino nel menu.`,
  };
}

/** Lo toglie chi l'ha scritto o chi modera la bacheca. */
export async function eliminaMessaggio(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const m = await messaggioPer(str(fd, 'id'));
  if (!m) return { errore: 'Messaggio non trovato.' };
  if (m.autoreId !== me.id && !moderaBacheca(m.bacheca, me)) {
    return { errore: 'Lo toglie chi l’ha scritto o chi modera la bacheca.' };
  }

  await prisma.messaggioBacheca.delete({ where: { id: m.id } });
  if (m.bannerPath) await cancellaDalDisco(m.bannerPath);

  aggiorna(m.bachecaId);
  return { ok: 'Messaggio tolto dalla bacheca.' };
}

// ----------------------------------------------------- reazioni e risposte

/** Può rispondere o reagire: vede la bacheca, e il messaggio è rilasciato. */
async function messaggioVisibile(id: string, me: SessionUser) {
  const m = await messaggioPer(id);
  if (!m || !m.pubblicatoIl || !vedeBacheca(m.bacheca, me)) return null;
  return m;
}

/**
 * Una reazione, come su WhatsApp: una sola per persona.
 *
 * Toccare la stessa la toglie, toccarne un'altra la cambia. È chiamata dal
 * componente direttamente, senza modulo: un tocco su un'emoji non deve
 * aspettare il giro di una pagina.
 */
export async function reagisci(messaggioId: string, emoji: string): Promise<StatoForm> {
  const me = await requireUser();
  if (!(EMOJI_BACHECA as readonly string[]).includes(emoji)) return { errore: 'Reazione non prevista.' };
  const m = await messaggioVisibile(messaggioId, me);
  if (!m) return { errore: 'Messaggio non trovato.' };

  const chiave = { messaggioId_userId: { messaggioId, userId: me.id } };
  const prima = await prisma.reazioneBacheca.findUnique({ where: chiave });
  if (prima?.emoji === emoji) {
    await prisma.reazioneBacheca.delete({ where: chiave });
  } else {
    await prisma.reazioneBacheca.upsert({
      where: chiave,
      create: { messaggioId, userId: me.id, emoji },
      update: { emoji, messaIl: new Date() },
    });
  }

  revalidatePath(`/bacheca/${m.bachecaId}`);
  return { ok: 'Fatto.' };
}

/**
 * Una risposta sotto un messaggio.
 *
 * Chi nomina qualcuno con la chiocciola gli manda una notifica — solo push,
 * come per il messaggio — e solo se quella persona la bacheca la vede:
 * nominare uno che non può aprirla vorrebbe dire mandargli una notifica per
 * una porta chiusa.
 */
export async function rispondi(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'La risposta è vuota.' };
  const m = await messaggioVisibile(str(fd, 'messaggioId'), me);
  if (!m) return { errore: 'Messaggio non trovato.' };

  await prisma.rispostaBacheca.create({ data: { messaggioId: m.id, autoreId: me.id, testo } });

  const nominati = citatiIn(testo, await citabiliIn(m.bacheca)).filter((id) => id !== me.id);
  if (nominati.length > 0) {
    await avvisa(nominati, {
      titolo: `${me.callsign ?? nomeCompleto(me)} ti ha nominato`,
      testo: `In bacheca · ${m.bacheca.nome}: ${anteprima(null, testo)}`,
      url: `/bacheca/${m.bachecaId}#m-${m.id}`,
      tag: `bacheca-risposta-${m.id}`,
    });
  }

  revalidatePath(`/bacheca/${m.bachecaId}`);
  return { ok: 'Risposta scritta.' };
}

/** La toglie chi l'ha scritta o chi modera. */
export async function eliminaRisposta(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const r = await prisma.rispostaBacheca.findUnique({
    where: { id: str(fd, 'id') },
    include: { messaggio: { include: { bacheca: { include: conRegole } } } },
  });
  if (!r) return { errore: 'Risposta non trovata.' };
  if (r.autoreId !== me.id && !moderaBacheca(r.messaggio.bacheca, me)) {
    return { errore: 'La toglie chi l’ha scritta o chi modera la bacheca.' };
  }
  await prisma.rispostaBacheca.delete({ where: { id: r.id } });
  revalidatePath(`/bacheca/${r.messaggio.bachecaId}`);
  return { ok: 'Risposta tolta.' };
}

// ------------------------------------------------------------- i documenti

/**
 * Un documento della bacheca, richiamabile con la chiocciola.
 *
 * La chiocciola nasce dal nome del file; se due file si chiamano uguale, il
 * secondo prende un numero. Cambiarla dopo non si può: i messaggi già scritti
 * la citano, e rinominarla romperebbe i link di tutti.
 */
export async function caricaAllegatoBacheca(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const b = await bachecaPer(str(fd, 'bachecaId'));
  if (!b) return { errore: 'Bacheca non trovata.' };
  if (!scriveInBacheca(b, me)) return { errore: 'I documenti li carica chi scrive in questa bacheca.' };

  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { errore: 'Scegli il file da caricare.' };

  let salvato;
  try {
    salvato = await salvaAllegato(file, 'bacheca', REGOLE_ALLEGATO_BACHECA);
  } catch (e) {
    return { errore: e instanceof Error ? e.message : 'Caricamento non riuscito.' };
  }

  // il nome lo sceglie chi carica: è quello che si legge in bacheca, e da lì
  // nasce anche la chiocciola. Senza, vale il nome del file
  const titolo = strOpt(fd, 'titolo')?.slice(0, 120) ?? null;
  const descrizione = strOpt(fd, 'descrizione')?.slice(0, 500) ?? null;
  const maniglia = await manigliaLibera(b.id, titolo ?? salvato.fileName);

  await prisma.allegatoBacheca.create({
    data: { ...salvato, bachecaId: b.id, maniglia, titolo, descrizione, caricatoDaId: me.id },
  });

  aggiorna(b.id);
  return { ok: `Caricato: lo richiami scrivendo @${maniglia}` };
}

/** Una chiocciola libera in questa bacheca, a partire da un nome. */
async function manigliaLibera(bachecaId: string, nome: string, tranne?: string) {
  const base = manigliaDocumento(nome);
  const prese = new Set(
    (
      await prisma.allegatoBacheca.findMany({
        where: { bachecaId, ...(tranne ? { id: { not: tranne } } : {}) },
        select: { maniglia: true },
      })
    ).map((a) => a.maniglia),
  );
  let maniglia = base;
  for (let n = 2; prese.has(maniglia); n++) {
    const punto = base.lastIndexOf('.');
    maniglia = punto > 0 ? `${base.slice(0, punto)}-${n}${base.slice(punto)}` : `${base}-${n}`;
  }
  return maniglia;
}

/**
 * Il nome e la descrizione di un documento, da correggere dopo averlo caricato.
 *
 * **La chiocciola segue il nome**: chi lo chiama «Regolamento 2026» lo cerca
 * scrivendo @regolamento-2026, non con il nome del file di prima. E i messaggi
 * che citavano la chiocciola vecchia si riscrivono con quella nuova, nella
 * stessa volta: il link resta vivo, e nessuno si ritrova un @ che non porta
 * più a niente. Non conta come una modifica del messaggio — il testo dice la
 * stessa cosa, cambia solo il nome di quello che cita.
 */
export async function modificaAllegatoBacheca(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const a = await prisma.allegatoBacheca.findUnique({
    where: { id: str(fd, 'id') },
    include: { bacheca: { include: conRegole } },
  });
  if (!a) return { errore: 'Documento non trovato.' };
  if (a.caricatoDaId !== me.id && !moderaBacheca(a.bacheca, me)) {
    return { errore: 'Lo modifica chi l’ha caricato o chi modera la bacheca.' };
  }

  const titolo = strOpt(fd, 'titolo')?.slice(0, 120) ?? null;
  const descrizione = strOpt(fd, 'descrizione')?.slice(0, 500) ?? null;

  const vecchia = a.maniglia;
  const nuova =
    (titolo ?? null) === (a.titolo ?? null)
      ? vecchia
      : await manigliaLibera(a.bachecaId, titolo ?? a.fileName, a.id);

  const riscritture = [];
  if (nuova !== vecchia) {
    // La chiocciola vecchia, intera: @regolamento non deve toccare
    // @regolamento-2025. La punteggiatura in coda sì — «leggete
    // @verbale.pdf.» la legge anche chi disegna il messaggio (Markdown.tsx)
    const citata = new RegExp(
      `@${vecchia.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=[._-]*(?:[^a-z0-9._-]|$))`,
      'gi',
    );
    const [messaggi, risposte] = await Promise.all([
      prisma.messaggioBacheca.findMany({
        where: { bachecaId: a.bachecaId, testo: { contains: `@${vecchia}`, mode: 'insensitive' } },
        select: { id: true, testo: true },
      }),
      prisma.rispostaBacheca.findMany({
        where: {
          messaggio: { bachecaId: a.bachecaId },
          testo: { contains: `@${vecchia}`, mode: 'insensitive' },
        },
        select: { id: true, testo: true },
      }),
    ]);
    for (const m of messaggi) {
      riscritture.push(
        prisma.messaggioBacheca.update({
          where: { id: m.id },
          data: { testo: m.testo.replace(citata, `@${nuova}`) },
        }),
      );
    }
    for (const r of risposte) {
      riscritture.push(
        prisma.rispostaBacheca.update({
          where: { id: r.id },
          data: { testo: r.testo.replace(citata, `@${nuova}`) },
        }),
      );
    }
  }

  await prisma.$transaction([
    prisma.allegatoBacheca.update({
      where: { id: a.id },
      data: { titolo, descrizione, maniglia: nuova },
    }),
    ...riscritture,
  ]);
  aggiorna(a.bachecaId);
  return {
    ok:
      nuova === vecchia
        ? 'Documento aggiornato.'
        : `Documento aggiornato: ora si richiama con @${nuova}.`,
  };
}

export async function eliminaAllegatoBacheca(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const a = await prisma.allegatoBacheca.findUnique({
    where: { id: str(fd, 'id') },
    include: { bacheca: { include: conRegole } },
  });
  if (!a) return { errore: 'Documento non trovato.' };
  if (a.caricatoDaId !== me.id && !moderaBacheca(a.bacheca, me)) {
    return { errore: 'Lo toglie chi l’ha caricato o chi modera la bacheca.' };
  }
  await prisma.allegatoBacheca.delete({ where: { id: a.id } });
  await cancellaDalDisco(a.filePath);
  aggiorna(a.bachecaId);
  return { ok: 'Documento tolto. I messaggi che lo citavano ora mostrano solo il nome.' };
}

// ----------------------------------------------------------------- lettura

/**
 * Segna letti i messaggi rilasciati di una bacheca, per chi la sta guardando.
 *
 * È la spunta colorata: la bacheca aperta con i messaggi davanti. La chiama un
 * componente appena la pagina è davvero sullo schermo, non il render — che si
 * ripete, e il prefetch lo farebbe scattare senza che nessuno abbia aperto
 * niente.
 */
export async function segnaBachecaLetta(bachecaId: string): Promise<void> {
  const me = await requireUser();
  const fatto = await prisma.consegnaBacheca.updateMany({
    where: {
      userId: me.id,
      lettaIl: null,
      messaggio: { bachecaId, pubblicatoIl: { not: null } },
    },
    data: { lettaIl: new Date() },
  });
  if (fatto.count > 0) aggiorna(bachecaId);
}

/**
 * «Leggi tutto»: segna letti i messaggi di tutte le bacheche, in un colpo.
 *
 * Per chi torna dopo giorni e non vuole aprire le bacheche una a una solo per
 * spegnere i pallini. Solo i messaggi rilasciati e solo i suoi: le spunte
 * degli altri non si toccano.
 */
export async function segnaTutteLette(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  const fatto = await prisma.consegnaBacheca.updateMany({
    where: { userId: me.id, lettaIl: null, messaggio: { pubblicatoIl: { not: null } } },
    data: { lettaIl: new Date() },
  });
  aggiorna();
  return {
    ok:
      fatto.count === 1
        ? 'Un messaggio segnato come letto.'
        : `${fatto.count} messaggi segnati come letti.`,
  };
}
