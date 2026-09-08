import type { ReactNode } from 'react';
import { comeChiamare, fmtDateTime } from '@/lib/format';
import { isContatto } from '@/lib/domain';
import { Avatar } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { AzioneBottone } from '@/components/AzioneBottone';
import { Invia } from '@/components/Bottone';
import { ScriviCommento } from '@/components/ScriviCommento';
import { Segnala } from '@/components/Segnala';
import {
  commentaAnnuncio,
  eliminaCommentoAnnuncio,
  miPiaceAnnuncio,
} from '@/actions/mercatino-social';

/**
 * Commenti e "mi piace" sotto un annuncio.
 *
 * Le voci nominate con la chiocciola si colorano: in un lotto di cinque cose
 * sapere di quale si parla è metà del discorso, e un `@radio-m` grigio in
 * mezzo al testo non lo direbbe a nessuno.
 */

type Voce = { id: string; titolo: string; maniglia: string };

export type CommentoLetto = {
  id: string;
  testo: string;
  createdAt: Date;
  userId: string;
  utente: {
    id: string;
    nome: string;
    cognome: string;
    callsign: string | null;
    stato: string;
    fotoPath: string | null;
  };
};

/** Colora le chiocciole che corrispondono a una voce vera. */
function conChiocciole(testo: string, voci: Voce[]): ReactNode[] {
  const per = new Map(voci.map((v) => [v.maniglia, v]));
  const pezzi: ReactNode[] = [];
  const regola = /@([a-zA-Z0-9._-]{2,})/g;
  let ultimo = 0;
  let m: RegExpExecArray | null;
  let n = 0;

  while ((m = regola.exec(testo)) !== null) {
    const voce = per.get(m[1].toLowerCase());
    if (!voce) continue;

    if (m.index > ultimo) pezzi.push(testo.slice(ultimo, m.index));
    pezzi.push(
      <span
        key={n++}
        title={voce.titolo}
        className="rounded bg-nvg/15 px-1 font-medium text-nvg"
      >
        {m[0]}
      </span>,
    );
    ultimo = m.index + m[0].length;
  }

  if (ultimo < testo.length) pezzi.push(testo.slice(ultimo));
  return pezzi;
}

export function SocialAnnuncio({
  annuncioId,
  voci,
  commenti,
  miPiace,
  mioMiPiace,
  ioSono,
  chiSono,
  puoModerare,
}: {
  annuncioId: string;
  /** Le voci ancora in vendita: sono quelle che ha senso nominare. */
  voci: Voce[];
  commenti: CommentoLetto[];
  miPiace: { nome: string }[];
  mioMiPiace: boolean;
  ioSono: string;
  chiSono: string;
  /** Chi vende, e l'admin: possono togliere un commento altrui. */
  puoModerare: boolean;
}) {
  const altri = miPiace.filter((m) => m.nome !== chiSono).map((m) => m.nome);
  const racconto =
    altri.length === 0
      ? null
      : altri.length === 1
        ? `Piace a ${mioMiPiace ? 'te e a ' : ''}${altri[0]}`
        : `Piace a ${mioMiPiace ? 'te, a ' : ''}${altri[0]} e ad altri ${altri.length - 1}`;

  return (
    <div className="card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <FormAzione azione={miPiaceAnnuncio} className="contents">
          <input type="hidden" name="annuncioId" value={annuncioId} />
          <Invia
            icona="miPiace"
            className={mioMiPiace ? 'btn-primary btn-sm' : 'btn-ghost btn-sm'}
            attesa="…"
          >
            {mioMiPiace ? 'Ti piace' : 'Mi piace'}
            {miPiace.length > 0 && ` · ${miPiace.length}`}
          </Invia>
        </FormAzione>
        {racconto && (
          <span className="text-xs text-muted" title={miPiace.map((m) => m.nome).join(', ')}>
            {racconto}
          </span>
        )}
      </div>

      <p className="titolo-sezione mb-3">
        Commenti{commenti.length > 0 && ` · ${commenti.length}`}
      </p>

      <FormAzione azione={commentaAnnuncio} className="mb-4">
        <input type="hidden" name="annuncioId" value={annuncioId} />
        <ScriviCommento voci={voci} />
      </FormAzione>

      {commenti.length === 0 ? (
        <p className="text-sm text-muted">Nessun commento. Chiedi pure: risponde chi vende.</p>
      ) : (
        <div className="space-y-3">
          {commenti.map((c) => {
            const chi = comeChiamare(c.utente, {
              incarico: false,
              diSquadra: !isContatto(c.utente.stato as never),
            });
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar
                  iniziali={chi.iniziali}
                  fotoDi={c.utente.fotoPath ? c.utente.id : null}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="rounded-lg bg-surface2 px-3 py-2">
                    <p className="text-sm font-medium">{chi.nome}</p>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {conChiocciole(c.testo, voci)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 pl-1">
                    <span className="num text-[11px] text-muted">{fmtDateTime(c.createdAt)}</span>
                    {(c.userId === ioSono || puoModerare) && (
                      <AzioneBottone
                        azione={eliminaCommentoAnnuncio}
                        valori={{ id: c.id }}
                        conferma="Eliminare il commento?"
                        className="text-[11px] text-muted transition-colors hover:text-danger"
                      >
                        elimina
                      </AzioneBottone>
                    )}
                    {/* di chi lo subisce, non di chi lo possiede */}
                    {c.userId !== ioSono && <Segnala tipo="annuncio" id={c.id} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
