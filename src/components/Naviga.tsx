import { Icona } from './Icona';

/**
 * Avvia la navigazione verso il campo. Il link `dir` di Google Maps apre
 * direttamente l'app sul telefono con il percorso già impostato: sul posto
 * serve un tocco solo, non cercare l'indirizzo a mano.
 *
 * Le coordinate hanno la precedenza sull'indirizzo scritto: un campo in mezzo
 * al bosco spesso non ha una via che Maps sappia trovare.
 */
/**
 * Come si dice a Maps «qui»: le coordinate se ci sono, altrimenti l'indirizzo
 * scritto. Nullo quando non si sa dove sia, e allora non c'è niente da aprire.
 */
export function metaNaviga(
  lat?: number | null,
  lng?: number | null,
  indirizzo?: string | null,
) {
  if (lat != null && lng != null) return `${lat},${lng}`;
  return indirizzo?.trim() ? indirizzo.trim() : null;
}

/** Il percorso verso un posto solo: da dove sei adesso a lì. */
export const linkNaviga = (meta: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(meta)}&travelmode=driving`;

/**
 * Un giro da dove sei adesso: le tappe in ordine, poi la meta. Senza origine
 * Maps parte dalla posizione del telefono, che è quello che si vuole.
 */
export const linkGiro = (tappe: string[], meta: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(meta)}` +
  (tappe.length ? `&waypoints=${encodeURIComponent(tappe.join('|'))}` : '') +
  '&travelmode=driving';

/**
 * Un itinerario con la sua partenza (la casa di chi guida): partenza, tappe,
 * meta. Maps accetta al massimo nove tappe in mezzo.
 */
export const linkPercorso = (punti: string[]) => {
  if (punti.length < 2) return punti[0] ? linkNaviga(punti[0]) : null;
  const [origine, ...resto] = punti;
  const meta = resto.pop()!;
  return (
    `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origine)}` +
    `&destination=${encodeURIComponent(meta)}` +
    (resto.length ? `&waypoints=${encodeURIComponent(resto.slice(0, 9).join('|'))}` : '') +
    '&travelmode=driving'
  );
};

/** Il viaggio intero: prima al ritrovo, poi al campo, in un itinerario solo. */
export const linkItinerario = (da: string, a: string) =>
  `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(da)}&destination=${encodeURIComponent(a)}&travelmode=driving`;

export function Naviga({
  lat,
  lng,
  indirizzo,
  compatto = false,
  className,
}: {
  lat?: number | null;
  lng?: number | null;
  indirizzo?: string | null;
  /** Versione ridotta per le card: solo icona e una parola. */
  compatto?: boolean;
  className?: string;
}) {
  const meta = metaNaviga(lat, lng, indirizzo);
  if (!meta) return null;

  const href = linkNaviga(meta);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Apri il percorso in Google Maps"
      className={
        className ??
        (compatto
          ? // grigio su grigio si legge come "disattivato": questo è un comando
            // attivo, quindi prende l'accento come gli altri
            'inline-flex shrink-0 items-center gap-1 rounded-md border border-nvg/40 bg-nvg/10 px-2 py-1 text-[11px] font-medium text-nvg transition-colors hover:bg-nvg/20'
          : 'btn-primary btn-sm')
      }
    >
      <Icona nome="naviga" size={compatto ? 12 : 15} />
      {compatto ? 'Naviga' : 'Naviga con Google Maps'}
    </a>
  );
}
