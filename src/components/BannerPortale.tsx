import { Icona } from './Icona';

/** Chi ha fatto il gestionale, e come scrivergli. Si cambia con CONTATTO_SVILUPPATORE. */
export const CONTATTO_SVILUPPATORE = process.env.CONTATTO_SVILUPPATORE || 'marco.allario@gmail.com';

const scrivi = (oggetto: string, testo: string) =>
  `mailto:${CONTATTO_SVILUPPATORE}?subject=${encodeURIComponent(oggetto)}&body=${encodeURIComponent(testo)}`;

/**
 * Il gestionale si presenta a chi lo vede da fuori.
 *
 * Sta in fondo alla pagina dell'invito, dopo tutto quello che serve per
 * venire: chi apre il link è qui per l'attività, e la pubblicità non deve
 * mettersi in mezzo. Ma è anche il momento giusto — un'altra squadra che vede
 * come si organizza la nostra — per dire che può averlo anche lei.
 */
export function BannerPortale({ squadra }: { squadra: string }) {
  return (
    <aside className="mt-8 rounded-lg border border-nvg/30 bg-nvg/[0.06] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-nvg">
        Ti piace il portale?
      </p>
      <p className="mt-2 text-sm">
        È il gestionale con cui <strong>{squadra}</strong> organizza le sue attività: inviti come
        questo, adesioni, quote, certificati, passaggi in macchina. Può averlo anche la tua squadra.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={scrivi(
            'Richiesta di una demo del gestionale',
            `Ciao, ho visto il gestionale di ${squadra} e vorrei una demo per la mia squadra.\n\nSquadra:\nCittà:\nTelefono:\n`,
          )}
          className="btn-primary btn-sm"
        >
          <Icona nome="email" size={15} /> Richiedi una demo
        </a>
        <a
          href={scrivi(
            'Vorrei provare il gestionale',
            `Ciao, ho visto il gestionale di ${squadra} e vorrei provarlo con la mia squadra.\n\nSquadra:\nCittà:\n`,
          )}
          className="btn-ghost btn-sm"
        >
          Provalo tu stesso
        </a>
      </div>
      <p className="mt-3 text-xs text-muted">
        Contatta lo sviluppatore:{' '}
        <a href={`mailto:${CONTATTO_SVILUPPATORE}`} className="text-nvg hover:underline">
          {CONTATTO_SVILUPPATORE}
        </a>
      </p>
    </aside>
  );
}
