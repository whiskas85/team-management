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
};

export async function quadroPersona(
  userId: string,
  stato: StatoOperatore,
  roles: Role[],
): Promise<QuadroPersona> {
  const stagione = await prisma.stagione.findFirst({
    where: { corrente: true },
    select: { id: true, nome: true },
  });

  const [risposte, svolte] = await Promise.all([
    prisma.eventRsvp.findMany({
      where: {
        userId,
        event: {
          status: { not: 'ANNULLATA' },
          ...(stagione ? { stagioneId: stagione.id } : {}),
        },
      },
      select: {
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
      },
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
  ]);

  return {
    righe: risposte.map((r) => ({
      eventId: r.eventId,
      status: r.status,
      presente: r.presente,
      quando: r.event.inizio,
      finisce: r.event.fine,
      collegatoAId: r.event.collegatoAId,
      tipo: r.event.tipo?.nome ?? null,
      colore: r.event.tipo?.colore ?? null,
    })),
    // a giornate, come tutto il resto: una domenica con due attività è una
    svolteTotali: new Set(impegni(svolte).values()).size,
    stagione: stagione?.nome ?? null,
  };
}
