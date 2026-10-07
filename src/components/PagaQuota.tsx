import { fmtEuro, inputDate } from '@/lib/format';
import { Campo } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { BottoneModale } from '@/components/Modale';
import { Invia } from '@/components/Bottone';
import { dichiaraPagamento, ritiraSegnalazione } from '@/actions/metodi';
import { chiediRimborso, passaQuota, trasformaInCredito } from '@/actions/pagamenti';
import { ScegliPersona, type PersonaScelta } from '@/components/ScegliPersona';
import { SceltaPagamento } from '@/components/SceltaPagamento';
import { AzioneBottone } from '@/components/AzioneBottone';
import { MetodiPagamento, type MetodoDaMostrare } from '@/components/MetodiPagamento';
import { AllegatoMetodo } from '@/components/AllegatoMetodo';
import { primoIban, primoLink } from '@/lib/link';

/*
 * Il «Paga» di una quota: come si paga, il credito, la segnalazione. Lo usano
 * «Miei pagamenti», riga per riga, e il «Paga» delle card dell'attività, che
 * mette insieme tutte le quote di un'attività in una finestra sola.
 */

/** L'operatore segnala di aver pagato: la segreteria conferma l'incasso. */
export function Dichiara({
  pagamento,
  metodi,
  cassa = null,
  credito,
  nonServe,
  persone,
  inline = false,
}: {
  pagamento: {
    id: string;
    tipo: string;
    status: string;
    importo: unknown;
    pagato: unknown;
    descrizione: string;
    dichiaratoIl: Date | null;
    metodoId: string | null;
    allegatoPath?: string | null;
    allegatoTitolo?: string | null;
    rimborso: { id: string; status: string } | null;
    /** I movimenti del credito legati a questa quota: dicono quanto ne ha pagato. */
    crediti?: { importo: unknown }[];
  };
  metodi: {
    id: string;
    nome: string;
    descrizione: string | null;
    istruzioni: string | null;
    allegatoObbligatorio: boolean;
    titoloAllegato: string | null;
  }[];
  /** A chi va pagata, se non al club: il nome della sua cassa. */
  cassa?: string | null;
  /** Il credito disponibile nella cassa di questa quota. */
  credito: number;
  /** La quota non serve più (attività annullata, o non ci va): si può tenere come credito. */
  nonServe: boolean;
  /** A chi si può passare la quota che non serve più. */
  persone: PersonaScelta[];
  /**
   * Il contenuto del «Paga» senza la sua finestra: dentro un'altra finestra
   * (il «Paga» delle card dell'attività, con tutte le quote dell'attività).
   */
  inline?: boolean;
}) {
  // quota già versata: se non serve più si tiene come credito, oppure si
  // chiede indietro la parte pagata in contanti
  if (
    pagamento.status === 'PAGATO' &&
    pagamento.tipo !== 'RIMBORSO' &&
    Number(pagamento.pagato) > 0
  ) {
    const dalCredito = -(pagamento.crediti ?? []).reduce((t, c) => t + Number(c.importo), 0);
    const inContanti = Number(pagamento.pagato) - dalCredito > 0.001;
    const rimborsoAperto = pagamento.rimborso && pagamento.rimborso.status !== 'PAGATO';
    return (
      <span className="flex flex-wrap items-center justify-end gap-2">
        {!inContanti && <span className="text-xs text-nvg">pagata col credito</span>}
        {pagamento.rimborso && (
          <span className="text-xs text-warn">
            {pagamento.rimborso.status === 'PAGATO' ? 'rimborsato' : 'rimborso richiesto'}
          </span>
        )}
        {nonServe && (!pagamento.rimborso || rimborsoAperto) && (
          <AzioneBottone
            azione={trasformaInCredito}
            valori={{ id: pagamento.id }}
            icona="freccia"
            conferma={
              rimborsoAperto
                ? 'Tenere i soldi come credito invece del rimborso? Li spendi alla prossima quota.'
                : 'Tenere i soldi di questa quota come credito? Li spendi alla prossima quota.'
            }
            className="btn-ghost btn-sm"
          >
            Credito
          </AzioneBottone>
        )}
        {/* la scorciatoia: non vengo, la lascio a un altro. Diventa suo
            credito in quella cassa, in un gesto solo */}
        {nonServe && (!pagamento.rimborso || rimborsoAperto) && (
          <BottoneModale
            etichetta="Passa"
            icona="invita"
            titolo={`Passa a qualcuno · ${pagamento.descrizione}`}
            className="btn-ghost btn-sm"
          >
            <FormAzione azione={passaQuota} className="space-y-4 text-left">
              <input type="hidden" name="id" value={pagamento.id} />
              <p className="text-sm text-muted">
                Quello che hai pagato ({fmtEuro(Number(pagamento.pagato))}) diventa credito della
                persona che scegli{cassa ? `, presso ${cassa}` : ''}: lo usa per pagare le sue
                prossime quote di quella cassa. Riceve un avviso.
                {rimborsoAperto ? ' Il rimborso che avevi chiesto non serve più.' : ''}
              </p>
              <ScegliPersona persone={persone} />
              <Invia icona="invita">Passa la quota</Invia>
            </FormAzione>
          </BottoneModale>
        )}
        {inContanti && !pagamento.rimborso && (
          <AzioneBottone
            azione={chiediRimborso}
            valori={{ id: pagamento.id }}
            icona="riapri"
            conferma="Chiedere il rimborso di questa quota?"
            className="btn-ghost btn-sm"
          >
            Chiedi rimborso
          </AzioneBottone>
        )}
      </span>
    );
  }

  if (pagamento.status === 'NON_GESTITO') {
    return <span className="text-xs text-muted">si paga fuori dal gestionale</span>;
  }
  if (pagamento.status === 'PAGATO' || pagamento.status === 'ANNULLATO') {
    return <span className="text-xs text-muted">—</span>;
  }
  if (pagamento.tipo === 'RIMBORSO') {
    return <span className="text-xs text-warn">in attesa di erogazione</span>;
  }
  if (metodi.length === 0 && credito <= 0) {
    return <span className="text-xs text-muted">Salda con {cassa ?? 'la segreteria'}</span>;
  }

  // I metodi con quello che serve per usarli: il link diventa «Paga con …»,
  // l'IBAN «Copia IBAN». Si pescano qui, sul server, e al browser arrivano già
  // pronti.
  const comePagare: MetodoDaMostrare[] = metodi.map((m) => ({
    id: m.id,
    nome: m.nome,
    descrizione: m.descrizione,
    istruzioni: m.istruzioni,
    link: primoLink(m.istruzioni),
    iban: primoIban(m.istruzioni),
  }));
  const giaSegnalato = !!pagamento.dichiaratoIl;

  // i metodi di sempre e la segnalazione: da soli, o come alternativa al credito
  const AltriMetodi = () => (
    <>
        {!giaSegnalato && (
        <div>
          <p className="titolo-sezione">Come pagare</p>
          <p className="mb-2 mt-0.5 text-[11px] text-muted">
            Tocca il metodo con cui paghi: lo trovi già scelto qui sotto.
          </p>
          <MetodiPagamento metodi={comePagare} campoMetodo={`metodo-${pagamento.id}`} />
        </div>
      )}

      <FormAzione azione={dichiaraPagamento} className="space-y-4 border-t border-line pt-4">
        <input type="hidden" name="id" value={pagamento.id} />
        <p className="titolo-sezione">{giaSegnalato ? 'La tua segnalazione' : 'Hai pagato? Segnalalo'}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Con quale metodo *">
            <select
              id={`metodo-${pagamento.id}`}
              name="metodoId"
              required
              className="input"
              defaultValue={pagamento.metodoId ?? ''}
            >
              <option value="">— seleziona —</option>
              {metodi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </Campo>

          <Campo label="Quando">
            <input
              type="date"
              name="quando"
              defaultValue={inputDate(pagamento.dichiaratoIl ?? new Date())}
              className="input"
            />
          </Campo>
        </div>

        {/* la ricevuta, quando il metodo scelto la chiede */}
        <AllegatoMetodo
          campoMetodo={`metodo-${pagamento.id}`}
          metodi={metodi.map((m) => ({
            id: m.id,
            obbligatorio: m.allegatoObbligatorio,
            titolo: m.titoloAllegato,
          }))}
          esistente={
            pagamento.allegatoPath
              ? {
                  titolo: pagamento.allegatoTitolo ?? 'Allegato',
                  url: `/api/pagamenti/${pagamento.id}/allegato`,
                }
              : null
          }
        />

        <Invia icona="incassa">Segnala il pagamento</Invia>
        <p className="text-xs text-muted">
          La quota risulterà saldata quando{' '}
          {cassa ? `chi gestisce «${cassa}»` : 'la segreteria'} avrà verificato l’incasso.
        </p>
      </FormAzione>
      {/* sbagliato tutto, non c'è niente da correggere: la segnalazione si
          ritira, finché non è confermata */}
      {giaSegnalato && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-xs text-muted">
            Segnalato per sbaglio? Ritirala: la quota torna da pagare.
          </p>
          <AzioneBottone
            azione={ritiraSegnalazione}
            valori={{ id: pagamento.id }}
            icona="annulla"
            conferma="Ritirare la segnalazione di questo pagamento? La quota torna da pagare."
            className="btn-ghost btn-sm"
          >
            Ritira la segnalazione
          </AzioneBottone>
        </div>
      )}
    </>
  );

  /*
   * Un pulsante solo, «Paga», che apre tutto quello che serve a chi paga:
   * prima come si paga, un metodo per scheda, e sotto il modulo per dire che
   * lo si è fatto. Prima il pulsante diceva «Ho pagato», e chi doveva ancora
   * pagare — cioè quasi tutti quelli che lo guardavano — non aveva motivo di
   * premerlo per scoprire come si fa.
   */
  const corpo = (
      <div className="space-y-5 text-left">
        <div>
          <p className="titolo-sezione">Da pagare</p>
          <p className="num mt-1 text-2xl font-semibold text-ink">
            {fmtEuro(Number(pagamento.importo) - Number(pagamento.pagato))}
          </p>
          {Number(pagamento.pagato) > 0 && (
            <p className="text-xs text-muted">
              su {fmtEuro(Number(pagamento.importo))}: {fmtEuro(Number(pagamento.pagato))} già versati
            </p>
          )}
        </div>

        {credito > 0 && !giaSegnalato ? (
          <SceltaPagamento
            paymentId={pagamento.id}
            credito={credito}
            daPagare={Number(pagamento.importo) - Number(pagamento.pagato)}
          >
            {metodi.length > 0 ? (
              <AltriMetodi />
            ) : (
              <p className="text-sm text-muted">Il resto si salda con {cassa ?? 'la segreteria'}.</p>
            )}
          </SceltaPagamento>
        ) : (
          <AltriMetodi />
        )}
      </div>
  );
  if (inline) return corpo;

  return (
    <BottoneModale
      etichetta={giaSegnalato ? 'Correggi la segnalazione' : 'Paga'}
      icona="incassa"
      titolo={`${giaSegnalato ? 'Correggi la segnalazione' : 'Paga'} · ${pagamento.descrizione}`}
      className={giaSegnalato ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
    >
      {/* allineata a sinistra di suo: sul computer il pulsante sta in una
          cella di tabella allineata a destra, e la finestra se la portava
          dietro — nomi, istruzioni e importo finivano tutti sul bordo destro */}
      {corpo}
    </BottoneModale>
  );
}
