'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { COLORI_TIPOLOGIA, isAdmin } from '@/lib/domain';
import { bool, enumVal, intOpt, num, str, strOpt, type StatoForm } from '@/lib/form';
import { fmtEuro } from '@/lib/format';
import { riallineaQuoteTipologie } from './eventi';

// i colori ammessi sono quelli della palette, e basta aggiungerli lì
const COLORI = Object.keys(COLORI_TIPOLOGIA);
const QUOTE = [
  'ISCRIZIONE',
  'TESSERA_FIGT',
  'TORNEO',
  'GARA',
  'ALLENAMENTO',
  'EVENTO',
  'ALTRO',
] as const;

function aggiorna() {
  revalidatePath('/admin/tipologie');
  revalidatePath('/calendario');
  revalidatePath('/admin/statistiche');
}

export async function salvaTipologia(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const nome = str(fd, 'nome');
  if (!nome) return { errore: 'Il nome della tipologia è obbligatorio.' };

  const doppione = await prisma.tipoAttivita.findUnique({ where: { nome } });
  if (doppione && doppione.id !== id) {
    return { errore: `Esiste già una tipologia chiamata "${nome}".` };
  }

  // l'ordine non passa da qui: si decide trascinando le righe nell'elenco
  const valori = {
    nome,
    descrizione: strOpt(fd, 'descrizione'),
    colore: enumVal(fd, 'colore', COLORI, 'verde'),
    tipoQuota: enumVal(fd, 'tipoQuota', QUOTE, 'EVENTO'),
    riserve: bool(fd, 'riserve'),
    riunione: bool(fd, 'riunione'),
    soloInterno: bool(fd, 'soloInterno'),
    certMedico: bool(fd, 'certMedico'),
    certAgonistico: bool(fd, 'certAgonistico'),
    ripiegoPolizza: bool(fd, 'ripiegoPolizza'),
    attivo: bool(fd, 'attivo'),
  };

  if (id) {
    const prima = await prisma.tipoAttivita.findUnique({ where: { id } });
    await prisma.tipoAttivita.update({ where: { id }, data: valori });
    // la polizza di ripiego entra o esce dalle quote delle attività in
    // programma di questa tipologia
    if (
      prima &&
      (prima.ripiegoPolizza !== valori.ripiegoPolizza ||
        prima.certMedico !== valori.certMedico ||
        prima.certAgonistico !== valori.certAgonistico)
    ) {
      await riallineaQuoteTipologie([id]);
    }
    aggiorna();
    return { ok: 'Tipologia aggiornata.' };
  }

  // una tipologia nuova nasce in fondo: chi la crea la sposta se serve
  const ultima = await prisma.tipoAttivita.aggregate({ _max: { ordine: true } });
  await prisma.tipoAttivita.create({
    data: { ...valori, ordine: (ultima._max.ordine ?? -1) + 1 },
  });
  aggiorna();
  return { ok: 'Tipologia aggiunta: la trovi in fondo all’elenco, trascinala dove serve.' };
}

/**
 * Nuovo ordine delle tipologie, come sono state trascinate.
 *
 * Arriva la sequenza degli id e si riscrive la posizione di ognuna: è l'unico
 * modo per cambiarla, così non esistono due verità — la tendina segue questo.
 */
export async function riordinaTipologie(ids: string[]): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };
  if (ids.length === 0) return { errore: 'Non c’è niente da riordinare.' };

  // le posizioni si riscrivono tutte insieme: a metà strada l'elenco avrebbe
  // due voci nello stesso posto
  await prisma.$transaction(
    ids.map((id, posizione) =>
      prisma.tipoAttivita.update({ where: { id }, data: { ordine: posizione } }),
    ),
  );

  aggiorna();
  return { ok: 'Ordine salvato.' };
}

export async function eliminaTipologia(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const id = str(fd, 'id');
  const usata = await prisma.event.count({ where: { tipoId: id } });

  if (usata > 0) {
    // la tipologia è legata allo storico: la disattiviamo invece di cancellarla
    await prisma.tipoAttivita.update({ where: { id }, data: { attivo: false } });
    aggiorna();
    return { ok: `Tipologia usata in ${usata} attività: disattivata anziché eliminata.` };
  }

  await prisma.tipoAttivita.delete({ where: { id } });
  aggiorna();
  return { ok: 'Tipologia eliminata.' };
}

/**
 * La polizza giornaliera di ripiego, per chi è in squadra senza certificato
 * (sulle tipologie che la ammettono): una voce del tariffario, che porta con
 * sé importo e cassa, o un importo scritto a mano con la sua cassa. Niente
 * dei due: ripiego spento.
 */
export async function impostaPolizzaRipiego(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const me = await requireUser();
  if (!isAdmin(me.roles)) return { errore: 'Solo l’admin gestisce i dati di base.' };

  const tariffaId = strOpt(fd, 'tariffaId');
  const tariffa = tariffaId
    ? await prisma.tariffa.findUnique({
        where: { id: tariffaId },
        select: { nome: true, importo: true, cassa: { select: { nome: true } } },
      })
    : null;
  if (tariffaId && !tariffa) return { errore: 'Quella voce del tariffario non esiste più.' };

  const testo = str(fd, 'costo');
  const costo = testo ? num(fd, 'costo') : null;
  if (!tariffa && testo && (costo === null || costo < 0 || costo > 500)) {
    return { errore: 'Scrivi il costo in euro, per esempio 5 o 7,50.' };
  }
  const cassaId = strOpt(fd, 'cassaId');
  const cassa = cassaId
    ? await prisma.cassa.findUnique({ where: { id: cassaId }, select: { nome: true } })
    : null;
  if (cassaId && !cassa) return { errore: 'Quella cassa non esiste più.' };

  const dati = {
    polizzaRipiegoTariffaId: tariffa ? tariffaId : null,
    polizzaRipiego: tariffa ? null : costo,
    polizzaRipiegoCassaId: tariffa ? null : cassaId,
  };
  await prisma.impostazioni.upsert({
    where: { id: 'app' },
    create: { id: 'app', ...dati },
    update: dati,
  });
  // le quote di chi è già segnato si adeguano
  await riallineaQuoteTipologie();
  aggiorna();
  revalidatePath('/admin/polizze');
  if (tariffa) {
    return {
      ok: `Polizza di ripiego: «${tariffa.nome}», ${fmtEuro(Number(tariffa.importo))} nella cassa ${
        tariffa.cassa?.nome ?? 'del club'
      }.`,
    };
  }
  return {
    ok:
      costo === null
        ? 'Polizza di ripiego spenta: senza certificato non ci si segna, su nessuna tipologia.'
        : `Polizza di ripiego a ${fmtEuro(costo)}, nella cassa ${cassa?.nome ?? 'del club'}.`,
  };
}
