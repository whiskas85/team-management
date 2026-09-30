import { fmtDateTime, fmtEuro } from '@/lib/format';
import { descriviCosto, dovutoAllOrganizzatore, type DatiOrigine } from '@/lib/eventi-condivisi';
import {
  impostaMandaForse,
  proponiSquadra,
  ritiraVersamento,
  segnalaVersamento,
} from '@/actions/eventi-condivisi';
import { FormAzione } from './Form';
import { Invia } from './Bottone';
import { BottoneModale } from './Modale';
import { Campo } from './ui';
import { BadgeOrganizzatore, type Organizzatore } from './BadgeOrganizzatore';
import { RispostaInvito } from './RispostaInvito';
import type { TipologiaInvito } from './ModuloAccettaInvito';
import type { VoceListino } from './CampiRichiesta';
import { MetodiPagamento } from './MetodiPagamento';
import { primoIban, primoLink } from '@/lib/link';

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
  listino,
  stagioneId,
  giorni,
  nostri,
  mandaForse,
  versamenti,
  invitaAltri,
  collegate,
  casse,
  sondaggioId,
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
  tipologie: TipologiaInvito[];
  /** Il listino e la stagione, per le quote accettando. */
  listino: VoceListino[];
  stagioneId: string | null;
  giorni: number;
  /** I nostri numeri, contati adesso: quelli del riepilogo arrivano in ritardo. */
  nostri: { presenti: number; forse: number };
  /** Se all'organizzatore mandiamo anche i «forse». */
  mandaForse: boolean;
  /** I pagamenti fatti all'organizzatore: segnalati, e confermati da loro. */
  versamenti: {
    id: string;
    importo: number;
    metodo: string | null;
    il: Date;
    confermatoIl: Date | null;
  }[];
  /** Chi organizza ci lascia invitare altre squadre. */
  invitaAltri: boolean;
  /** Le nostre squadre collegate, tranne chi organizza: quelle che possiamo proporre. */
  collegate: { id: string; nome: string }[];
  /** Le nostre casse, per la quota interna da impostare accettando. */
  casse: { id: string; nome: string }[];
  /** Il sondaggio «partecipiamo?» aperto sull'invito. */
  sondaggioId: string | null;
}) {
  // il riepilogo di chi organizza, con la nostra riga aggiornata a adesso
  const righe = dati.numeri.map((n) =>
    n.voi ? { ...n, presenti: nostri.presenti, forse: mandaForse ? nostri.forse : null } : n,
  );
  const totale = righe.reduce((t, n) => t + (n.presenti ?? 0), 0);
  const dovuto = dati.costo ? dovutoAllOrganizzatore(dati.costo, nostri.presenti) : null;
  // quello che resta da pagare: il dovuto di adesso meno tutto quello già
  // segnalato, confermato o no. Se si aggiunge qualcuno, torna a salire.
  const segnalati = versamenti.reduce((t, v) => t + v.importo, 0);
  const resto = dovuto !== null ? Math.max(0, Math.round((dovuto - segnalati) * 100) / 100) : 0;
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

      {!invitata && righe.length > 0 && (
        <div className="border-t border-line pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.06em] text-muted">Chi viene</p>
            <p className="num text-xs text-muted">{totale} presenti in tutto</p>
          </div>
          <ul className="mt-1 space-y-0.5 text-sm">
            {righe.map((n, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3">
                <span className={n.voi ? 'font-semibold text-nvg' : ''}>
                  {n.voi ? `${n.nome} (voi)` : n.nome}
                  {n.organizzatore && <span className="text-xs text-muted"> · organizza</span>}
                </span>
                <span className="num text-xs">
                  {n.presenti === null ? (
                    <span className="text-muted">non ancora</span>
                  ) : (
                    <>
                      <strong>{n.presenti}</strong> presenti
                      {n.forse ? <span className="text-warn"> · {n.forse} forse</span> : null}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {admin && (
            <FormAzione azione={impostaMandaForse} className="mt-2 flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={eventId} />
              <input type="hidden" name="forse" value={mandaForse ? '0' : '1'} />
              <span className="text-xs text-muted">
                A {organizzatore.nome} mandiamo{' '}
                {mandaForse ? 'i presenti e i «forse»' : 'solo i presenti'}.
              </span>
              <Invia icona={mandaForse ? 'rifiuta' : 'forse'} className="btn-ghost btn-sm">
                {mandaForse ? 'Solo i presenti' : 'Manda anche i «forse»'}
              </Invia>
            </FormAzione>
          )}
        </div>
      )}

      {!invitata && invitaAltri && collegata && admin && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p className="text-xs text-muted">
            {organizzatore.nome} ci lascia invitare altre squadre: l’invito parte da loro.
          </p>
          <BottoneModale
            etichetta="Invita un’altra squadra"
            icona="invita"
            titolo="Invita un’altra squadra"
            className="btn-ghost btn-sm"
          >
            {collegate.length === 0 ? (
              <p className="text-sm text-muted">
                Non abbiamo altre squadre collegate: si collegano da Squadre collegate.
              </p>
            ) : (
              <FormAzione azione={proponiSquadra} className="space-y-4">
                <input type="hidden" name="id" value={eventId} />
                <Campo label="Quale squadra" span>
                  <select name="collegamentoId" required defaultValue="" className="input">
                    <option value="" disabled>
                      — scegli fra le collegate —
                    </option>
                    {collegate.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </Campo>
                <p className="text-xs text-muted">
                  La proponiamo a {organizzatore.nome}, che la invita. Se non sono ancora collegati,
                  le chiede il collegamento: quando lo accettano l’invito parte da solo.
                </p>
                <Invia icona="invita">Proponi</Invia>
              </FormAzione>
            )}
          </BottoneModale>
        </div>
      )}

      {/* quanto chiedono e quanto si paga loro: solo l'admin. È il prezzo
          d'acquisto, e accanto alla quota interna farebbe vedere il ricarico */}
      {!invitata && admin && dati.costo && dovuto !== null && (
        <div className="border-t border-line pt-3 text-sm">
          <p className="text-[11px] uppercase tracking-[0.06em] text-muted">
            Da versare a {organizzatore.nome}
          </p>
          <p className="mt-1">
            {dati.costo.per === 'SQUADRA' ? (
              <>
                <strong className="num">{fmtEuro(dovuto)}</strong> per tutta la squadra
              </>
            ) : (
              <>
                <span className="num">
                  {fmtEuro(dati.costo.importo)} × {nostri.presenti} presenti ={' '}
                </span>
                <strong className="num">{fmtEuro(dovuto)}</strong>
              </>
            )}
            <span className="text-xs text-muted">
              {' '}
              · lo versa la squadra; ai vostri fate pagare la quota che decidete voi
            </span>
          </p>

          {versamenti.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs">
              {versamenti.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  {v.confermatoIl ? (
                    <span className="text-nvg">
                      Pagati {fmtEuro(v.importo)}
                      {v.metodo ? ` (${v.metodo})` : ''}: {organizzatore.nome} ha confermato
                      l’incasso il {fmtDateTime(v.confermatoIl)}.
                    </span>
                  ) : (
                    <>
                      <span className="text-warn">
                        Segnalati {fmtEuro(v.importo)}
                        {v.metodo ? ` (${v.metodo})` : ''} il {fmtDateTime(v.il)}: da confermare
                        da {organizzatore.nome}.
                      </span>
                      {admin && (
                        <FormAzione azione={ritiraVersamento} className="contents">
                          <input type="hidden" name="id" value={eventId} />
                          <input type="hidden" name="versamento" value={v.id} />
                          <Invia icona="annulla" className="btn-ghost btn-sm">
                            Ritira
                          </Invia>
                        </FormAzione>
                      )}
                    </>
                  )}
                </li>
              ))}
              {resto === 0 && dovuto !== null && dovuto > 0 && (
                <li className="text-muted">Il dovuto di adesso è coperto.</li>
              )}
            </ul>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            <BottoneModale
              etichetta="Info pagamenti"
              icona="pagamenti"
              titolo={`Come si paga ${organizzatore.nome}`}
              className="btn-ghost btn-sm"
            >
              <MetodiOrganizzatore metodi={dati.metodi} organizzatore={organizzatore.nome} />
            </BottoneModale>
            {admin && resto > 0 && (
              <BottoneModale
                etichetta={`Paga ${fmtEuro(resto)}`}
                icona="incassa"
                titolo={`Paga ${organizzatore.nome}`}
                className="btn-primary btn-sm"
              >
                <FormAzione azione={segnalaVersamento}>
                  <input type="hidden" name="id" value={eventId} />
                  <p className="text-sm">
                    Dovuto: <strong className="num">{fmtEuro(dovuto)}</strong>
                    {dati.costo.per === 'OPERATORE' && (
                      <span className="text-muted">
                        {' '}
                        ({fmtEuro(dati.costo.importo)} × {nostri.presenti} presenti)
                      </span>
                    )}
                    {segnalati > 0 && (
                      <>
                        <br />
                        Già pagati: <span className="num">{fmtEuro(segnalati)}</span> · resta{' '}
                        <strong className="num">{fmtEuro(resto)}</strong>
                      </>
                    )}
                  </p>
                  <Campo label="Quanto pagate (€)" span>
                    <input
                      name="importo"
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      required
                      defaultValue={resto}
                      className="input num"
                    />
                  </Campo>
                  <MetodiOrganizzatore
                    metodi={dati.metodi}
                    organizzatore={organizzatore.nome}
                    campoMetodo={`metodo-ospite-${eventId}`}
                  />
                  {dati.metodi.length > 0 && (
                    <Campo label="Come avete pagato" span>
                      <select
                        id={`metodo-ospite-${eventId}`}
                        name="metodo"
                        required
                        defaultValue=""
                        className="input"
                      >
                        <option value="" disabled>
                          — scegli —
                        </option>
                        {dati.metodi.map((m) => (
                          <option key={m.nome} value={m.nome}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                    </Campo>
                  )}
                  <Campo label="Note per loro" span>
                    <input
                      name="note"
                      maxLength={300}
                      className="input"
                      placeholder="es. bonifico del 3 ottobre, causale Op. Maronno"
                    />
                  </Campo>
                  <p className="text-xs text-muted">
                    Pagate con il metodo scelto, poi segnalatelo qui: {organizzatore.nome} lo vede
                    nella sua cassa e conferma l’incasso quando arriva.
                  </p>
                  <Invia icona="incassa">Segnala il pagamento</Invia>
                </FormAzione>
              </BottoneModale>
            )}
          </div>
        </div>
      )}

      {invitata && (
        <div className="border-t border-line pt-3">
          <p className="text-sm">
            <strong>{organizzatore.nome}</strong> ci invita a questa attività
            {dati.propostaDa && (
              <>
                , su proposta di <strong>{dati.propostaDa}</strong>
              </>
            )}
            . Finché non rispondi la vedi solo tu, come una bozza.
          </p>
          {admin && dati.costo && (
            <p className="mt-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
              È a pagamento: <strong>{descriviCosto(dati.costo)}</strong>, da versare a{' '}
              {organizzatore.nome} come squadra. Accettando puoi impostare la quota per i vostri.
            </p>
          )}
          {admin && (
            <div className="mt-3">
              <RispostaInvito
                id={eventId}
                organizzatore={organizzatore.nome}
                ritorno="/calendario?vista=inviti"
                tipologie={tipologie}
                listino={listino}
                stagioneId={stagioneId}
                giorni={giorni}
                tipoLoro={dati.tipo}
                costo={dati.costo}
                casse={casse}
                sondaggioId={sondaggioId}
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

/**
 * I metodi di pagamento di chi organizza, come quelli di una nostra cassa:
 * descrizione, istruzioni, «Paga con …» se c'è un link, «Copia IBAN» se c'è
 * un IBAN. Nel modulo «Paga» il metodo toccato si sceglie anche nel menu.
 * Il nome fa da id: è quello che torna a loro con la segnalazione.
 */
function MetodiOrganizzatore({
  metodi,
  organizzatore,
  campoMetodo,
}: {
  metodi: DatiOrigine['metodi'];
  organizzatore: string;
  campoMetodo?: string;
}) {
  if (metodi.length === 0) {
    return (
      <p className="text-sm text-muted">
        {organizzatore} non ha indicato metodi di pagamento: chiedete ai loro referenti.
      </p>
    );
  }
  return (
    <div>
      {campoMetodo && (
        <p className="mb-2 text-[11px] text-muted">
          Tocca il metodo con cui paghi: lo trovi già scelto qui sotto.
        </p>
      )}
      <MetodiPagamento
        campoMetodo={campoMetodo}
        metodi={metodi.map((m) => ({
          id: m.nome,
          nome: m.nome,
          descrizione: m.descrizione,
          istruzioni: m.istruzioni,
          link: primoLink(m.istruzioni),
          iban: primoIban(m.istruzioni),
        }))}
      />
    </div>
  );
}
