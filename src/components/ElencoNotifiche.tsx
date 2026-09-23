'use client';

import { Avatar, Badge, Elenco, Vuoto } from './ui';
import { ListaFiltrata } from './Filtri';

export type RigaNotifiche = {
  id: string;
  nome: string;
  cognome: string;
  callsign: string | null;
  /** I dispositivi iscritti, già raccontati: «iPhone · dal 3 mar». */
  dispositivi: string[];
  /** Ultima volta che ha usato il gestionale, già formattata. */
  ultimaAttivita: string | null;
  /** Perché la domanda «le riceve?» abbia senso: chi non entra mai non conta. */
  maiEntrato: boolean;
  /** La versione del gestionale che ha visto l'ultima volta. */
  versione: string | null;
  /** La versione del service worker sul suo dispositivo, come la dice lui. */
  sw: string | null;
  /** Il service worker non è quello di adesso: le notifiche si comportano da vecchie. */
  swVecchio: boolean;
};

/**
 * Le due versioni, sotto il nome.
 *
 * Quella del gestionale dice cos'ha visto l'ultima volta; quella del service
 * worker dice cosa gli gira sul telefono adesso, ed è quella che decide come
 * si comporta una notifica. Sono diverse apposta: il service worker si
 * aggiorna per conto suo, quando gli pare il browser.
 */
function Versioni({ o }: { o: RigaNotifiche }) {
  if (!o.versione && !o.sw) return null;
  return (
    <span className="text-[11px] num">
      {o.versione && <span className="text-muted">app v{o.versione}</span>}
      {o.sw && (
        <span className={o.swVecchio ? 'text-warn' : 'text-muted'}>
          {o.versione ? ' · ' : ''}
          avvisi {o.sw === 'vecchia' ? 'versione vecchia' : `v${o.sw}`}
        </span>
      )}
    </span>
  );
}

/**
 * Chi riceve gli avvisi sul telefono, e chi no.
 *
 * Una notifica non si può controllare da qui: la concede il telefono, una
 * volta sola, e se qualcuno ha detto no quel giorno **il gestionale non lo
 * sa più** — prova a mandare, il servizio di push accetta, e il messaggio non
 * arriva a nessuno. Il risultato è che si manda un avviso importante
 * convinti che sia arrivato a venti persone quando ne raggiunge sei.
 *
 * Questa vista risponde a quella domanda e basta: **su chi posso contare, se
 * mando un avviso adesso?** I dispositivi si vedono uno per uno perché è
 * normale averne due — il telefono e il computer di casa — e chi ne ha zero
 * va chiamato in un altro modo.
 */
export function ElencoNotifiche({ righe }: { righe: RigaNotifiche[] }) {
  return (
    <ListaFiltrata
      elementi={righe}
      segnaposto="Nome o callsign…"
      cerca={(o) => `${o.nome} ${o.cognome} ${o.callsign ?? ''}`}
      filtri={[
        {
          nome: 'avvisi',
          etichetta: 'Avvisi',
          opzioni: [
            { valore: 'si', testo: 'Li riceve' },
            { valore: 'no', testo: 'Non li riceve' },
          ],
        },
      ]}
      valoreFiltro={(o) => (o.dispositivi.length > 0 ? 'si' : 'no')}
    >
      {(lista) =>
        lista.length === 0 ? (
          <Vuoto testo="Nessuno corrisponde ai filtri." />
        ) : (
          <Elenco
            cards={lista.map((o) => (
              <div key={o.id} className="card">
                <div className="flex items-start gap-3">
                  <Avatar iniziali={`${o.nome[0] ?? ''}${o.cognome[0] ?? ''}`.toUpperCase()} />
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words font-medium">
                      {o.cognome} {o.nome}
                      {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                    </h3>
                    <p className="text-xs num text-muted">
                      {o.ultimaAttivita ? `visto ${o.ultimaAttivita}` : 'mai entrato'}
                    </p>
                    <p>
                      <Versioni o={o} />
                    </p>
                  </div>
                  <Badge tono={o.dispositivi.length > 0 ? 'ok' : o.maiEntrato ? 'neutro' : 'warn'}>
                    {o.dispositivi.length > 0
                      ? `${o.dispositivi.length} ${o.dispositivi.length === 1 ? 'dispositivo' : 'dispositivi'}`
                      : 'niente avvisi'}
                  </Badge>
                </div>

                {o.dispositivi.length > 0 && (
                  <ul className="mt-2 space-y-0.5 pl-11">
                    {o.dispositivi.map((d) => (
                      <li key={d} className="truncate text-[11px] text-muted">
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            tabella={
              <table className="tabella">
                <thead>
                  <tr>
                    <th>Operatore</th>
                    <th>Avvisi</th>
                    <th>Dispositivi</th>
                    <th>Ultima volta</th>
                    <th>Versioni</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.cognome} {o.nome}
                        {o.callsign && <span className="text-nvg"> · {o.callsign}</span>}
                      </td>
                      <td>
                        <Badge
                          tono={o.dispositivi.length > 0 ? 'ok' : o.maiEntrato ? 'neutro' : 'warn'}
                        >
                          {o.dispositivi.length > 0 ? 'li riceve' : 'no'}
                        </Badge>
                      </td>
                      <td className="text-xs text-muted">
                        {o.dispositivi.length === 0 ? '—' : o.dispositivi.join(' · ')}
                      </td>
                      <td className="num text-xs text-muted">
                        {o.ultimaAttivita ?? 'mai entrato'}
                      </td>
                      <td className="whitespace-nowrap">
                        <Versioni o={o} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          />
        )
      }
    </ListaFiltrata>
  );
}
