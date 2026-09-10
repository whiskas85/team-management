import { AzioneBottone } from './AzioneBottone';
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
}: {
  id: string;
  titolo: string;
  status: string;
  visibilita: string | null;
  /** Tipologia riservata alla squadra: niente rilascio a tutti. */
  soloInterno?: boolean;
  /** Versione ridotta per le card e le righe di elenco. */
  compatto?: boolean;
}) {
  const dim = compatto ? 'btn-sm' : '';

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
            icona="concludi"
            className={`btn-ghost ${dim}`}
          >
            Concludi
          </AzioneBottone>
          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'ANNULLATA' }}
            conferma={`Annullare "${titolo}"? Resterà visibile ma non accetterà più adesioni.`}
            icona="annulla"
            className={`btn-danger ${dim}`}
          >
            Annulla
          </AzioneBottone>
          <AzioneBottone
            azione={cambiaStatoEvento}
            valori={{ id, status: 'CREATA' }}
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
            icona="bozza"
            className={`btn-ghost ${dim}`}
          >
            Riporta in bozza
          </AzioneBottone>
        </>
      )}

      <AzioneBottone
        azione={eliminaEvento}
        valori={{ id }}
        conferma={`Eliminare definitivamente "${titolo}" e tutte le adesioni raccolte?`}
        icona="elimina"
        className={`btn-danger ${dim}`}
      >
        {compatto ? 'Elimina' : 'Elimina attività'}
      </AzioneBottone>
    </div>
  );
}
