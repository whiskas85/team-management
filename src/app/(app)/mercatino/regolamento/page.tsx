import { requireUser } from '@/lib/auth';
import { documentoDa, puoScrivere } from '@/lib/documenti';
import { Intestazione, Vuoto } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormDocumento, LeggiDocumento, type DocumentoLetto } from '@/components/Documento';

export const dynamic = 'force-dynamic';

/** Lo slug del documento che questa pagina mostra. */
const SLUG = 'mercatino';

/**
 * Il regolamento del mercatino, dentro il mercatino.
 *
 * Sta qui e non solo fra i Regolamenti perché è qui che serve: le regole di
 * una bacheca si leggono mentre la si usa, non andandole a cercare in un'altra
 * sezione. È lo stesso documento — chi lo corregge lo corregge una volta sola
 * — e resta anche nell'elenco dei regolamenti, dove uno va a cercare le regole
 * quando non sa già di quale ha bisogno.
 */
export default async function RegolamentoMercatinoPage() {
  const me = await requireUser();
  const documento = (await documentoDa(SLUG)) as (DocumentoLetto & { tipo: string }) | null;
  const scrive = puoScrivere(me.roles);

  if (!documento) {
    return (
      <>
        <Intestazione titolo="Regolamento del mercatino" />
        <Vuoto
          testo={
            scrive
              ? 'Non c’è ancora: si scrive dalla sezione Regolamenti, con il titolo che preferisci.'
              : 'Non ancora pubblicato.'
          }
        />
      </>
    );
  }

  return (
    <>
      <Intestazione
        titolo={documento.titolo}
        sottotitolo={documento.sottotitolo ?? undefined}
        azioni={
          scrive ? (
            <BottoneModale
              etichetta="Modifica"
              icona="modifica"
              titolo="Modifica il regolamento del mercatino"
              larga
            >
              <FormDocumento documento={documento} />
            </BottoneModale>
          ) : undefined
        }
      />

      <LeggiDocumento
        documento={documento}
        vuoto={
          scrive
            ? 'Non ancora scritto: aprilo con Modifica e incolla il testo.'
            : 'Non ancora pubblicato.'
        }
      />
    </>
  );
}
