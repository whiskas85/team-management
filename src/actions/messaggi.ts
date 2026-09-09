'use server';

import { revalidatePath } from 'next/cache';
import type { ScatenanteMessaggio } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { isAdmin } from '@/lib/domain';
import { bozzeDiOggi, bozzeSuRichiesta, segnaUsato, spezzaTesti, type Bozza } from '@/lib/messaggi';
import { gruppiWhatsapp, inviaWhatsapp, scollegaPonte, statoPonte } from '@/lib/whatsapp';
import { enumVal, str, strOpt, type StatoForm } from '@/lib/form';

const SCATENANTI = [
  'COMPLEANNO',
  'PROMEMORIA_ATTIVITA',
  'QUOTA_APERTA',
  'CERTIFICATO_IN_SCADENZA',
  'LIBERO',
] as const;

const DOVE = ['GRUPPO', 'PERSONA'] as const;

function aggiorna() {
  revalidatePath('/admin/messaggi');
}

/**
 * Il collegamento a WhatsApp è **di una persona**, non di un ruolo.
 *
 * Il ponte tiene la sessione, ma chi può servirsene è solo chi l'ha rivendicato:
 * un altro amministratore, anche con tutti i poteri, non manda messaggi dal
 * numero di qualcun altro. Deve scollegare e collegare il proprio.
 */
async function mioCollegamento(userId: string) {
  const c = await prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } });
  return c?.utenteId === userId ? c : null;
}

/**
 * Prende in carico il numero appena collegato al ponte.
 *
 * Il codice QR si inquadra col telefono; questo dice al gestionale *di chi* è
 * quella sessione. Finché nessuno lo rivendica, il ponte è collegato ma il
 * gestionale non lo usa.
 */
export async function rivendicaWhatsapp(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin collega WhatsApp.' };

  const stato = await statoPonte();
  if (!stato.collegato) {
    return {
      errore:
        stato.errore ?? 'Il numero non è ancora collegato: inquadra il codice con WhatsApp e riprova.',
    };
  }

  const esistente = await prisma.collegamentoWhatsapp.findUnique({ where: { id: 'whatsapp' } });
  if (esistente?.utenteId && esistente.utenteId !== me.id) {
    return { errore: 'Il collegamento è di un altro amministratore: deve scollegarlo lui.' };
  }

  const dati = {
    numero: stato.numero,
    utenteId: me.id,
    collegatoIl: new Date(),
    ultimoEsito: 'collegato',
  };
  await prisma.collegamentoWhatsapp.upsert({
    where: { id: 'whatsapp' },
    create: { id: 'whatsapp', ...dati },
    update: dati,
  });

  aggiorna();
  return { ok: `Collegato al numero ${stato.numero ?? 'sconosciuto'}: adesso è tuo.` };
}

export async function scollegaWhatsapp(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce il collegamento.' };
  if (!(await mioCollegamento(me.id))) {
    return { errore: 'Il collegamento non è tuo: può toglierlo solo chi l’ha fatto.' };
  }

  await scollegaPonte();
  await prisma.collegamentoWhatsapp.delete({ where: { id: 'whatsapp' } });

  aggiorna();
  return { ok: 'Numero scollegato: la sessione sul ponte è chiusa.' };
}

/** Il gruppo su cui scrivere di solito. */
export async function scegliGruppo(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!(await mioCollegamento(me.id))) return { errore: 'WhatsApp non è collegato a te.' };

  const gruppoId = str(fd, 'gruppoId');
  if (!gruppoId) return { errore: 'Scegli un gruppo.' };

  const gruppi = await gruppiWhatsapp();
  const scelto = gruppi.find((g) => g.id === gruppoId);
  if (!scelto) return { errore: 'Quel gruppo non c’è più fra quelli del numero collegato.' };

  await prisma.collegamentoWhatsapp.update({
    where: { id: 'whatsapp' },
    data: { gruppoId: scelto.id, gruppoNome: scelto.nome },
  });

  aggiorna();
  return { ok: `I messaggi di gruppo andranno su "${scelto.nome}".` };
}

// ------------------------------------------------------------------ modelli

/**
 * Il modello: quando parlare e dove scrivere. Il testo sta di là.
 *
 * È la riga che si tocca una volta l'anno — il giorno che la squadra apre un
 * gruppo nuovo — e per questo non moltiplica: cambiare gruppo qui li sposta
 * tutti, invece di chiedere trenta modifiche uguali.
 */
