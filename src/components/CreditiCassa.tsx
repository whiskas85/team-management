import Link from 'next/link';
import { creditiDellaCassa } from '@/lib/credito';
import { fmtEuro, inputDate, nomeCompleto } from '@/lib/format';
import { registraCredito, restituisciCredito } from '@/actions/pagamenti';
import { Campo } from './ui';
import { FormAzione } from './Form';
import { BottoneModale } from './Modale';
import { Invia } from './Bottone';

type Persona = { id: string; nome: string; cognome: string; callsign: string | null };
type Metodo = { id: string; nome: string };

/**
 * Chi ha credito in una cassa, e il modo di aggiungerne.
 *
 * Il credito nasce da una quota pagata che non serve più, o da un versamento
 * senza quota: i soldi restano in cassa e restano suoi, e li spende quando
 * paga. Qui si vede di chi sono i soldi che la cassa tiene per conto d'altri.
 */
export async function CreditiCassa({
  cassaId,
  persone,
  metodi,
}: {
  cassaId: string | null;
  persone: Persona[];
  metodi: Metodo[];
}) {
  const crediti = await creditiDellaCassa(cassaId);
  const totale = crediti.reduce((t, c) => t + c.credito, 0);

  return (
    <div className="card mb-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="titolo-sezione">Crediti</p>
          <p className="mt-1 text-xs text-muted">
            {crediti.length === 0
              ? 'Nessuno ha credito. Nasce da una quota pagata che non serve più (evento annullato…) o da un versamento, e si spende quando si paga.'
              : `${fmtEuro(totale)} in cassa per conto di ${crediti.length === 1 ? 'una persona' : `${crediti.length} persone`}: li spendono quando pagano le prossime quote.`}
          </p>
        </div>
        <BottoneModale
          etichetta="Registra versamento"
          icona="incassa"
          titolo="Versamento a credito"
          className="btn-primary btn-sm"
        >
          <FormAzione azione={registraCredito}>
            <input type="hidden" name="cassaId" value={cassaId ?? ''} />
            <p className="mb-4 text-sm text-muted">
              I soldi pagano subito le quote aperte di chi versa, in questa cassa; quello che avanza
              resta suo come credito e paga da solo le prossime.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Chi ha versato *" span>
                <select name="userId" required className="input" defaultValue="">
                  <option value="">— seleziona —</option>
                  {persone.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cognome} {p.nome}
                      {p.callsign ? ` · ${p.callsign}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Importo (€) *">
                <input
                  name="importo"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input"
                />
              </Campo>
              <Campo label="Metodo">
                <select name="metodoId" className="input" defaultValue="">
                  <option value="">— non indicato —</option>
                  {metodi.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo label="Data">
                <input
                  type="date"
                  name="data"
                  defaultValue={inputDate(new Date())}
                  className="input"
                />
              </Campo>
              <Campo label="Note">
                <input name="note" className="input" />
              </Campo>
            </div>
            <Invia icona="incassa">Registra</Invia>
          </FormAzione>
        </BottoneModale>
      </div>

      {crediti.length > 0 && (
        <ul className="divide-y divide-line border-t border-line">
          {crediti.map((c) => (
            <li key={c.userId} className="flex items-center gap-3 py-2">
              {/* la scheda della persona la apre la segreteria del club: chi
                  tiene un'altra cassa vede il nome e basta */}
              {cassaId === null ? (
                <Link
                  href={`/admin/operatori/${c.userId}`}
                  className="min-w-0 flex-1 break-words text-sm hover:text-nvg"
                >
                  {nomeCompleto(c.user)}
                </Link>
              ) : (
                <span className="min-w-0 flex-1 break-words text-sm">{nomeCompleto(c.user)}</span>
              )}
              <span className="num shrink-0 text-sm font-semibold text-nvg">
                {fmtEuro(c.credito)}
              </span>
              <BottoneModale
                etichetta="Restituisci"
                icona="pagamenti"
                titolo={`Restituisci il credito a ${nomeCompleto(c.user)}`}
                className="btn-ghost btn-sm"
                compatto
              >
                <FormAzione azione={restituisciCredito}>
                  <input type="hidden" name="cassaId" value={cassaId ?? ''} />
                  <input type="hidden" name="userId" value={c.userId} />
                  <p className="mb-4 text-sm text-muted">
                    I soldi escono dalla cassa e tornano a chi li aveva versati. Il credito è di{' '}
                    <strong className="text-ink">{fmtEuro(c.credito)}</strong>.
                  </p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo label="Quanto (€)">
                      <input
                        name="importo"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={c.credito}
                        defaultValue={c.credito}
                        className="input"
                      />
                    </Campo>
                    <Campo label="Note">
                      <input name="note" className="input" />
                    </Campo>
                  </div>
                  <Invia icona="pagamenti">Restituisci</Invia>
                </FormAzione>
              </BottoneModale>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
