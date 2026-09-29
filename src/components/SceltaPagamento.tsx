'use client';

import { useState, type ReactNode } from 'react';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { pagaColCredito } from '@/actions/pagamenti';
import { fmtEuro } from '@/lib/format';

/**
 * Come si paga, quando c'è del credito: prima il credito, già scelto, poi gli
 * altri metodi a un tocco. Il credito è soldi già in cassa, quindi pagare con
 * quello è un gesto solo e non va confermato da nessuno.
 *
 * Se il credito non basta paga fin dove arriva, e il resto si paga con un
 * altro metodo — lo si dice prima di premere.
 */
export function SceltaPagamento({
  paymentId,
  credito,
  daPagare,
  children,
}: {
  paymentId: string;
  credito: number;
  daPagare: number;
  /** Gli altri metodi: la parte «come pagare» e la segnalazione di sempre. */
  children: ReactNode;
}) {
  const [conCredito, setConCredito] = useState(true);
  const usa = Math.min(credito, daPagare);
  const resta = Math.max(0, daPagare - credito);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface2 p-1 text-sm">
        <button
          type="button"
          onClick={() => setConCredito(true)}
          aria-pressed={conCredito}
          className={`rounded-md px-3 py-2 ${conCredito ? 'bg-nvg/15 text-nvg' : 'text-muted'}`}
        >
          Col credito
          <span className="num block text-[11px]">{fmtEuro(credito)} disponibili</span>
        </button>
        <button
          type="button"
          onClick={() => setConCredito(false)}
          aria-pressed={!conCredito}
          className={`rounded-md px-3 py-2 ${!conCredito ? 'bg-nvg/15 text-nvg' : 'text-muted'}`}
        >
          Altro metodo
          <span className="block text-[11px]">bonifico, PayPal…</span>
        </button>
      </div>

      {conCredito ? (
        <FormAzione azione={pagaColCredito}>
          <input type="hidden" name="id" value={paymentId} />
          <p className="text-sm">
            Paghi <strong className="num text-nvg">{fmtEuro(usa)}</strong> col tuo credito
            {resta > 0 ? (
              <>
                : non basta per tutto, restano{' '}
                <strong className="num text-warn">{fmtEuro(resta)}</strong> da pagare con un altro
                metodo.
              </>
            ) : (
              <>
                {' '}
                e ti restano <span className="num">{fmtEuro(credito - usa)}</span> di credito.
              </>
            )}
          </p>
          <Invia icona="incassa">Paga col credito</Invia>
          <p className="text-xs text-muted">
            I soldi sono già in cassa: la quota risulta pagata subito, senza conferme.
          </p>
        </FormAzione>
      ) : (
        children
      )}
    </div>
  );
}
