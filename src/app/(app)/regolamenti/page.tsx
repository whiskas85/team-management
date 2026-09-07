import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { elencoDocumenti, puoScrivere, SEZIONI } from '@/lib/documenti';
import { fmtDate } from '@/lib/format';
import { Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormDocumento } from '@/components/Documento';

export const dynamic = 'force-dynamic';

/**
 * I regolamenti, per chiunque abbia un account.
 *
 * A differenza dello statuto non serve essere in squadra: sono proprio quello
 * che si mostra a chi si sta affacciando — come ci si comporta in campo, cosa
 * si può e cosa no. Sono un elenco e non un testo solo, perché ne nascono di
 * nuovi: la condotta, il mercatino, quelli che verranno.
 */
export default async function RegolamentiPage() {
  const me = await requireUser();
  const documenti = await elencoDocumenti('REGOLAMENTO');
  const scrive = puoScrivere(me.roles);

  return (
    <>
      <Intestazione
        titolo={SEZIONI.REGOLAMENTO.titolo}
        sottotitolo={SEZIONI.REGOLAMENTO.sottotitolo}
        azioni={
          scrive ? (
            <BottoneModale
              etichetta="Nuovo regolamento"
              icona="aggiungi"
              titolo="Nuovo regolamento"
              larga
            >
              <FormDocumento tipo="REGOLAMENTO" />
            </BottoneModale>
          ) : undefined
        }
      />

      {documenti.length === 0 ? (
        <Vuoto
          testo={
            scrive
              ? 'Nessun regolamento ancora scritto. Creane uno: lo leggerà tutta la squadra, e anche chi si sta affacciando.'
              : 'Nessun regolamento pubblicato.'
          }
        />
      ) : (
        <div className="space-y-2">
          {documenti.map((d) => (
            <Link
              key={d.id}
              href={`/regolamenti/${d.slug}`}
              className="block rounded-lg border border-line bg-surface px-4 py-3 transition-colors hover:border-nvgdim"
            >
              <p className="font-medium">{d.titolo}</p>
              {d.sottotitolo && <p className="mt-0.5 text-sm text-muted">{d.sottotitolo}</p>}
              <p className="num mt-1 text-[11px] text-muted">
                {d.testo.trim()
                  ? `Aggiornato il ${fmtDate(d.aggiornatoIl)}`
                  : 'Ancora da scrivere'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
