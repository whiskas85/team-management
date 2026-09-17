import { readFile } from 'fs/promises';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { genereAllegato } from '@/lib/allegati';
import { isAdmin, vedeAttivitaSquadra } from '@/lib/domain';
import { fmtDateTime, nomeCompleto } from '@/lib/format';
import { percorsoAssoluto } from '@/lib/storage';
import { Intestazione } from '@/components/ui';
import { LettoreAllegato } from '@/components/LettoreAllegato';

export const dynamic = 'force-dynamic';

/**
 * Un allegato dell'attività, letto da dentro.
 *
 * Le regole per entrare sono **quelle della scheda**, riscritte qui e non
 * dedotte: un indirizzo indovinato non deve aprire il book di un'attività che
 * nel calendario non si vedrebbe nemmeno.
 */
export default async function PaginaAllegato({
  params,
}: {
  params: Promise<{ id: string; allegato: string }>;
}) {
  const me = await requireUser();
  const { id, allegato: allegatoId } = await params;

  const allegato = await prisma.allegatoEvento.findUnique({
    where: { id: allegatoId },
    include: {
      event: { select: { id: true, titolo: true, status: true, visibilita: true } },
      caricatoDa: { select: { nome: true, cognome: true, callsign: true } },
    },
  });
  // l'allegato di un'altra attività non si apre cambiando il pezzo di mezzo
  // dell'indirizzo: la riga e la scheda devono essere la stessa cosa
  if (!allegato || allegato.eventId !== id) notFound();

  const e = allegato.event;
  const admin = isAdmin(me.roles);
  if (e.status === 'CREATA' && !admin) notFound();

  const partecipo =
    (await prisma.eventRsvp.count({ where: { eventId: e.id, userId: me.id } })) > 0;
  const aperta =
    e.visibilita === 'TUTTI' || (e.visibilita === 'TEAM' && vedeAttivitaSquadra(me.stato));
  if (!admin && !partecipo && !aperta) notFound();

  // il Markdown lo disegniamo noi: il file si legge qui, e di là arrivano
  // elementi React invece di HTML da iniettare nella pagina
  const testo =
    genereAllegato(allegato.mimeType) === 'md'
      ? await readFile(percorsoAssoluto(allegato.filePath), 'utf8').catch(() => '')
      : undefined;

  return (
    <>
      <Link
        href={`/calendario/${e.id}`}
        className="mb-4 inline-block text-xs text-muted hover:text-nvg"
      >
        ← {e.titolo}
      </Link>

      <Intestazione
        titolo={allegato.titolo}
        sottotitolo={
          allegato.caricatoDa
            ? `Caricato da ${nomeCompleto(allegato.caricatoDa)} · ${fmtDateTime(allegato.aggiornatoIl)}`
            : `Aggiornato il ${fmtDateTime(allegato.aggiornatoIl)}`
        }
      />

      <LettoreAllegato
        allegato={{
          titolo: allegato.titolo,
          fileName: allegato.fileName,
          mimeType: allegato.mimeType,
          fileSize: allegato.fileSize,
          aggiornatoIl: fmtDateTime(allegato.aggiornatoIl),
        }}
        indirizzoFile={`/api/allegati/${allegato.id}`}
        testo={testo}
      />
    </>
  );
}
