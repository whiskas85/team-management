'use client';

import { useState } from 'react';
import { Icona } from './Icona';

/**
 * Le credenziali appena generate, pronte da consegnare.
 *
 * Ricopiare a mano una password di dodici caratteri, con i trattini, davanti a
 * qualcuno che aspetta, è il modo più sicuro per sbagliarla e far tornare la
 * persona a chiedere. Qui si copia: il singolo campo se serve solo quello,
 * oppure il messaggio già scritto da incollare in chat.
 *
 * La scrittura negli appunti richiede una pagina sicura (https o localhost).
 * Dove non è possibile il testo resta comunque selezionabile a mano, e lo si
 * dice invece di lasciare un pulsante che non fa niente.
 */
export function Credenziali({
  utente,
  password,
  link,
  telefono,
  indirizzo,
}: {
  utente: string;
  password: string;
  /** Il link che fa entrare una volta sola: quando c'è, nel messaggio va lui. */
  link?: string;
  /** Il suo numero, solo cifre col prefisso: apre la chat già scritta. */
  telefono?: string;
  /** L'indirizzo a cui collegarsi, per chi entrerà a mano. */
  indirizzo?: string;
}) {
  const [copiato, setCopiato] = useState<string | null>(null);
  const [fallito, setFallito] = useState(false);

  /*
   * Nel messaggio la password non c'è.
   *
   * Scritta in chat resta lì per sempre, la legge chiunque si trovi quel
   * telefono in mano e va bene finché non viene cambiata. Il link invece vale
   * sette giorni, si spegne al primo uso e porta dritto alla scelta della
   * password: è la stessa comodità senza la coda.
   *
   * Resta scritto **come si chiama** questa persona per il gestionale — il suo
   * callsign, o l'email, o il telefono — perché al secondo accesso il link non
   * c'è più e bisogna sapere cosa scrivere nel primo campo.
   */
  const messaggio = (
    link
      ? [
          'Accesso a Zero Dark Ops',
          `Il tuo utente: ${utente}`,
          '',
          'Entra da qui:',
          link,
          '',
          'Il link vale 7 giorni e si usa una volta sola: ti fa entrare e ti chiede di scegliere la tua password.',
        ]
      : [
          'Accesso a Zero Dark Ops',
          indirizzo ? `Indirizzo: ${indirizzo}` : null,
          `Il tuo utente: ${utente}`,
          `Password: ${password}`,
          'Al primo accesso ti verrà chiesto di sceglierne una tua.',
        ]
  )
    .filter((r) => r !== null)
    .join('\n');

  const copia = async (testo: string, cosa: string) => {
    try {
      await navigator.clipboard.writeText(testo);
      setCopiato(cosa);
      setFallito(false);
      setTimeout(() => setCopiato((c) => (c === cosa ? null : c)), 2000);
    } catch {
      setFallito(true);
    }
  };

  const Riga = ({ etichetta, valore }: { etichetta: string; valore: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-[0.06em] text-muted">
        {etichetta}
      </span>
      <code className="num min-w-0 flex-1 select-all truncate rounded bg-surface2 px-2 py-1 text-sm text-ink">
        {valore}
      </code>
      <button
        type="button"
        onClick={() => copia(valore, etichetta)}
        className="btn-ghost btn-sm shrink-0"
        title={`Copia ${etichetta.toLowerCase()}`}
      >
        {copiato === etichetta ? 'copiato' : 'copia'}
      </button>
    </div>
  );

  return (
    <div className="space-y-2 rounded-md border border-nvg/40 bg-nvg/5 p-3">
      <Riga etichetta="Utente" valore={utente} />
      {link && <Riga etichetta="Link" valore={link} />}
      {/* La password resta qui sotto, ma fuori dal messaggio: serve a dettarla
          a voce se il link non arriva o se la persona è davanti a te. */}
      <Riga etichetta="Password" valore={password} />

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
        {/* Apre WhatsApp sulla chat di questa persona con il messaggio già
            scritto. L'ultimo tocco — quello che manda — resta suo: WhatsApp
            non lascia spedire niente di nascosto, ed è giusto così. */}
        {telefono && (
          <a
            href={`https://wa.me/${telefono}?text=${encodeURIComponent(messaggio)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary btn-sm"
          >
            <Icona nome="whatsapp" size={15} />
            Invia su WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={() => copia(messaggio, 'Messaggio')}
          className={`btn-sm ${telefono ? 'btn-ghost' : 'btn-primary'}`}
        >
          <Icona nome="carica" size={15} />
          {copiato === 'Messaggio' ? 'Messaggio copiato' : 'Copia il messaggio pronto'}
        </button>
        <span className="text-[11px] text-muted">
          {telefono ? 'si apre la chat col messaggio già scritto' : 'da incollare in chat'}
        </span>
      </div>

      {fallito && (
        <p className="text-[11px] text-warn">
          Il browser non lascia scrivere negli appunti da questa pagina: seleziona il testo e copia
          a mano.
        </p>
      )}
    </div>
  );
}
