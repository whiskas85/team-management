import { prisma } from './db';
import { stagioneCorrente } from './format';
import type { VoceTariffa } from '@prisma/client';

/**
 * La stagione in corso. Se non ne è stata ancora marcata nessuna, si prende
 * (o si crea) quella che cade nel periodo di oggi: il gestionale deve poter
 * funzionare anche prima che qualcuno apra la prima stagione a mano.
 */
export async function stagioneAttiva() {
  const segnata = await prisma.stagione.findFirst({ where: { corrente: true } });
  if (segnata) return segnata;

  const nome = stagioneCorrente();
  const esistente = await prisma.stagione.findUnique({ where: { nome } });
  if (esistente) return esistente;

  const [da] = nome.split('/');
  return prisma.stagione.create({
    data: {
      nome,
      // la stagione sportiva va da settembre ad agosto
      inizio: new Date(Number(da), 8, 1),
      fine: new Date(Number(da) + 1, 7, 31),
      corrente: true,
    },
  });
}

/**
 * Quanto costa una voce in una certa stagione. Vince la tariffa scritta per
 * quella stagione; se non c'è si usa quella generica, che vale per tutte.
 * Restituisce null quando la voce non è a listino: chi chiama decide se è un
 * caso da segnalare o semplicemente una cosa gratis.
 */
/**
 * Le stagioni in cui si può mettere un'attività: quella in corso e quelle che
 * verranno.
 *
 * Le chiuse restano fuori: una stagione si chiude quando i conti sono fatti, e
 * infilarci dentro un'attività nuova vorrebbe dire rifarli.
 */
export async function stagioniAperte() {
  return prisma.stagione.findMany({
    where: { chiusa: false },
    orderBy: { inizio: 'asc' },
    select: { id: true, nome: true, corrente: true },
  });
}

export async function tariffa(
  uso: VoceTariffa,
  stagioneId?: string | null,
): Promise<number | null> {
  const righe = await prisma.tariffa.findMany({
    where: {
      usi: { has: uso },
      attiva: true,
      OR: [{ stagioneId: null }, ...(stagioneId ? [{ stagioneId }] : [])],
    },
  });

  if (righe.length === 0) return null;

  // di una voce con lo stesso nome vince quella scritta per la stagione:
  // l'importo generico e' solo il valore di ripiego
  const perNome = new Map<string, (typeof righe)[number]>();
  for (const r of righe) {
    const gia = perNome.get(r.nome);
    if (!gia || (r.stagioneId === stagioneId && !gia.stagioneId)) perNome.set(r.nome, r);
  }

  // piu' voci per lo stesso automatismo sono lo spaccato di una quota sola:
  // quello che l'operatore deve pagare e' la loro somma
  return [...perNome.values()].reduce((t, r) => t + Number(r.importo), 0);
}

/** Come si chiama un automatismo, e il nome che propone per la voce. */
export const ETICHETTA_VOCE: Record<VoceTariffa, string> = {
  ISCRIZIONE: 'Iscrizione (primo tesseramento)',
  REISCRIZIONE: 'Reiscrizione (rinnovo)',
  TESSERA_FIGT: 'Tessera federale FIGT',
  GIOCATA_NUOVO: 'Giocata esterni (proposta sulle attività)',
  ATTIVITA: 'Voce per le attività (contributo campo, extra…)',
  AFFITTO: 'Noleggio attrezzatura',
};

/** Nomi proposti nel campo libero: aiutano a restare coerenti negli anni. */
export const NOMI_SUGGERITI = [
  'Iscrizione',
  'Reiscrizione',
  'Cassa comune',
  'Tessera federale FIGT',
  'Giocata',
  'Contributo campo',
  'Noleggio attrezzatura',
  'Noleggio replica',
];

export const SPIEGA_VOCE: Record<VoceTariffa, string> = {
  ISCRIZIONE: 'Quota proposta a chi entra per la prima volta.',
  REISCRIZIONE: 'Quota proposta a chi rinnova.',
  TESSERA_FIGT: 'Costo della tessera federale.',
  GIOCATA_NUOVO:
    'Voce proposta già spuntata sulla quota esterni quando si crea un’attività: è quello che paga chi viene a giocare senza essere in squadra.',
  ATTIVITA:
    'Voce che compare fra quelle con cui si compongono le quote di un’attività, da spuntare quando serve: contributo campo, extra di giornata.',
  AFFITTO: 'Noleggio dell’attrezzatura, da addebitare a chi la chiede.',
};
