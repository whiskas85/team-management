import { comeChiamare, fmtDateTime } from '@/lib/format';
import { Avatar } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { commentaEvento, eliminaCommento, miPiaceEvento } from '@/actions/social';

/**
 * Commenti e "mi piace" sotto un'attività.
 *
 * È il posto dove la squadra si racconta la giocata, e vale per tutti: se
 * l'attività la vedi, puoi dire la tua. L'opposto delle note, che stanno nella
 * stessa pagina ma le legge solo chi le ha scritte.
 */

export type Commento = {
  id: string;
  testo: string;
  createdAt: Date;
  userId: string;
  utente: {
    id: string;
    nome: string;
    cognome: string;
    callsign: string | null;
    fotoPath: string | null;
  };
};

export function Social({
  eventId,
  commenti,
  miPiace,
  mioMiPiace,
  ioSono,
  chiSono,
  puoModerare,
}: {
  eventId: string;
  commenti: Commento[];
  /** Chi ha messo mi piace, per nome: si legge chi c'è, non solo quanti. */
  miPiace: { nome: string }[];
  mioMiPiace: boolean;
  ioSono: string;
  /** Come si chiama chi guarda: serve solo a raccontare i "mi piace". */
  chiSono: string;
  puoModerare: boolean;
}) {
  // Il pulsante dice già se ti piace e quanti sono: qui si aggiunge solo
  // *chi*, e solo quando c'è qualcun altro. Ripetere "Ti piace" accanto a un
  // pulsante che dice "Ti piace" non informa nessuno.
  const altri = miPiace.filter((m) => m.nome !== chiSono).map((m) => m.nome);
  const raccontoMiPiace =
    altri.length === 0
      ? null
      : altri.length === 1
        ? `Piace a ${mioMiPiace ? 'te e a ' : ''}${altri[0]}`
        : `Piace a ${mioMiPiace ? 'te, a ' : ''}${altri[0]} e ad altri ${altri.length - 1}`;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <FormAzione azione={miPiaceEvento} className="contents">
          <input type="hidden" name="eventId" value={eventId} />
          <Invia
            icona="miPiace"
            className={mioMiPiace ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            attesa="…"
          >
            {mioMiPiace ? 'Ti piace' : 'Mi piace'}
            {miPiace.length > 0 && ` · ${miPiace.length}`}
          </Invia>
        </FormAzione>
        {raccontoMiPiace && (
          <span className="text-xs text-muted" title={miPiace.map((m) => m.nome).join(', ')}>
            {raccontoMiPiace}
          </span>
        )}
      </div>

      <p className="titolo-sezione mb-3">
        Commenti{commenti.length > 0 && ` · ${commenti.length}`}
      </p>

      <FormAzione azione={commentaEvento} className="mb-4 space-y-2">
        <input type="hidden" name="eventId" value={eventId} />
        <textarea
          name="testo"
          rows={2}
          maxLength={2000}
          className="input"
          placeholder="Com'è andata?"
        />
        <Invia icona="commento" className="btn-ghost btn-sm">
          Commenta
        </Invia>
      </FormAzione>

      {commenti.length === 0 ? (
        <p className="text-sm text-muted">Ancora nessun commento: comincia tu.</p>
      ) : (
        <div className="space-y-3">
          {commenti.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar
                iniziali={comeChiamare(c.utente, { incarico: false, diSquadra: true }).iniziali}
                fotoDi={c.utente.fotoPath ? c.utente.id : null}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="rounded-lg bg-surface2 px-3 py-2">
                  <p className="text-sm font-medium">
                    {comeChiamare(c.utente, { incarico: false, diSquadra: true }).nome}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm">{c.testo}</p>
                </div>
                <div className="mt-1 flex items-center gap-2 pl-1">
                  <span className="num text-[11px] text-muted">{fmtDateTime(c.createdAt)}</span>
                  {(c.userId === ioSono || puoModerare) && (
                    <AzioneBottone
                      azione={eliminaCommento}
                      valori={{ id: c.id }}
                      conferma="Eliminare il commento?"
                      className="text-[11px] text-muted transition-colors hover:text-danger"
                    >
                      elimina
                    </AzioneBottone>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
