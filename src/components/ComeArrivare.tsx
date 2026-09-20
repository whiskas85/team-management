import { Icona } from './Icona';
import { linkItinerario, linkNaviga } from './Naviga';

export type Tappa = {
  /** «Luogo di ritrovo», «Campo»: cos'è questo posto. */
  etichetta: string;
  /** Come si chiama, per chi legge. */
  testo: string;
  /** Come si dice a Maps, già pronto: coordinate o indirizzo. */
  meta: string;
};

/**
 * Come ci si arriva: una riga per posto, e il viaggio intero se sono due.
 *
 * **Una riga per tappa.** Prima il ritrovo, poi il campo, nell'ordine in cui
 * si fa la strada: chi parte da casa vuole il ritrovo, chi ci arriva tardi
 * vuole il campo, e con un pulsante solo — «Naviga» — uno dei due sbagliava
 * sempre. A sinistra dove si va, a destra il pulsante che ci porta.
 *
 * **E l'itinerario.** Quando le tappe sono due, sotto c'è il viaggio come si
 * fa davvero: prima al ritrovo, poi al campo, in un percorso solo con la sosta
 * dentro. È largo quanto la riga e di un altro colore perché non è un terzo
 * «Naviga»: è l'unico pulsante che racconta la giornata invece di un punto.
 */
export function ComeArrivare({ tappe }: { tappe: Tappa[] }) {
  if (tappe.length === 0) return null;

  return (
    <div>
      <div className="divide-y divide-line overflow-hidden rounded-md border border-line">
        {tappe.map((t) => (
          <div key={t.etichetta} className="flex items-center justify-between gap-3 px-3 py-2">
            <span className="min-w-0">
              <span className="titolo-sezione block">{t.etichetta}</span>
              <span className="block truncate text-sm">{t.testo}</span>
            </span>
            <a
              href={linkNaviga(t.meta)}
              target="_blank"
              rel="noreferrer"
              title={`Apri il percorso verso ${t.testo} in Google Maps`}
              className="btn-primary btn-sm shrink-0"
            >
              <Icona nome="naviga" size={15} />
              Naviga
            </a>
          </div>
        ))}
      </div>

      {tappe.length > 1 && (
        <a
          href={linkItinerario(tappe[0].meta, tappe[tappe.length - 1].meta)}
          target="_blank"
          rel="noreferrer"
          title="Il percorso intero: prima il ritrovo, poi il campo"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-warn/40 bg-warn/10 px-3 py-2 text-sm font-semibold text-warn transition-colors hover:bg-warn/20"
        >
          <Icona nome="naviga" size={15} />
          Itinerario · {tappe[0].etichetta.toLowerCase()} e poi{' '}
          {tappe[tappe.length - 1].etichetta.toLowerCase()}
        </a>
      )}
    </div>
  );
}
