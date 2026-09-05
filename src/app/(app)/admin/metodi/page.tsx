import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { Badge, Campo, Elenco, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { eliminaMetodo, salvaMetodo } from '@/actions/metodi';

type Metodo = {
  id: string;
  nome: string;
  descrizione: string | null;
  istruzioni: string | null;
  selfService: boolean;
  ordine: number;
  attivo: boolean;
};

export default async function MetodiPage() {
  await requirePermesso(isAdmin);

  const metodi = await prisma.metodoPagamento.findMany({
    orderBy: [{ attivo: 'desc' }, { ordine: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { payments: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="Metodi di pagamento"
        sottotitolo="Dati di base: con cosa si incassano le quote, e cosa l'operatore può dichiarare da sé"
        azioni={
          <BottoneModale etichetta="Aggiungi metodo" icona="aggiungi" titolo="Nuovo metodo">
            <FormAzione azione={salvaMetodo}>
              <CampiMetodo />
              <Invia icona="salva">Aggiungi</Invia>
            </FormAzione>
          </BottoneModale>
        }
      />

      {metodi.length === 0 ? (
        <Vuoto testo="Nessun metodo definito." />
      ) : (
        <Elenco
          cards={metodi.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{m.nome}</h3>
                  {m.descrizione && <p className="text-xs text-muted">{m.descrizione}</p>}
                  <p className="mt-1 text-xs text-muted num">{m._count.payments} movimenti</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.selfService && <Badge tono="ok">Dichiarabile</Badge>}
                  {!m.attivo && <Badge tono="neutro">Disattivato</Badge>}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <Azioni metodo={m} />
              </div>
            </div>
          ))}
          tabella={
            <table className="tabella">
              <thead>
                <tr>
                  <th>Metodo</th>
                  <th>Descrizione</th>
                  <th>Istruzioni per chi paga</th>
                  <th>Dichiarabile</th>
                  <th>Movimenti</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {metodi.map((m) => (
                  <tr key={m.id} className={m.attivo ? '' : 'opacity-50'}>
                    <td className="font-medium">{m.nome}</td>
                    <td className="text-muted">{m.descrizione ?? '—'}</td>
                    <td className="text-muted">{m.istruzioni ?? '—'}</td>
                    <td>
                      {m.selfService ? (
                        <Badge tono="ok">Sì</Badge>
                      ) : (
                        <span className="text-xs text-muted">solo segreteria</span>
                      )}
                    </td>
                    <td className="text-muted num">{m._count.payments}</td>
                    <td>
                      <Badge tono={m.attivo ? 'ok' : 'neutro'}>
                        {m.attivo ? 'Attivo' : 'Disattivato'}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Azioni metodo={m} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}
    </>
  );
}

function Azioni({ metodo }: { metodo: Metodo }) {
  return (
    <>
      <BottoneModale
        etichetta="Modifica"
        icona="modifica"
        titolo={`Modifica "${metodo.nome}"`}
        className="btn-ghost btn-sm"
      >
        <FormAzione azione={salvaMetodo}>
          <input type="hidden" name="id" value={metodo.id} />
          <CampiMetodo metodo={metodo} />
          <Invia icona="salva">Salva</Invia>
        </FormAzione>
      </BottoneModale>

      <AzioneBottone
        azione={eliminaMetodo}
        valori={{ id: metodo.id }}
        icona="elimina"
        conferma={`Eliminare "${metodo.nome}"? Se è già usato verrà solo disattivato.`}
        className="btn-danger btn-sm"
      >
        Elimina
      </AzioneBottone>
    </>
  );
}

function CampiMetodo({ metodo }: { metodo?: Metodo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *">
        <input name="nome" required defaultValue={metodo?.nome} className="input" />
      </Campo>

      <Campo label="Ordine nella tendina">
        <input name="ordine" type="number" defaultValue={metodo?.ordine ?? 0} className="input" />
      </Campo>

      <Campo label="Descrizione" span>
        <input
          name="descrizione"
          defaultValue={metodo?.descrizione ?? ''}
          className="input"
          placeholder="Quando si usa"
        />
      </Campo>

      <Campo label="Istruzioni per chi paga" span>
        <textarea
          name="istruzioni"
          rows={2}
          defaultValue={metodo?.istruzioni ?? ''}
          className="input"
          placeholder="IBAN, numero Satispay, indirizzo PayPal…"
        />
      </Campo>

      <label className="flex min-w-0 items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="selfService"
          defaultChecked={metodo?.selfService ?? false}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--nvg)]"
        />
        <span className="min-w-0">
          L’operatore può dichiararlo da sé
          <span className="block text-[11px] text-muted">
            Il pagamento resta comunque da confermare dalla segreteria: serve solo a segnalare che
            il versamento è partito.
          </span>
        </span>
      </label>

      <label className="flex min-w-0 items-center gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          name="attivo"
          defaultChecked={metodo ? metodo.attivo : true}
          className="h-4 w-4 accent-[color:var(--nvg)]"
        />
        Attivo (selezionabile quando si registra un incasso)
      </label>
    </div>
  );
}
