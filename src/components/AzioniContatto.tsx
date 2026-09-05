import { Icona } from './Icona';
import { urlEmail, urlTelefono, urlWhatsapp } from '@/lib/contatti';

/**
 * Chiamata, WhatsApp e mail. Sono link nativi: sul telefono aprono
 * direttamente l'app giusta, sul desktop il client predefinito.
 */
export function AzioniContatto({
  telefono,
  email,
  nome,
  compatto = false,
}: {
  telefono: string | null;
  email: string | null;
  /** Usato per precompilare il saluto su WhatsApp. */
  nome?: string;
  compatto?: boolean;
}) {
  const tel = urlTelefono(telefono);
  const wa = urlWhatsapp(telefono, nome ? `Ciao ${nome}, ` : undefined);
  const mail = urlEmail(email);

  if (!tel && !wa && !mail) {
    return <p className="text-xs text-muted">Nessun recapito registrato.</p>;
  }

  const classe = compatto
    ? 'btn-ghost btn-sm'
    : 'btn-ghost flex-1 justify-center py-3 sm:flex-none sm:py-2';

  return (
    <div className="flex flex-wrap gap-2">
      {tel && (
        <a href={tel} className={classe} aria-label="Chiama">
          <Icona nome="telefono" size={16} /> Chiama
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className={`${classe} hover:border-[#25d366] hover:text-[#25d366]`}
          aria-label="Scrivi su WhatsApp"
        >
          <Icona nome="whatsapp" size={16} /> WhatsApp
        </a>
      )}
      {mail && (
        <a href={mail} className={classe} aria-label="Invia una mail">
          <Icona nome="email" size={16} /> Email
        </a>
      )}
    </div>
  );
}
