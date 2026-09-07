import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { documentoDa, puoLeggere, puoScrivere, SEZIONI } from '@/lib/documenti';
import { Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormDocumento, LeggiDocumento, type DocumentoLetto } from '@/components/Documento';

export const dynamic = 'force-dynamic';

/**
 * Lo statuto, per chi è dentro.
 *
 * Dice come funziona il team: scopo, soci, organi, quote. Non riguarda chi si è
 * appena affacciato — a lui si mostrano i regolamenti, che stanno nella loro
 * sezione e li legge chiunque.
 */
export default async function StatutoPage() {
  const me = await requireUser();
  if (!puoLeggere('STATUTO', me.stato)) redirect('/dashboard?errore=permessi');

  const documento = (await documentoDa('statuto')) as DocumentoLetto | null;
  const scrive = puoScrivere(me.roles);

  if (!documento) {
    return (
      <>
        <Intestazione titolo="Statuto" sottotitolo={SEZIONI.STATUTO.sottotitolo} />
        <Vuoto testo="Lo statuto non è ancora stato creato." />
      </>
    );
  }

  return (
    <>
      <Intestazione
        titolo={documento.titolo}
        sottotitolo={documento.sottotitolo ?? SEZIONI.STATUTO.sottotitolo}
        azioni={
          scrive ? (
            <BottoneModale etichetta="Modifica" icona="modifica" titolo="Modifica lo statuto" larga>
              <FormDocumento documento={documento} />
            </BottoneModale>
          ) : undefined
        }
      />

      <LeggiDocumento
        documento={documento}
        vuoto={
          scrive
            ? 'Statuto non ancora scritto: aprilo con Modifica e incolla il testo.'
            : 'Statuto non ancora pubblicato.'
        }
      />
    </>
  );
}
