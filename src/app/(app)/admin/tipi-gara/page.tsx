import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { OrdinaTipologie } from '@/components/OrdinaTipologie';
import { eliminaTipoGara, riordinaTipiGara, salvaTipoGara } from '@/actions/tipiGara';

export const dynamic = 'force-dynamic';

/**
 * I tipi di gara, per l'admin.
 *
 * È l'elenco che compare nella tendina quando si crea un'attività: 24 ore,
 * scenario, speedsoft, torneo a squadre. Sta di fianco alle tipologie e non
 * dentro, perché rispondono a due domande diverse — la tipologia dice **come
 * si comporta il gestionale** su quella giornata, il tipo di gara dice **che
 * gara è**. Un formato nuovo si aggiunge qui senza toccare nessuna regola,
 * ed è il motivo per cui è una tabella e non un elenco scritto nel codice.
 */

type TipoGara = {
  id: string;
  nome: string;
  descrizione: string | null;
  ordine: number;
  attivo: boolean;
};

export default async function TipiGaraPage() {
  await requirePermesso(isAdmin);

  const tipi = await prisma.tipoGara.findMany({
    orderBy: [{ attivo: 'desc' }, { ordine: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { eventi: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="Tipi di gara"
        sottotitolo="Dati di base: che gara è — 24 ore, scenario, speedsoft, torneo"
        azioni={
          <BottoneModale etichetta="Aggiungi tipo" icona="aggiungi" titolo="Nuovo tipo di gara">
            <FormAzione azione={salvaTipoGara}>
              <CampiTipoGara />
              <Invia icona="salva">Aggiungi</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      {tipi.length === 0 ? (
        <Vuoto testo="Nessun tipo di gara. Aggiungine uno — «24 ore», «Scenario», «Speedsoft» — e comparirà nella tendina quando crei un'attività." />
      ) : (
        <OrdinaTipologie
          azione={riordinaTipiGara}
          righe={tipi.map((t) => ({
            id: t.id,
            attivo: t.attivo,
            card: (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{t.nome}</span>
                  <Badge tono={t.attivo ? 'ok' : 'neutro'}>
                    {t.attivo ? 'Attivo' : 'Disattivato'}
                  </Badge>
                </div>
                {t.descrizione && (
                  <p className="mt-1 text-sm text-muted">{t.descrizione}</p>
                )}
                <p className="mt-1 num text-[11px] text-muted">
                  {t._count.eventi} {t._count.eventi === 1 ? 'attività' : 'attività'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                  <Azioni tipo={t} />
                </div>
              </>
            ),
            celle: (
              <>
                <td className="font-medium">{t.nome}</td>
                <td className="text-muted">{t.descrizione ?? '—'}</td>
                <td className="num text-muted">{t._count.eventi}</td>
                <td>
                  <Badge tono={t.attivo ? 'ok' : 'neutro'}>
                    {t.attivo ? 'Attivo' : 'Disattivato'}
                  </Badge>
                </td>
                <td className="whitespace-nowrap">
                  <div className="flex gap-2">
                    <Azioni tipo={t} />
                  </div>
                </td>
              </>
            ),
          }))}
        />
      )}

      <p className="mt-4 text-xs text-muted">
        Il tipo di gara racconta <strong className="text-ink">che gara è</strong>, e non cambia il
        comportamento del gestionale: chi schiera, chi paga e quale certificato serve restano
        decisioni della <strong className="text-ink">tipologia di attività</strong>. La durata
        dichiarata — la «24h» del volantino — si scrive invece sull’attività, perché è di quella
        gara lì.
      </p>
    </>
  );
}

function Azioni({ tipo }: { tipo: TipoGara }) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${tipo.nome}"`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaTipoGara}>
          <input type="hidden" name="id" value={tipo.id} />
          <CampiTipoGara tipo={tipo} />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      <AzioneBottone
        azione={eliminaTipoGara}
        valori={{ id: tipo.id }}
        icona="elimina"
        conferma={`Eliminare il tipo di gara "${tipo.nome}"? Se è già usato verrà solo disattivato.`}
        className="btn-danger btn-sm"
      >
        Elimina
      </AzioneBottone>
    </>
  );
}

function CampiTipoGara({ tipo }: { tipo?: TipoGara }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4">
      <Campo label="Nome *">
        <input
          name="nome"
          required
          defaultValue={tipo?.nome}
          className="input"
          maxLength={80}
          placeholder="24 ore, Scenario, Speedsoft…"
        />
      </Campo>
      <Campo label="Descrizione">
        <input
          name="descrizione"
          defaultValue={tipo?.descrizione ?? ''}
          className="input"
          maxLength={200}
          placeholder="Come si gioca, cosa la distingue"
        />
      </Campo>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={tipo ? tipo.attivo : true}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span>
          Attivo
          <span className="block text-[11px] text-muted">
            Disattivato sparisce dalla tendina ma resta scritto sulle gare passate: un formato che
            non si usa più non deve cancellare la storia di chi c’è andato.
          </span>
        </span>
      </label>
    </div>
  );
}
