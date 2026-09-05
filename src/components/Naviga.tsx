import { Icona } from './Icona';

/**
 * Avvia la navigazione verso il campo. Il link `dir` di Google Maps apre
 * direttamente l'app sul telefono con il percorso già impostato: sul posto
 * serve un tocco solo, non cercare l'indirizzo a mano.
 *
 * Le coordinate hanno la precedenza sull'indirizzo scritto: un campo in mezzo
 * al bosco spesso non ha una via che Maps sappia trovare.
 */
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
  const meta =
    lat != null && lng != null ? `${lat},${lng}` : indirizzo?.trim() ? indirizzo.trim() : null;

  if (!meta) return null;

  const href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    meta,
  )}&travelmode=driving`;

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
