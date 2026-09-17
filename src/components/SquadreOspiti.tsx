import { AzioneBottone } from './AzioneBottone';
import { CondividiEvento } from './CondividiEvento';
import { BottoneModale } from './Modale';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { Campo } from './ui';
import { aggiungiSquadraOspite, segnaOperatoriOspite, togliSquadraOspite } from '@/actions/ospiti';

export type Ospite = {
  id: string;
  nome: string;
  operatori: number | null;
  /** L'indirizzo completo della sua pagina: è quello che si manda fuori. */
  link: string;
  rispostoIl: string | null;
};

/**
 * Le squadre di fuori, dentro la scheda dell'attività.
 *
 * Ognuna ha **il suo link**, e non è un dettaglio tecnico: mandando lo stesso
 * indirizzo a tutti non si saprebbe mai chi ha risposto cosa, e il primo che
 * scrive un numero lo scriverebbe per tutti. Un link per squadra vuol dire una
 * riga per squadra, con accanto quello che ha detto.
 *
 * «Non ancora» è scritto apposta al posto di uno zero: una squadra che non ha
 * risposto e una che ha detto «non veniamo» richiedono due telefonate diverse.
 */
export function SquadreOspiti({
  eventId,
  ospiti,
  conosciute,
  puoGestire,
  puoCondividere = false,
}: {
  eventId: string;
  ospiti: Ospite[];
  /** Le squadre già in anagrafica, da scegliere invece di riscriverle. */
  conosciute: { id: string; nome: string }[];
  puoGestire: boolean;
  /**
   * Può mandare via il link di una squadra già invitata, ma non invitarne o
   * toglierne.
   *
   * È il caso del **referente**: è il nome scritto nella scheda come persona a
   * cui chiedere, e il giorno prima è lui che si sente dire «non ci è arrivato
   * niente». Doverlo far chiedere a un team leader per rimandare un link che
   * esiste già è un giro che serve solo a far tardi. Invitare una squadra o
   * toglierla resta un'altra cosa: quella decide chi si gioca con chi.
   */
  puoCondividere?: boolean;
}) {
  if (!puoGestire && ospiti.length === 0) return null;

  const totale = ospiti.reduce((t, o) => t + (o.operatori ?? 0), 0);

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <p className="titolo-sezione">Squadre ospiti</p>
        {ospiti.length > 0 && (
          <p className="num text-xs text-muted">
            {totale} operatori annunciati da {ospiti.length}{' '}
            {ospiti.length === 1 ? 'squadra' : 'squadre'}
          </p>
        )}
      </div>

      {ospiti.length === 0 ? (
        <p className="text-sm text-muted">
          Nessuna squadra di fuori. Invitandone una si ottiene un link da mandare al loro
          referente: vedrà quando, dove e in quanti siamo, e dirà in quanti vengono.
        </p>
      ) : (
        <ul className="space-y-2">
          {ospiti.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line pb-2 last:border-0 last:pb-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{o.nome}</span>
                <span className="text-[11px] text-muted">
                  {o.operatori === null
                    ? 'non ha ancora risposto'
                    : o.operatori === 0
                      ? `ha detto che non vengono · ${o.rispostoIl}`
                      : `${o.operatori} operatori · ${o.rispostoIl}`}
                </span>
              </span>

              {/* Chi non gestisce ma tiene in mano l'attività può solo
                  rimandare il link: è il gesto che gli tocca quando una
                  squadra dice di non averlo ricevuto. */}
              {!puoGestire && puoCondividere && (
                <CondividiEvento
                  indirizzo={o.link}
                  etichetta={`Condividi il link di ${o.nome}`}
                />
              )}

              {puoGestire && (
                <span className="flex flex-wrap items-center gap-2">
                  {/* Il numero si può scrivere anche da qui: il referente
                      spesso lo dice in chat o al telefono, e pretendere che
                      apra il link per forza lascerebbe il conteggio a metà
                      per un formalismo. */}
                  <FormAzione azione={segnaOperatoriOspite} className="flex items-center gap-1.5">
                    <input type="hidden" name="id" value={o.id} />
                    <input
                      name="operatori"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={500}
                      defaultValue={o.operatori ?? ''}
                      placeholder="—"
                      aria-label={`Operatori di ${o.nome}`}
                      className="input num h-8 w-20 text-sm"
                    />
                    <Invia icona="salva" className="btn-ghost btn-sm">
                      Segna
                    </Invia>
                  </FormAzione>

                  {/* il link è di quella squadra: mandarlo è il gesto per cui
                      questa riga esiste */}
                  <CondividiEvento
                    indirizzo={o.link}
                    etichetta={`Condividi il link di ${o.nome}`}
                  />
                  <AzioneBottone
                    azione={togliSquadraOspite}
                    valori={{ id: o.id }}
                    icona="elimina"
                    conferma={`Togliere "${o.nome}" dagli ospiti? Il loro link smette di funzionare.`}
                    className="btn-danger btn-sm"
                  >
                    Togli
                  </AzioneBottone>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {puoGestire && (
        <div className="mt-4 border-t border-line pt-3">
          <BottoneModale etichetta="Invita una squadra" icona="aggiungi" titolo="Invita una squadra">
            <FormAzione azione={aggiungiSquadraOspite}>
              <input type="hidden" name="eventId" value={eventId} />

              <p className="text-sm text-muted">
                Scegline una fra quelle che conosciamo, oppure scrivi il nome di chi non è ancora
                in anagrafica. Il link si copia dalla riga, appena creata.
              </p>

              <Campo label="Squadra conosciuta" span>
                <select name="squadraId" className="input" defaultValue="">
                  <option value="">— scrivo il nome a mano —</option>
                  {conosciute.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Oppure il nome" span>
                <input name="nome" className="input" placeholder="Come si chiamano" />
              </Campo>

              <Invia icona="invita">Crea l’invito</Invia>
            </FormAzione>
          </BottoneModale>
        </div>
      )}
    </div>
  );
}
