import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { haIncarichi } from '@/lib/domain';
import { citabili } from '@/lib/note';
import { Intestazione, Statistica, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormNota, Nota, type NotaLetta } from '@/components/Note';

export const dynamic = 'force-dynamic';

/**
 * Tutte le note, in un posto solo.
 *
 * Sono sparse dove servono — sulla scheda di una persona, sotto un'attività —
 * ma prima o poi si cerca qualcosa senza ricordarsi dove lo si era scritto.
 * Qui ci sono tutte, e sono **solo le proprie**: la query parte dall'autore,
 * non ci si arriva per altre strade.
 */
export default async function NotePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireUser();
  if (!haIncarichi(me.roles)) redirect('/dashboard?errore=permessi');

  const { q } = await searchParams;
  const cerca = (q ?? '').trim();

  const [note, persone] = await Promise.all([
    prisma.nota.findMany({
      where: {
        autoreId: me.id,
        ...(cerca
          ? {
              OR: [
                { titolo: { contains: cerca, mode: 'insensitive' } },
                { testo: { contains: cerca, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        persona: { select: { nome: true, cognome: true, callsign: true } },
        evento: { select: { titolo: true } },
        citate: {
          include: {
            utente: { select: { id: true, nome: true, cognome: true, callsign: true } },
          },
        },
      },
    }),
    citabili(),
  ]);

  const suPersone = note.filter((n) => n.userId).length;
  const suAttivita = note.filter((n) => n.eventId).length;

  return (
    <>
      <Intestazione
        titolo="Note"
        sottotitolo="Quello che hai annotato. Lo leggi soltanto tu"
        azioni={
          <BottoneModale etichetta="Nuova nota" icona="aggiungi" titolo="Nuova nota" larga>
            <FormNota persone={persone} />
          </BottoneModale>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Statistica etichetta="Note" valore={note.length} />
        <Statistica etichetta="Su una persona" valore={suPersone} />
        <Statistica etichetta="Su un’attività" valore={suAttivita} />
      </div>

      {/* la ricerca passa dall'indirizzo: una nota ritrovata si può rimandare
          a se stessi con un collegamento, e il tasto indietro funziona */}
      <form className="mb-4" action="/note">
        <input
          name="q"
          defaultValue={cerca}
          className="input sm:w-80"
          placeholder="Cerca nel titolo o nel testo…"
        />
      </form>

      {note.length === 0 ? (
        <Vuoto
          testo={
            cerca
              ? `Nessuna nota tua contiene “${cerca}”.`
              : 'Non hai ancora scritto note. Le puoi aggiungere anche dalla scheda di una persona o da un’attività.'
          }
        />
      ) : (
        <div className="space-y-2">
          {(note as NotaLetta[]).map((n) => (
            <Nota key={n.id} nota={n} persone={persone} />
          ))}
        </div>
      )}
    </>
  );
}
