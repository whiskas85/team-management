import { fmtDateTime } from '@/lib/format';
import type { DatiOrigine } from '@/lib/eventi-condivisi';
import { BadgeOrganizzatore, type Organizzatore } from './BadgeOrganizzatore';
import { RispostaInvito } from './RispostaInvito';

/**
 * In testa alla scheda di un'attività organizzata da un'altra squadra
 * collegata: chi la organizza, a chi chiedere, e — se è ancora un invito — la
 * risposta da dare.
 *
 * Titolo, date, descrizione e luoghi arrivano da loro e si aggiornano da soli;
 * se il collegamento è stato tolto, l'attività resta com'era e qui lo si dice.
 */
export function BannerCondivisa({
  eventId,
  organizzatore,
  dati,
  accesso,
  aggiornataIl,
  collegata,
  invitata,
  admin,
  tipologie,
}: {
  eventId: string;
  organizzatore: Organizzatore;
  dati: DatiOrigine;
  accesso: string | null;
  aggiornataIl: Date | null;
  /** Il collegamento con loro è ancora attivo. */
  collegata: boolean;
  invitata: boolean;
  admin: boolean;
  /** Le nostre tipologie: accettando se ne sceglie una. */
  tipologie: { id: string; nome: string }[];
}) {
  return (
    <div
      className={`card mb-6 space-y-3 ${invitata ? 'border-nvg/50' : ''}`}
      data-banner-condivisa
    >
      <div className="flex flex-wrap items-center gap-2">
        <BadgeOrganizzatore organizzatore={organizzatore} grande />
        <span className="text-xs text-muted">
          {accesso === 'GESTIONE'
            ? 'Possiamo modificarla anche noi'
            : 'La vediamo, la modificano loro'}
          {aggiornataIl && ` · aggiornata ${fmtDateTime(aggiornataIl)}`}
        </span>
      </div>

      {!collegata && (
        <p className="rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          Il collegamento con {organizzatore.nome} è stato tolto: l’attività resta com’era, ma non
          si aggiorna più.
        </p>
      )}

      {(dati.campo || dati.referenti.length > 0) && (
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          {dati.campo && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-muted">Campo</p>
              <p>
                {dati.campo.nome}
                {(dati.campo.indirizzo || dati.campo.citta) && (
                  <span className="text-muted">
                    {' '}
                    · {[dati.campo.indirizzo, dati.campo.citta].filter(Boolean).join(', ')}
                  </span>
                )}
              </p>
            </div>
          )}
          {dati.referenti.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.06em] text-muted">
                Referenti di {organizzatore.nome}
              </p>
              <ul>
                {dati.referenti.map((r, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3">
                    <span className="font-medium">{r.callsign ?? 'Referente'}</span>
                    {r.telefono && (
                      <a href={`tel:${r.telefono}`} className="num text-muted hover:text-nvg">
                        {r.telefono}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {invitata && (
        <div className="border-t border-line pt-3">
          <p className="text-sm">
            <strong>{organizzatore.nome}</strong> ci invita a questa attività. Finché non rispondi
            la vedi solo tu, come una bozza.
          </p>
          {admin && (
            <div className="mt-3">
              <RispostaInvito
                id={eventId}
                organizzatore={organizzatore.nome}
                ritorno="/calendario?vista=inviti"
                tipologie={tipologie}
                tipoLoro={dati.tipo}
              />
              <p className="mt-2 text-xs text-muted">
                Accettata diventa una bozza nostra: quote, posti e rilascio li decidi tu.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
