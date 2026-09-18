import type { ReactNode } from 'react';
import { AzioneBottone } from './AzioneBottone';
import type { StatoForm } from '@/lib/form';

/**
 * Una riga di un elenco dentro una card, disegnata per il telefono.
 *
 * **Lo schema è sempre lo stesso**, ed è una regola, non un gusto:
 *
 * - **in alto** il titolo, con sotto lo spazio per un sottotitolo se serve, e
 *   **alla sua altezza, a destra, il cestino**: solo l'icona, rosso. È il gesto
 *   più pericoloso della riga e sta sempre nello stesso posto, lontano dagli
 *   altri pulsanti, così non lo si preme cercandone un altro;
 * - **in mezzo** il contenuto, che va a capo invece di essere tagliato;
 * - **sotto, allineati a destra**, i pulsanti di azione, anche loro liberi di
 *   andare a capo, nel **piede** della card: una fascia di un grigio appena più
 *   chiaro, a filo con i bordi, che separa quello che si fa da quello che si
 *   legge.
 *
 * Prima ogni riga metteva tutto su una linea sola, e sul telefono il primo a
 * farne le spese era il nome: «Decima Gladio» diventava «Decima …», cioè la
 * sola cosa che serviva leggere spariva per far posto ai pulsanti. Qui il
 * titolo **non si tronca mai**: se è lungo va a capo, perché una riga più alta
 * si legge e una parola mozzata no.
 */
export function CardRiga({
  titolo,
  sottotitolo,
  elimina,
  children,
  azioni,
  card = false,
  className = '',
}: {
  titolo: ReactNode;
  sottotitolo?: ReactNode;
  /** Il cestino in alto a destra: di solito un `BottoneElimina`. */
  elimina?: ReactNode;
  /** Il contenuto della riga, sotto il titolo. */
  children?: ReactNode;
  /** I pulsanti, sotto e a destra. */
  azioni?: ReactNode;
  /**
   * Card a sé, al primo livello della pagina, invece di una riga dentro un
   * elenco. Lo schema è lo stesso: cambia solo la cornice.
   */
  card?: boolean;
  className?: string;
}) {
  const cornice = card ? 'card' : 'rounded-lg border border-line bg-surface2/40 p-3 [--pad:0.75rem]';
  return (
    <div className={`${cornice} ${className}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="break-words font-medium leading-snug">{titolo}</div>
          {sottotitolo && (
            <div className="mt-0.5 break-words text-[11px] text-muted">{sottotitolo}</div>
          )}
        </div>
        {elimina && <div className="-mr-1 -mt-1 shrink-0">{elimina}</div>}
      </div>

      {children && <div className="mt-2 min-w-0 break-words">{children}</div>}

      {azioni && (
        <div className="piede">{azioni}</div>
      )}
    </div>
  );
}

/**
 * Il cestino: un'icona rossa e nient'altro.
 *
 * Niente scritta perché sta sempre nello stesso angolo e il simbolo lo
 * riconoscono tutti; la scritta allargava il pulsante e rubava spazio proprio
 * al titolo. Per chi usa un lettore di schermo il nome c'è, nascosto alla
 * vista: il pulsante dice cosa toglie, non solo «elimina».
 */
export function BottoneElimina({
  azione,
  valori,
  conferma,
  etichetta,
  piccolo = false,
}: {
  azione: (prev: StatoForm, fd: FormData) => Promise<StatoForm>;
  valori: Record<string, string>;
  /**
   * La domanda prima di procedere: togliere qualcosa non si fa per sbaglio.
   * Si omette solo dove buttare via non costa niente — una bozza che si rifà
   * con un clic — e chiedere sarebbe solo un passaggio in più.
   */
  conferma?: string;
  /** Cosa legge chi non vede l'icona, per esempio «Togli BK Army». */
  etichetta: string;
  /**
   * Senza cornice, per una riga **dentro** una card — un gestore di una cassa,
   * una riga di un riordino. Stesso colore, stessa icona: cambia solo la
   * misura, perché un pulsante pieno su ogni sotto-riga schiaccerebbe il testo.
   */
  piccolo?: boolean;
}) {
  return (
    <AzioneBottone
      azione={azione}
      valori={valori}
      icona="elimina"
      conferma={conferma}
      // `relative` non è estetica: il nome nascosto per i lettori di schermo
      // è posizionato in assoluto, e senza un riferimento vicino scappa dal
      // pulsante. Dentro una tabella che scorre finiva oltre il bordo destro e
      // il telefono apriva la pagina rimpicciolita per farcela stare.
      className={
        piccolo
          ? 'relative inline-flex shrink-0 items-center rounded p-1 text-danger transition-colors hover:bg-danger/10'
          : 'btn-danger btn-sm relative px-2'
      }
    >
      <span className="sr-only">{etichetta}</span>
    </AzioneBottone>
  );
}
