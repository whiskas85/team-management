import Link from 'next/link';
import { casseDi } from '@/lib/casse';
import type { Role } from '@prisma/client';

/**
 * In cima a ogni cassa: la cassa del club e quelle private che questa persona
 * tiene, una accanto all'altra. Sono la stessa cosa — una cassa — e si passa
 * dall'una all'altra senza cercarle in due punti del menu. Con una cassa sola
 * non c'è niente da scegliere, e non compare.
 */
export async function SelettoreCasse({
  me,
  attuale,
}: {
  me: { id: string; roles: Role[] };
  /** null: la cassa del club. */
  attuale: string | null;
}) {
  const casse = await casseDi(me);
  if (casse.length < 2) return null;
  return (
    <div className="flex flex-wrap rounded-md border border-line p-0.5">
      {casse.map((c) => (
        <Link
          key={c.id ?? 'club'}
          href={c.href}
          className={`rounded px-3 py-1.5 text-xs ${
            c.id === attuale ? 'bg-nvg/15 text-nvg' : 'text-muted hover:text-ink'
          }`}
        >
          {c.nome}
          {!c.attiva && ' · spenta'}
        </Link>
      ))}
    </div>
  );
}
