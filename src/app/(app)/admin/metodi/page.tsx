import { requirePermesso } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/domain';
import { Badge, Campo, Intestazione, Vuoto } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { eliminaMetodo, ordinaMetodi, salvaMetodo } from '@/actions/metodi';
import { ElencoOrdinabile } from '@/components/ElencoOrdinabile';
import { BottoneElimina, CardRiga } from '@/components/CardRiga';

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

  // solo quelli del club: i metodi delle altre casse stanno con la loro cassa
  const metodi = await prisma.metodoPagamento.findMany({
    where: { cassaId: null },
    // nell'ordine scelto trascinando: è quello della tendina di chi paga
    orderBy: [{ ordine: 'asc' }, { nome: 'asc' }],
    include: { _count: { select: { payments: true } } },
  });

  return (
    <>
      <Intestazione
        titolo="Metodi di pagamento"
        sottotitolo="Con cosa si incassano le quote del club, e cosa si può dichiarare da sé. Quelli delle altre casse stanno in Altre casse"
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
        // Un elenco di card che si riordina dalla maniglia: l'ordine è quello
        // in cui chi paga trova i metodi. Prima c'era un numero da scrivere a
        // mano in ogni metodo, e per spostarne uno si rinumeravano tutti.
        <ElencoOrdinabile
          azione={ordinaMetodi}
          elementi={metodi.map((m) => ({
            id: m.id,
            contenuto: (
              <CardRiga
                card
                className={m.attivo ? '' : 'opacity-60'}
                titolo={m.nome}
                sottotitolo={
                  <>
                    {m.descrizione && <span className="block">{m.descrizione}</span>}
                    {m.istruzioni && (
                      <span className="block whitespace-pre-line">{m.istruzioni}</span>
                    )}
                    <span className="num">{m._count.payments} movimenti</span>
                  </>
                }
                elimina={<EliminaMetodo metodo={m} />}
                azioni={<Azioni metodo={m} />}
              >
                {(m.selfService || !m.attivo) && (
                  <span className="flex flex-wrap gap-2">
                    {m.selfService && <Badge tono="ok">Dichiarabile</Badge>}
                    {!m.attivo && <Badge tono="neutro">Disattivato</Badge>}
                  </span>
                )}
              </CardRiga>
            ),
          }))}
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
    </>
  );
}

/** Il cestino di un metodo: in alto a destra della sua card. */
function EliminaMetodo({ metodo }: { metodo: Metodo }) {
  return (
    <BottoneElimina
      azione={eliminaMetodo}
      valori={{ id: metodo.id }}
      conferma={`Eliminare "${metodo.nome}"? Se è già usato verrà solo disattivato.`}
      etichetta={`Elimina ${metodo.nome}`}
    />
  );
}

function CampiMetodo({ metodo }: { metodo?: Metodo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Campo label="Nome *" span>
        <input name="nome" required defaultValue={metodo?.nome} className="input" />
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
        {/* chi scrive le istruzioni deve sapere che un indirizzo non resta
            testo: altrimenti lo spezza, o lo mette in un posto dove non serve */}
        <p className="mt-1 text-[11px] text-muted">
          Se dentro c’è un link — paypal.me/…, un link Satispay — chi paga trova il pulsante
          «Paga con …» che lo porta lì.
        </p>
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
