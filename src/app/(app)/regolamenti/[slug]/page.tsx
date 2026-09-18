import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { documentoDa, puoScrivere } from '@/lib/documenti';
import { Intestazione } from '@/components/ui';
import { BottoneModale } from '@/components/Modale';
import { FormDocumento, LeggiDocumento, type DocumentoLetto } from '@/components/Documento';
import { eliminaDocumento } from '@/actions/documenti';
import { BottoneElimina } from '@/components/CardRiga';

export const dynamic = 'force-dynamic';

export default async function RegolamentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const me = await requireUser();
  const { slug } = await params;

  const documento = (await documentoDa(slug)) as DocumentoLetto & { tipo: string } | null;
  // dalla sezione dei regolamenti non si arriva allo statuto anche indovinando
  // l'indirizzo: quello ha una pagina sua, con le sue regole di lettura
  if (!documento || documento.tipo !== 'REGOLAMENTO') notFound();

  const scrive = puoScrivere(me.roles);

  return (
    <>
      <Link href="/regolamenti" className="mb-4 inline-block text-xs text-muted hover:text-nvg">
        ← Regolamenti
      </Link>

      <Intestazione
        titolo={documento.titolo}
        sottotitolo={documento.sottotitolo ?? undefined}
        azioni={
          scrive ? (
            <>
              <BottoneModale
                etichetta="Modifica"
                icona="modifica"
                titolo={`Modifica ${documento.titolo.toLowerCase()}`}
                larga
              >
                <FormDocumento documento={documento} />
              </BottoneModale>
              <BottoneElimina
                azione={eliminaDocumento}
                valori={{ id: documento.id }}
                conferma={`Eliminare "${documento.titolo}"? Il testo non si recupera.`}
                etichetta="Elimina"
              />
            </>
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
