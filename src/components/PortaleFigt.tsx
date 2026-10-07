import { fmtDate } from '@/lib/format';
import { Campo } from './ui';
import { FormAzione } from './Form';
import { BottoneModale } from './Modale';
import { AzioneBottone } from './AzioneBottone';
import { Invia } from './Bottone';
import { salvaCredenzialiFigt, scollegaFigt } from '@/actions/figt';

/**
 * L'accesso al portale federale (ASNWG): utenza, password, id dell'anagrafica
 * e dell'affiliazione. Serve a importare le tessere e a fare le polizze prova.
 * Sta in «La mia squadra», con gli altri collegamenti verso fuori.
 */
export function PortaleFigt({
  collegamento,
}: {
  collegamento: {
    login: string;
    idAnagrafica: string | null;
    idAffiliazione: string | null;
    ultimoAccesso: Date | null;
    ultimoEsito: string | null;
  } | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
    <BottoneModale
      etichetta={collegamento ? 'Collegamento' : 'Collega il portale'}
      icona="modifica"
      titolo="Accesso al portale federale"
      className={collegamento ? 'btn-ghost btn-sm' : 'btn-primary'}
    >
      <FormAzione azione={salvaCredenzialiFigt}>
        {collegamento ? (
          <p className="mb-4 rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-xs text-nvg">
            Collegato come <strong>{collegamento.login}</strong>
            {collegamento.ultimoAccesso
              ? ` · ultimo accesso ${fmtDate(collegamento.ultimoAccesso)}`
              : ''}
            {collegamento.ultimoEsito ? ` · ${collegamento.ultimoEsito}` : ''}.
          </p>
        ) : (
          <p className="mb-4 text-sm text-muted">
            Utenza e password del portale ASNWG, quelle con cui entri tu. Le provo subito: se il
            portale non le accetta non le salvo.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Utenza *">
            <input
              name="login"
              required
              defaultValue={collegamento?.login ?? ''}
              className="input"
              autoComplete="username"
            />
          </Campo>
          <Campo label={collegamento ? 'Password' : 'Password *'}>
            <input
              name="password"
              type="password"
              required={!collegamento}
              className="input"
              autoComplete="current-password"
              placeholder={collegamento ? 'vuota: resta quella salvata' : ''}
            />
          </Campo>
        </div>

        {/* id anagrafica e affiliazione non si chiedono più: li legge il
            gestionale dal portale, entrando */}
        <p className="mt-2 text-xs text-muted">
          Il codice dell’associazione e le affiliazioni li leggo io dal portale: fra queste uso
          quella attiva il giorno della giocata.
        </p>

        <p className="mt-2 text-[11px] text-muted">
          La password viene ricordata cifrata. Non si può sostituire con un’impronta come
          quelle di accesso al gestionale: per entrare nel portale serve in chiaro. La
          legge solo il server, e solo durante l’importazione.
        </p>

        <Invia icona="salva" attesa="Verifico…">
          {collegamento ? 'Aggiorna e ricorda' : 'Collega e ricorda'}
        </Invia>
      </FormAzione>
    </BottoneModale>

    {collegamento && (
      <AzioneBottone
        azione={scollegaFigt}
        valori={{}}
        icona="elimina"
        conferma="Dimenticare le credenziali del portale federale?"
        className="btn-danger btn-sm"
      >
        Scollega
      </AzioneBottone>
    )}
    </div>
  );
}
