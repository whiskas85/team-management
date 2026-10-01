import { confermaNoleggio, rifiutaNoleggio } from '@/actions/eventi';
import { AzioneBottone } from './AzioneBottone';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Badge, Campo } from './ui';

export type RigaNoleggio = {
  id: string;
  nome: string;
  stato: 'RICHIESTO' | 'CONFERMATO';
};

/**
 * I kit a noleggio di un'attività, per chi organizza: quanti ce ne sono,
 * quanti sono già dati, chi aspetta. Confermare somma il kit alla quota;
 * rifiutare toglie la persona dall'attività, con il motivo che le arriva.
 */
export function PannelloNoleggi({
  kit,
  righe,
  prezzo,
}: {
  kit: number;
  righe: RigaNoleggio[];
  /** Dal Tariffario: null se manca la voce, e allora non si conferma. */
  prezzo: number | null;
}) {
  const confermati = righe.filter((r) => r.stato === 'CONFERMATO').length;
  const attesa = righe.filter((r) => r.stato === 'RICHIESTO');
  const finiti = confermati >= kit;
  const euro = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Kit a noleggio</p>
        <span className={`num text-sm ${finiti ? 'text-warn' : 'text-muted'}`}>
          {confermati} su {kit} confermati
          {attesa.length > 0 ? ` · ${attesa.length} in attesa` : ''}
        </span>
      </div>
      {prezzo === null && (
        <p className="mb-3 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          Nel Tariffario manca la voce con l’uso «Noleggio attrezzatura»: i nuovi non vedono la
          richiesta, e non si conferma finché non c’è.
        </p>
      )}
      {righe.length === 0 ? (
        <p className="text-sm text-muted">Nessuno l’ha chiesto.</p>
      ) : (
        <div className="space-y-2">
          {righe.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 break-words text-sm">{r.nome}</span>
              {r.stato === 'CONFERMATO' ? (
                <Badge tono="ok">confermato</Badge>
              ) : (
                <span className="flex flex-wrap items-center gap-2">
                  <AzioneBottone
                    azione={confermaNoleggio}
                    valori={{ id: r.id }}
                    icona="approva"
                    className="btn-ghost btn-sm"
                    disabilitato={finiti || prezzo === null}
                  >
                    Conferma{prezzo !== null ? ` (+${euro(prezzo)})` : ''}
                  </AzioneBottone>
                  <BottoneModale
                    etichetta="Rifiuta"
                    icona="annulla"
                    titolo="Rifiuta il kit"
                    className="btn-ghost btn-sm"
                  >
                    <FormAzione azione={rifiutaNoleggio} className="space-y-4">
                      <input type="hidden" name="id" value={r.id} />
                      <p className="text-sm font-medium">{r.nome}</p>
                      <p className="text-sm text-muted">
                        Senza kit non gioca: la sua adesione si toglie, e riceve un avviso con il
                        motivo.
                      </p>
                      <Campo label="Perché lo rifiuti *" span>
                        <textarea
                          name="motivo"
                          rows={3}
                          required
                          maxLength={300}
                          className="input"
                          placeholder="Kit finiti, taglia non disponibile…"
                        />
                      </Campo>
                      <Invia icona="annulla">Rifiuta e togli l’adesione</Invia>
                    </FormAzione>
                  </BottoneModale>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {finiti && attesa.length > 0 && (
        <p className="mt-3 text-xs text-warn">
          I kit sono finiti: chi è in attesa si può solo rifiutare, o aumentare i kit dalla modifica
          dell’attività.
        </p>
      )}
    </div>
  );
}
