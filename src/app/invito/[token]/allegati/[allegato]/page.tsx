import { readFile } from 'fs/promises';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { genereAllegato } from '@/lib/allegati';
import { fmtDateTime } from '@/lib/format';
import { percorsoAssoluto } from '@/lib/storage';
import { Logo } from '@/components/Logo';
import { LettoreAllegato } from '@/components/LettoreAllegato';

export const dynamic = 'force-dynamic';

/**
 * Il book di missione, letto da fuori.
 *
 * Ci si arriva solo dalla pagina dell'invito, e si apre **solo quello che è
 * stato marcato pubblico**: il token è la chiave di quella porta, non di
 * tutte. Di chi l'ha caricato non si dice niente — da fuori i nomi non si
 * vedono, qui come di là.
 */
export default async function PaginaAllegatoInvito({
  params,
}: {
  params: Promise<{ token: string; allegato: string }>;
}) {
  const { token, allegato: allegatoId } = await params;

  const ospite = await prisma.squadraOspite.findUnique({
    where: { token },
    select: { eventId: true, nome: true, event: { select: { titolo: true, status: true } } },
  });
  if (!ospite) notFound();
  // di una bozza non si dice nemmeno che esiste
  if (ospite.event.status === 'CREATA') notFound();

  const allegato = await prisma.allegatoEvento.findUnique({ where: { id: allegatoId } });
  if (!allegato || allegato.eventId !== ospite.eventId || !allegato.pubblico) notFound();

  const testo =
    genereAllegato(allegato.mimeType) === 'md'
      ? await readFile(percorsoAssoluto(allegato.filePath), 'utf8').catch(() => '')
      : undefined;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-center gap-3 border-b border-line pb-5">
        <Logo size={44} />
        <div className="min-w-0">
          <p className="num text-sm font-semibold tracking-wide">ZERO DARK OPS</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-nvg">going dark</p>
        </div>
      </header>

      <Link href={`/invito/${token}`} className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← {ospite.event.titolo}
      </Link>

      <h1 className="mb-4 text-2xl font-semibold">{allegato.titolo}</h1>

      <LettoreAllegato
        allegato={{
          titolo: allegato.titolo,
          fileName: allegato.fileName,
          mimeType: allegato.mimeType,
          fileSize: allegato.fileSize,
          aggiornatoIl: fmtDateTime(allegato.aggiornatoIl),
        }}
        indirizzoFile={`/api/allegati/${allegato.id}?invito=${encodeURIComponent(token)}`}
        testo={testo}
      />

      <p className="mt-6 text-center text-[11px] text-muted">
        Questo documento è di questa attività. Se viene aggiornato, a questo stesso indirizzo si
        trova la versione nuova.
      </p>
    </main>
  );
}
