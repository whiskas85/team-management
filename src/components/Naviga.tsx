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
