import { prisma } from './db';
import { filtroVisibilita } from './query';
import { impegni } from './impegni';
import { isAdmin } from './domain';
import type { Role, StatoOperatore } from '@prisma/client';
import type { RigaPartecipazione } from '@/components/StatistichePersona';

/**
 * Il quadro di una persona: le sue partecipazioni e quante giornate ci sono state.
 *
 * Sta qui e non nelle pagine per una ragione imparata sbagliando: i numeri
 * venivano da due query diverse e contavano in due modi diversi — le presenze
 * a **impegni**, la tipologia più frequentata a **righe** — e il riquadro
 * finiva per dire «10 volte su 7», che è impossibile. Un conto solo, in un
 * posto solo, e chi lo mostra non può più sbagliarlo.
 *
 * **Il denominatore è la stagione, non quello a cui hai risposto.** «7 su 8»
 * dove l'8 erano le attività a cui la persona si era segnata raccontava una
 * squadra che gioca otto volte l'anno: chi guarda legge «su quante se ne sono
 * fatte», ed è quello che deve trovare.
 */

export type QuadroPersona = {
  righe: RigaPartecipazione[];
  /** Le giornate svolte in questa stagione, contate a impegni. */
  svolteTotali: number;
  stagione: string | null;
  /**
   * L'anno solare, da gennaio a dicembre, per il grafico della home: tutte le
   * attività in programma che questa persona poteva fare — annullate
   * comprese, e quelle che devono ancora venire — e quelle in cui c'era.
   */
  anno: AnnoPersona;
};

export type AnnoPersona = {
  eventi: {
    id: string;
    inizio: Date;
    fine: Date | null;
    collegatoAId: string | null;
    annullato: boolean;
  }[];
  /** Le attività dell'anno in cui è stata presente all'appello. */
  presente: string[];
};

const perRiga = {
  eventId: true,
  status: true,
  presente: true,
  event: {
    select: {
      inizio: true,
      fine: true,
      collegatoAId: true,
      tipo: { select: { nome: true, colore: true } },
    },
  },
} as const;

type RispostaGrezza = {
  eventId: string;
  status: string;
  presente: boolean | null;
  event: {
    inizio: Date;
    fine: Date | null;
    collegatoAId: string | null;
    tipo: { nome: string; colore: string | null } | null;
  };
};

const inRiga = (r: RispostaGrezza): RigaPartecipazione => ({
  eventId: r.eventId,
  status: r.status,
  presente: r.presente,
  quando: r.event.inizio,
  finisce: r.event.fine,
  collegatoAId: r.event.collegatoAId,
  tipo: r.event.tipo?.nome ?? null,
  colore: r.event.tipo?.colore ?? null,
});

export async function quadroPersona(
  userId: string,
  stato: StatoOperatore,
  roles: Role[],
): Promise<QuadroPersona> {
  const stagione = await prisma.stagione.findFirst({
    where: { corrente: true },
    select: { id: true, nome: true },
  });

  const anno = new Date().getFullYear();
  const [risposte, svolte, eventiAnno] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: {
        userId,
        event: {
          status: { not: 'ANNULLATA' },
          ...(stagione ? { stagioneId: stagione.id } : {}),
        },
      },
      select: perRiga,
    }),

    /*
     * Le giornate che ci sono state, e che questa persona poteva fare.
     *
     * Si passa dal filtro di visibilità del calendario: un'attività su invito
     * a cui non era invitata non è una giornata che si è persa, e metterla nel
     * denominatore le abbasserebbe la percentuale per qualcosa a cui non
     * poteva andare.
     */
    prisma.event.findMany({
      where: {
        AND: [
          filtroVisibilita(stato, isAdmin(roles), userId),
          { status: { not: 'ANNULLATA' } },
          { inizio: { lt: new Date() } },
          ...(stagione ? [{ stagioneId: stagione.id }] : []),
        ],
      },
      select: { id: true, inizio: true, fine: true, collegatoAId: true },
    }),

    /*
     * Le attività dell'anno che poteva fare: la regola del calendario per chi
     * non vede le bozze — una bozza non è in programma per nessuno, nemmeno
     * nel grafico dell'admin. Le annullate ci sono: erano in programma.
     */
    prisma.event.findMany({
      where: {
        AND: [
          filtroVisibilita(stato, false, userId),
          { inizio: { gte: new Date(anno, 0, 1), lt: new Date(anno + 1, 0, 1) } },
        ],
      },
      select: {
        id: true,
        inizio: true,
        fine: true,
        collegatoAId: true,
        status: true,
        rsvps: { where: { userId, presente: true }, select: { eventId: true } },
      },
    }),
  ]);

  return {
    righe: risposte.map(inRiga),
    anno: {
      eventi: eventiAnno.map((e) => ({
        id: e.id,
        inizio: e.inizio,
        fine: e.fine,
        collegatoAId: e.collegatoAId,
        annullato: e.status === 'ANNULLATA',
      })),
      presente: eventiAnno.filter((e) => e.rsvps.length > 0).map((e) => e.id),
    },
    // a giornate, come tutto il resto: una domenica con due attività è una
    svolteTotali: new Set(impegni(svolte).values()).size,
    stagione: stagione?.nome ?? null,
  };
}
