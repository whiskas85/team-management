import { prisma } from './db';
import { nomeCompleto } from './format';
import { etichettaStato } from './domain';
import { maniglia } from './note';
import { gestisceBacheche, indirizzoAllegato, vedeBacheca, type BachecaPerRegole } from './bacheche';
import type { PersonaScelta } from '@/components/FormBacheca';
import type { Citabile } from '@/components/MessaggioBacheca';
import type { Menzioni } from '@/components/Markdown';

/**
 * Le persone attorno a una bacheca, per le pagine.
 *
 * Sta a parte da `lib/bacheche` perché quello lo usano anche le porte dei file
 * e le azioni, e qui dentro ci sono cose che servono solo a chi disegna:
 * l'elenco da spuntare, le chiocciole da proporre.
 */

/** Chi si può scegliere come lettore, scrittore o moderatore: gli account vivi. */
export async function personeSceglibili(): Promise<PersonaScelta[]> {
  const persone = await prisma.user.findMany({
    where: { stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, cognome: true, callsign: true, stato: true },
  });
  return persone.map((p) => ({
    id: p.id,
    nome: nomeCompleto(p),
    gruppo: etichettaStato[p.stato],
    gestisce: gestisceBacheche(p.stato),
  }));
}

/**
 * Chi e cosa si richiama con la chiocciola in una bacheca.
 *
 * Le persone sono **solo quelle che la vedono**: nominare uno che non può
 * aprirla vorrebbe dire mandargli una notifica per una porta chiusa. I
 * documenti sono quelli della bacheca, e la chiocciola diventa un link.
 */
export async function chiocciole(
  b: BachecaPerRegole & { allegati: { id: string; maniglia: string; fileName: string }[] },
): Promise<{ citabili: Citabile[]; menzioni: Menzioni }> {
  const persone = await prisma.user.findMany({
    where: { stato: { not: 'DISABILITATO' } },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
    select: { id: true, nome: true, cognome: true, callsign: true, stato: true, roles: true },
  });

  const citabili: Citabile[] = [
    ...b.allegati.map((a) => ({
      id: a.id,
      maniglia: a.maniglia,
      nome: a.fileName,
      href: indirizzoAllegato(a.id),
    })),
    ...persone
      .filter((p) => vedeBacheca(b, p))
      .map((p) => ({ id: p.id, maniglia: maniglia(p), nome: nomeCompleto(p) })),
  ];

  const menzioni: Menzioni = Object.fromEntries(
    citabili.map((c) => [c.maniglia, c.href ? { nome: c.nome, href: c.href } : c.nome]),
  );
  return { citabili, menzioni };
}
