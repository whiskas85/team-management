import { Icona } from './Icona';
import { urlTelefono, urlWhatsapp } from '@/lib/contatti';

export type Referente = {
  id: string;
  /** Come si presenta: il callsign, o nome e iniziale. */
  nome: string;
  telefono: string | null;
};

/**
 * Chi tiene in mano l'attività, uno per riga, con il suo numero.
 *
 * **È un elenco e non una riga di nomi separati da un puntino.** Un referente
 * serve nel momento in cui uno ha una domanda — come ci si veste, a che ora si
 * parte davvero, dove si parcheggia — e in quel momento gli serve il numero,
 * non il nome: se deve andarselo a cercare in un'altra pagina, finisce che
 * scrive nel gruppo e aspetta.
 *
 * Il numero è un collegamento che apre il telefono, e accanto c'è WhatsApp,
 * che è dove questa squadra si parla davvero. Chi non ha un numero registrato
 * lo dice: una riga muta farebbe pensare a un guasto.
 *
 * Lo vedono tutti quelli che vedono l'attività, **nuovi compresi**: uno
 * arrivato da poco che non conosce nessuno è esattamente la persona che quella
 * telefonata deve poterla fare. Del referente si legge il solo callsign — o il
 * nome con l'iniziale, per chi non ce l'ha — perché il cognome non serve a
 * chiamarlo.
 */
export function ReferentiEvento({
  referenti,
  riquadro = false,
}: {
  referenti: Referente[];
  /** Card a sé, come nella pagina d'invito, invece di un blocco dentro un'altra. */
  riquadro?: boolean;
}) {
  if (referenti.length === 0) return null;

  return (
    <div className={riquadro ? 'card mt-4' : 'mt-5 border-t border-line pt-4'}>
      <p className="titolo-sezione mb-2">
        {referenti.length === 1 ? 'Referente' : 'Referenti'}
      </p>

      <ul className="space-y-2">
        {referenti.map((r) => {
          const tel = urlTelefono(r.telefono);
          const wa = urlWhatsapp(r.telefono, `Ciao ${r.nome}, `);

          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line pb-2 last:border-0 last:pb-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-nvg">{r.nome}</span>
                {tel ? (
                  <a href={tel} className="num text-xs text-muted hover:text-nvg">
                    {r.telefono}
                  </a>
                ) : (
                  <span className="text-xs text-muted">nessun numero registrato</span>
                )}
              </span>

              {tel && (
                <span className="flex items-center gap-2">
                  <a href={tel} className="btn-ghost btn-sm" aria-label={`Chiama ${r.nome}`}>
                    <Icona nome="telefono" size={15} />
                    Chiama
                  </a>
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost btn-sm hover:border-[#25d366] hover:text-[#25d366]"
                      aria-label={`Scrivi a ${r.nome} su WhatsApp`}
                    >
                      <Icona nome="whatsapp" size={15} />
                      WhatsApp
                    </a>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