export async function salvaModello(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin scrive i modelli.' };

  const titolo = str(fd, 'titolo');
  if (!titolo) return { errore: 'Dài un titolo al modello: serve a ritrovarlo.' };

  const id = strOpt(fd, 'id');
  const dati = {
    titolo,
    scatenante: enumVal(fd, 'scatenante', SCATENANTI, 'LIBERO') as ScatenanteMessaggio,
    destinazione: enumVal(fd, 'destinazione', DOVE, 'GRUPPO'),
    gruppoId: strOpt(fd, 'gruppoId'),
    attivo: fd.get('attivo') !== null,
  };

  const gemello = await prisma.modelloMessaggio.findUnique({ where: { titolo } });
  if (gemello && gemello.id !== id) {
    return { errore: `C’è già un modello che si chiama "${titolo}".` };
  }

  if (id) await prisma.modelloMessaggio.update({ where: { id }, data: dati });
  else await prisma.modelloMessaggio.create({ data: dati });

  aggiorna();
  return { ok: id ? 'Modello aggiornato.' : 'Modello creato: adesso scrivici dentro i testi.' };
}

export async function eliminaModello(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i modelli.' };

  await prisma.modelloMessaggio.delete({ where: { id: str(fd, 'id') } });
  aggiorna();
  return { ok: 'Modello eliminato, con i suoi testi.' };
}

// ------------------------------------------------------------------- testi

/**
 * Aggiunge testi a un modello, uno o trenta in un colpo.
 *
 * L'incollata in blocco è il punto: i modi di fare gli auguri si scrivono tutti
 * insieme, magari facendoseli proporre, e passarli uno per uno da una finestra
 * che si apre e si chiude è il motivo per cui poi restano due.
 */
export async function aggiungiTesti(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin scrive i testi.' };

  const modelloId = str(fd, 'modelloId');
  const testi = spezzaTesti(str(fd, 'testo'));
  if (testi.length === 0) return { errore: 'Non c’è niente da aggiungere.' };

  const modello = await prisma.modelloMessaggio.findUnique({
    where: { id: modelloId },
    select: { id: true },
  });
  if (!modello) return { errore: 'Quel modello non c’è più.' };

  const attivo = fd.get('attivo') !== null;
  await prisma.testoModello.createMany({
    data: testi.map((testo) => ({ modelloId, testo, attivo })),
  });

  aggiorna();
  const quanti = testi.length === 1 ? 'Un testo aggiunto' : `${testi.length} testi aggiunti`;
  return { ok: attivo ? `${quanti}: entrano nella rotazione.` : `${quanti}, spenti: accendili tu.` };
}

export async function salvaTesto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin scrive i testi.' };

  const testo = str(fd, 'testo');
  if (!testo) return { errore: 'Il testo è vuoto.' };

  await prisma.testoModello.update({
    where: { id: str(fd, 'id') },
    data: { testo, attivo: fd.get('attivo') !== null },
  });

  aggiorna();
  return { ok: 'Testo aggiornato.' };
}

/** Accende o spegne un testo senza aprire niente: è il gesto che si fa di più. */
export async function accendiTesto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i testi.' };

  const id = str(fd, 'id');
  const attuale = await prisma.testoModello.findUnique({
    where: { id },
    select: { attivo: true },
  });
  if (!attuale) return { errore: 'Quel testo non c’è più.' };

  await prisma.testoModello.update({ where: { id }, data: { attivo: !attuale.attivo } });
  aggiorna();
  return { ok: attuale.attivo ? 'Testo spento: resta scritto, non esce.' : 'Testo acceso.' };
}

export async function eliminaTesto(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i testi.' };

  await prisma.testoModello.delete({ where: { id: str(fd, 'id') } });
  aggiorna();
  return { ok: 'Testo eliminato.' };
}

// ------------------------------------------------------------------ invio

