import { annullaIncasso } from '@/actions/pagamenti';
import { fmtDate, fmtEuro } from '@/lib/format';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';

/**
 * Accanto a una quota incassata: l'incasso si annulla, quando è stato
 * registrato per sbaglio. Si dice quanto è arrivato davvero (di solito
 * niente) e perché; se la persona aveva segnalato il pagamento, si sceglie se
 * la segnalazione torna da confermare o se ne va.
 */
export function AnnullaIncasso({
  pagamento,
}: {
  pagamento: {
    id: string;
    descrizione: string;
    status: string;
    pagato: unknown;
    dichiaratoIl: Date | null;
  };
}) {
  if (pagamento.status !== 'PAGATO' && pagamento.status !== 'PARZIALE') return null;
  const incassato = Number(pagamento.pagato);
  if (incassato <= 0) return null;

  return (
    <BottoneModale
      etichetta="Annulla incasso"
      icona="annulla"
      titolo="Annulla l’incasso"
      className="btn-ghost btn-sm whitespace-nowrap"
    >
      <FormAzione azione={annullaIncasso} className="space-y-4">
        <input type="hidden" name="id" value={pagamento.id} />
        <p className="text-sm font-medium">{pagamento.descrizione}</p>
        <p className="text-sm text-muted">
          Risultano incassati <span className="num">{fmtEuro(incassato)}</span>. Se l’hai registrato
          per sbaglio, indica quanto è arrivato davvero: la quota torna da pagare per il resto.
          Quello pagato col credito torna credito della persona.
        </p>

        <Campo label="Arrivato davvero (€)">
          <input
            name="pagato"
            type="number"
            step="0.01"
            min="0"
            max={incassato}
            defaultValue={0}
            className="input num"
          />
        </Campo>

        {pagamento.dichiaratoIl && (
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1 text-xs text-muted">
              La persona aveva segnalato il pagamento il {fmtDate(pagamento.dichiaratoIl)}:
            </legend>
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="segnalazione"
                value="togli"
                defaultChecked
                className="mt-1"
              />
              <span>
                <strong>Non ha pagato:</strong> la segnalazione si toglie con la ricevuta, e la
                persona riceve un avviso con il motivo.
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input type="radio" name="segnalazione" value="resta" className="mt-1" />
              <span>
                <strong>Torna da confermare:</strong> l’ho confermato troppo presto, lo controllo di
                nuovo.
              </span>
            </label>
          </fieldset>
        )}

        <Campo label="Perché lo annulli *" span>
          <textarea
            name="motivo"
            rows={3}
            required
            maxLength={300}
            className="input"
            placeholder="Confermato per sbaglio, il bonifico non è mai arrivato, riga sbagliata…"
          />
        </Campo>
        <Invia icona="annulla">Annulla l’incasso</Invia>
      </FormAzione>
    </BottoneModale>
  );
}
