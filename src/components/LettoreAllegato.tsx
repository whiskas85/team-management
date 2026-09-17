import { Icona } from './Icona';
import { Markdown } from './Markdown';
import { etichettaGenere, genereAllegato, peso, type GenereAllegato } from '@/lib/allegati';

export type AllegatoDaLeggere = {
  titolo: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  /** Già formattata: qui dentro non si fanno date. */
  aggiornatoIl: string;
};

/**
 * Un allegato, letto dentro il gestionale.
 *
 * Tre formati, tre modi di mostrarli, e non è pignoleria:
 *
 * - il **Markdown** si disegna con il componente che usiamo per statuto e
 *   regolamenti, che produce elementi React e non HTML da iniettare: quello che
 *   è stato scritto resta testo e non può diventare codice;
 * - l'**HTML** è codice scritto da qualcun altro, e per quanto fidato sia chi
 *   l'ha caricato non gira dentro la nostra pagina. Sta in un riquadro chiuso
 *   a chiave — `sandbox` senza permessi — e arriva da una rotta che gli dà
 *   un'origine tutta sua. Se un domani quel file contenesse qualcosa di
 *   spiacevole, quel qualcosa non avrebbe niente intorno da toccare;
 * - il **PDF** lo apre il visore del browser, che è più bravo di qualunque
 *   cosa potremmo scrivere noi.
 *
 * Sotto c'è sempre il pulsante per scaricarlo: in campo la rete non c'è, e un
 * book che si legge solo online è un book che il giorno della giocata non si
 * legge.
 */
export function LettoreAllegato({
  allegato,
  indirizzoFile,
  testo,
}: {
  allegato: AllegatoDaLeggere;
  /** La rotta che serve il file, col token dell'invito se si legge da fuori. */
  indirizzoFile: string;
  /** Il contenuto, già letto dal disco: solo per il Markdown. */
  testo?: string;
}) {
  const genere: GenereAllegato = genereAllegato(allegato.mimeType);

  return (
    <>
      <div className="card">
        {genere === 'md' ? (
          testo?.trim() ? (
            <Markdown testo={testo} />
          ) : (
            <p className="text-sm text-muted">
              Questo file è vuoto: c’è il documento, ma dentro non c’è scritto niente.
            </p>
          )
        ) : genere === 'html' ? (
          /* sandbox senza valori: niente script, niente moduli, niente accesso
             a quello che gli sta intorno. La rotta che lo serve gli dà anche
             un'origine sua, così i due lucchetti stanno sulla stessa porta. */
          <iframe
            src={indirizzoFile}
            title={allegato.titolo}
            sandbox=""
            referrerPolicy="no-referrer"
            className="h-[70vh] w-full rounded-md border border-line bg-white"
          />
        ) : (
          <object
            data={indirizzoFile}
            type="application/pdf"
            className="h-[75vh] w-full rounded-md border border-line"
          >
            {/* il visore incorporato non c'è su tutti i telefoni: lì il PDF si
                apre in una scheda sua, che è comunque leggerlo */}
            <p className="p-4 text-sm text-muted">
              Il browser non sa mostrare qui dentro questo PDF.{' '}
              <a href={indirizzoFile} className="text-nvg underline underline-offset-2">
                Aprilo in una scheda nuova
              </a>
              .
            </p>
          </object>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-muted">
          <span className="num">{etichettaGenere[genere]}</span> ·{' '}
          <span className="num">{peso(allegato.fileSize)}</span> · aggiornato {allegato.aggiornatoIl}
          <span className="mt-0.5 block">
            Aperto da qui è sempre l’ultima versione: se lo sostituiscono, cambia sotto questo
            stesso indirizzo.
          </span>
        </p>
        <a href={`${indirizzoFile}${indirizzoFile.includes('?') ? '&' : '?'}scarica=1`} className="btn-ghost btn-sm" download>
          <Icona nome="scarica" size={15} />
          Scarica
        </a>
      </div>
    </>
  );
}