/** Scrive le bozze nel registro: il vincolo di unicità scarta i doppioni da solo. */
async function registra(bozze: Bozza[]) {
  let nuove = 0;
  let gia = 0;
  for (const b of bozze) {
    try {
      await prisma.messaggioInviato.create({
        data: {
          userId: b.userId ?? null,
          scatenante: b.scatenante,
          testoId: b.testoId,
          testo: b.testo,
          destinazione: b.destinazione,
          aChi: b.aChi,
          eventId: b.eventId,
          occasione: b.occasione,
        },
      });
      if (b.testoId) await segnaUsato(b.testoId);
      nuove++;
    } catch {
      // già presente per quella destinazione e quell'occasione: è esattamente
      // ciò che il vincolo deve impedire, non un errore da raccontare
      gia++;
    }
  }
  return { nuove, gia };
}

/** "1 messaggio", "3 messaggi": la frase giusta costa una riga. */
const quanti = (n: number) => (n === 1 ? '1 messaggio' : `${n} messaggi`);

/**
 * Prepara i messaggi di oggi senza mandarli.
 *
 * Separare la preparazione dall'invio è voluto: si guarda cosa partirebbe, si
 * corregge il testo se stona, e solo dopo si preme. Con i messaggi automatici
 * l'errore non si corregge dopo — è già sul telefono di qualcuno.
 */
export async function preparaMessaggiDiOggi(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin prepara gli invii.' };

  const { nuove, gia } = await registra(await bozzeDiOggi());
  aggiorna();

  if (nuove > 0) return { ok: `Preparato ${quanti(nuove)}: controllalo e poi mandalo.` };
  // distinguere le due cose evita di rimettersi a cercare un guasto che non c'è
  return {
    ok:
      gia > 0
        ? 'Erano già pronti: quelli di oggi si preparano una volta sola.'
        : 'Niente da mandare: nessun compleanno oggi e nessuna attività domani, oppure mancano i modelli.',
  };
}

export async function preparaSollecito(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin prepara gli invii.' };

  const quale = str(fd, 'scatenante');
  if (quale !== 'QUOTA_APERTA' && quale !== 'CERTIFICATO_IN_SCADENZA') {
    return { errore: 'Tipo di sollecito non riconosciuto.' };
  }

  const { nuove, gia } = await registra(await bozzeSuRichiesta(quale));
  aggiorna();

  if (nuove > 0) return { ok: `Preparato ${quanti(nuove)}.` };
  return { ok: gia > 0 ? 'Erano già pronti.' : 'Nessuno da sollecitare.' };
}

export async function eliminaBozza(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce gli invii.' };

  await prisma.messaggioInviato.deleteMany({
    where: { id: str(fd, 'id'), stato: 'DA_MANDARE' },
  });
  aggiorna();
  return { ok: 'Messaggio scartato.' };
}

/**
 * Manda quelli in attesa.
 *
 * Uno alla volta, con l'esito scritto riga per riga e una pausa in mezzo: una
 * raffica di messaggi identici nello stesso secondo è il modo più veloce per
 * far insospettire WhatsApp e perdere il numero.
 */
export async function inviaMessaggiPronti(_prev: StatoForm, _fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin manda i messaggi.' };

  if (!(await mioCollegamento(me.id))) {
    return {
      errore:
        'WhatsApp non è collegato al tuo account: il numero di un altro amministratore non si usa.',
    };
  }

  const pronti = await prisma.messaggioInviato.findMany({ where: { stato: 'DA_MANDARE' } });
  if (pronti.length === 0) return { errore: 'Non c’è niente da mandare.' };

  let inviati = 0;
  let falliti = 0;

  for (const m of pronti) {
    const esito = await inviaWhatsapp(m.destinazione, m.testo);
    await prisma.messaggioInviato.update({
      where: { id: m.id },
      data: esito.ok
        ? { stato: 'INVIATO', inviatoIl: new Date(), esito: esito.dati.id }
        : { stato: 'ERRORE', esito: esito.errore },
    });
    if (esito.ok) inviati++;
    else falliti++;

    // ritmo umano fra un messaggio e l'altro
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1500));
  }

  await prisma.collegamentoWhatsapp.update({
    where: { id: 'whatsapp' },
    data: { ultimoInvio: new Date(), ultimoEsito: `${inviati} inviati, ${falliti} falliti` },
  });

  aggiorna();
  return falliti === 0
    ? { ok: `Inviato ${quanti(inviati)}.` }
    : { errore: `Inviati ${inviati}, falliti ${falliti}. L’esito di ognuno è nel registro.` };
}
