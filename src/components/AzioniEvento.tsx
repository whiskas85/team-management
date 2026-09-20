import { AzioneBottone } from './AzioneBottone';
import { AnnullaEvento } from './AnnullaEvento';
import { BottoneElimina } from './CardRiga';
import { cambiaStatoEvento, eliminaEvento, rilasciaEvento } from '@/actions/eventi';

/**
 * Governo dello stato dell'attività a pulsanti: ogni transizione è un gesto
 * esplicito, non una voce di tendina scelta per sbaglio. Il rilascio chiede
 * sempre a chi è destinata, perché è il momento in cui diventa visibile.
 */
export function AzioniEvento({
  id,
  titolo,
  status,
  visibilita,
  soloInterno = false,
  compatto = false,
  soloRilascio = false,
}: {
  id: string;
  titolo: string;
  status: string;
  visibilita: string | null;
  /** Tipologia riservata alla squadra: niente rilascio a tutti. */
  soloInterno?: boolean;
  /** Versione ridotta per le card e le righe di elenco. */
  compatto?: boolean;
  /**
   * Nelle card dell'elenco si fa **solo il primo passo**: rilasciare una bozza.
   *
   * Il resto — cambiare i destinatari, concludere, annullare, riportare in
   * bozza — sta dentro l'attività, in fondo, accanto al condividi. Scorrendo
   * l'elenco quei pulsanti si premevano di sfuggita, e sono tutti gesti che
   * cambiano la giornata a tutta la squadra; per farne uno bisogna aprire
   * l'attività, che è esattamente il tempo che ci vuole per pensarci.
   *
   * Una bozza invece si rilascia di corsa, ed è giusto così: finché non lo si
   * fa non la vede nessuno.
   */
  soloRilascio?: boolean;
}) {
  const dim = compatto ? 'btn-sm' : '';
  if (soloRilascio && status !== 'CREATA') return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'CREATA' && (
        <>
          {!compatto && (
            <p className="w-full text-xs text-muted">
              {soloInterno
                ? 'Tipologia riservata alla squadra: si rilascia solo internamente.'
                : 'Scegli a chi rilasciarla: da qui in poi diventa visibile e accetta adesioni.'}
            </p>
          )}
          <AzioneBottone
            azione={rilasciaEvento}
            valori={{ id, visibilita: 'TEAM' }}
            icona="squadra"
            className={`btn-ghost ${dim}`}
          >
            Rilascia alla squadra
          </AzioneBottone>
          {/* su invito: non la vede nessuno, nemmeno la squadra, finché non
              lo si aggiunge fra i partecipanti */}
          <AzioneBottone
            azione={rilasciaEvento}
            valori={{ id, visibilita: 'INVITO' }}
            icona="invita"
            className={`btn-ghost ${dim}`}
          >
            Rilascia su invito
          </AzioneBottone>
          {!soloInterno && (
            <AzioneBottone
              azione={rilasciaEvento}
              valori={{ id, visibilita: 'TUTTI' }}
              icona="rilascia"
              className={`btn-primary ${dim}`}
            >
              Rilascia a tutti
            </AzioneBottone>
          )}
        </>
      )}

      {status === 'RILASCIATA' && (
        <>
          {!compatto && <span className="w-full text-xs text-muted">Destinatari</span>}
          <AzioneBottone
            azione={rilasciaEvento}
            valori={{ id, visibilita: 'TEAM' }}
            disabilitato={visibilita === 'TEAM'}
            icona="squadra"
            className={`btn-ghost ${dim} ${visibilita === 'TEAM' ? 'border-nvg/40 text-nvg' : ''}`}
          >
            Solo squadra
          </AzioneBottone>
          {!soloInterno && (
            <AzioneBottone
              azione={rilasciaEvento}
              valori={{ id, visibilita: 'TUTTI' }}
              disabilitato={visibilita === 'TUTTI'}
              icona="tutti"
              className={`btn-ghost ${dim} ${visibilita === 'TUTTI' ? 'border-nvg/40 text-nvg' : ''}`}
            >
              Tutti
            </AzioneBottone>
          )}
          <AzioneBottone
            azione={rilasciaEvento}
            valori={{ id, visibilita: 'INVITO' }}
            disabilitato={visibilita === 'INVITO'}
            icona="invita"
            className={`btn-ghost ${dim} ${visibilita === 'INVITO' ? 'border-nvg/40 text-nvg' : ''}`}
          >
            Su invito
          </AzioneBottone>

          {!compatto && <span className="w-full" />}

          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'CONCLUSA' }}
            conferma={`Concludere "${titolo}" senza fare l'appello? Le presenze non vengono registrate.`}
            icona="concludi"
            className={`btn-ghost ${dim}`}
          >
            Concludi
          </AzioneBottone>
          {/* l'unico cambio di stato che non basta confermare: chiede anche
              perché, e quel perché resta nello storico */}
          <AnnullaEvento id={id} titolo={titolo} compatto={compatto} />
          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'CREATA' }}
            conferma={`Riportare "${titolo}" in bozza? Sparisce agli operatori e non accetta più adesioni.`}
            icona="bozza"
            className={`btn-ghost ${dim}`}
          >
            Riporta in bozza
          </AzioneBottone>
        </>
      )}

      {(status === 'CONCLUSA' || status === 'ANNULLATA') && (
        <>
          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'RILASCIATA' }}
            icona="riapri"
            className={`btn-ghost ${dim}`}
          >
            Riapri
          </AzioneBottone>
          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'CREATA' }}
            conferma={`Riportare "${titolo}" in bozza? Sparisce agli operatori e non accetta più adesioni.`}
            icona="bozza"
            className={`btn-ghost ${dim}`}
          >
            Riporta in bozza
          </AzioneBottone>
        </>
      )}

    </div>
  );
}

/**
 * Il cestino di un'attività, in alto a destra della sua card.
 *
 * Non sta fra i cambi di stato: quelli sono passi avanti e indietro, questa è
 * una cancellazione — con tutte le adesioni raccolte — e messa in fila con
 * «Riapri» e «Riporta in bozza» la si premeva cercando un'altra cosa.
 */
export function EliminaEvento({ id, titolo }: { id: string; titolo: string }) {
  return (
    <BottoneElimina
      azione={eliminaEvento}
      valori={{ id }}
      conferma={`Eliminare definitivamente "${titolo}" e tutte le adesioni raccolte?`}
      etichetta={`Elimina ${titolo}`}
    />
  );
}
