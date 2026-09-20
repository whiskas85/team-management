import Link from 'next/link';

/**
 * Le viste di una pagina, in fila.
 *
 * Lo stesso indirizzo risponde a domande diverse — nel calendario «cosa viene»
 * e «cos'è stato», negli operatori «chi c'è» e «chi riceve gli avvisi» — e
 * quelle domande vogliono colonne diverse. Mettere tutto in una tabella sola
 * fa una tabella che nessuno legge.
 *
 * Sono **link veri**, non pulsanti che nascondono e mostrano: la vista finisce
 * nell'indirizzo, si torna indietro col tasto del browser e si manda a qualcuno
 * la schermata che si sta guardando.
 */
export function ScegliVista({
  viste,
  attuale,
}: {
  viste: { chiave: string; href: string; testo: string }[];
  attuale: string;
}) {
  return (
    <div className="flex rounded-md border border-line p-0.5">
      {viste.map((v) => (
        <Link
          key={v.chiave}
          href={v.href}
          className={`rounded px-3 py-1.5 text-xs ${
            attuale === v.chiave ? 'bg-nvg/15 text-nvg' : 'text-muted'
          }`}
        >
          {v.testo}
        </Link>
      ))}
    </div>
  );
}
