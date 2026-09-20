'use client';

import { useState, type ChangeEvent, type ReactNode } from 'react';
import { Campo } from './ui';
import { peso } from '@/lib/allegati';

/**
 * Il campo con cui si allega un file, controllato **prima** di partire.
 *
 * Non è un lusso: un file troppo grosso non arriva nemmeno al gestionale. Lo
 * ferma il proxy, o il tetto delle server action di Next, e in tutti e due i
 * casi la risposta che torna al browser non è una risposta che React sappia
 * leggere — la pagina finisce sul confine d'errore e chi guarda si vede
 * «Qualcosa si è rotto» dopo aver aspettato il caricamento di venti mega. Era
 * esattamente quello che succedeva con le scansioni dei certificati medici.
 *
 * Il controllo qui evita il viaggio: il file resta sul telefono, il messaggio
 * arriva subito e dice anche cosa fare. Il server continua a controllare per
 * conto suo — questo è il primo avviso, non la guardia.
 */
export function CampoFile({
  label,
  name = 'file',
  accept,
  estensioni,
  maxBytes,
  required,
  span,
  aiuto,
  className = 'input file:mr-3 file:rounded file:border-0 file:bg-nvg/15 file:px-3 file:py-1 file:text-nvg',
}: {
  label: string;
  name?: string;
  accept?: string;
  /** Quelle ammesse, punto compreso. Se manca, si controlla solo il peso. */
  estensioni?: string[];
  maxBytes: number;
  required?: boolean;
  span?: boolean;
  /** La riga di spiegazione sotto al campo. */
  aiuto?: ReactNode;
  className?: string;
}) {
  const [problema, setProblema] = useState<string | null>(null);
  const tetto = `${Math.round(maxBytes / 1024 / 1024)} MB`;

  function controlla(e: ChangeEvent<HTMLInputElement>) {
    setProblema(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const punto = file.name.lastIndexOf('.');
    const estensione = punto > 0 ? file.name.slice(punto).toLowerCase() : '';

    // l'estensione si controlla solo se c'è: quando manca decide il server, che
    // sa ripiegare sul tipo dichiarato
    if (estensioni && estensione && !estensioni.includes(estensione)) {
      e.target.value = '';
      setProblema(`«${file.name}» non è un formato che si può allegare qui.`);
      return;
    }

    if (file.size > maxBytes) {
      e.target.value = '';
      setProblema(
        `«${file.name}» pesa ${peso(file.size)}, il massimo è ${tetto}. Se è una scansione, rifalla in bianco e nero o a qualità più bassa; una foto del foglio col telefono va benissimo.`,
      );
    }
  }

  return (
    <Campo label={label} span={span}>
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={controlla}
        className={className}
      />
      {problema ? (
        <p className="mt-1 rounded-md border border-danger/40 bg-danger/10 px-2 py-1 text-xs text-danger">
          {problema}
        </p>
      ) : (
        aiuto && <p className="mt-1 text-xs text-muted">{aiuto}</p>
      )}
    </Campo>
  );
}
