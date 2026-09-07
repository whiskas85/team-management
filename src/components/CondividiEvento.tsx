import { Icona } from './Icona';
import { fmtDateTime } from '@/lib/format';

/**
 * Manda l'attività nella chat della squadra.
 *
 * È un semplice collegamento a WhatsApp, non un'integrazione: si apre l'app —
 * o WhatsApp Web sul computer — con il messaggio già scritto, e chi condivide
 * sceglie a chi mandarlo. Non serve nessun collegamento con il ponte, non
 * serve un numero dedicato, e funziona anche per chi il gestionale lo apre dal
 * telefono di casa.
 *
 * Il messaggio porta il link della **pagina dell'attività**, non un riassunto:
 * chi lo riceve ci entra e trova adesioni, quote e mappa aggiornate. Un
 * riassunto incollato in chat invecchia il giorno dopo.
 */
export function CondividiEvento({
  titolo,
  inizio,
  dove,
  indirizzo,
}: {
  titolo: string;
  inizio: Date;
  /** Il campo o il luogo, se c'è. */
  dove?: string | null;
  /** L'indirizzo della pagina, già assoluto. */
  indirizzo: string;
}) {
  const righe = [titolo, fmtDateTime(inizio), dove, '', indirizzo].filter(
    (r) => r !== null && r !== undefined,
  );

  const messaggio = encodeURIComponent(righe.join('\n'));

  return (
    <a
      href={`https://wa.me/?text=${messaggio}`}
      target="_blank"
      rel="noreferrer noopener"
      className="btn-ghost btn-sm"
    >
      <Icona nome="whatsapp" size={15} />
      Condividi
    </a>
  );
}
