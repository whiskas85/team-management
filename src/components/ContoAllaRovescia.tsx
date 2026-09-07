'use client';

import { useEffect, useState } from 'react';
import { Badge } from './ui';

/**
 * Quanto manca alla chiusura delle adesioni.
 *
 * È un conto che scorre, non una data: *«chiudono fra 2 giorni»* dice quello
 * che serve sapere, mentre *«12 settembre 2026, 23:59»* costringe a fare il
 * calcolo a mente ogni volta.
 *
 * Il conteggio si fa **nel browser** e non sul server per una ragione che si
 * vede solo dopo: una pagina servita alle 9:00 e lasciata aperta continuerebbe
 * a dire "mancano 3 ore" anche a mezzanotte. E siccome il server e il browser
 * partirebbero da due istanti diversi, alla prima resa il numero balla: per
 * questo il badge compare al secondo giro, e prima di allora non c'è.
 */
export function ContoAllaRovescia({ scadenza }: { scadenza: string }) {
  const [adesso, setAdesso] = useState<number | null>(null);

  useEffect(() => {
    setAdesso(Date.now());
    // ogni mezzo minuto: sotto l'ora i minuti si vedono scorrere, sopra non
    // cambia niente e non vale la pena tenere sveglia la pagina più di così
    const t = setInterval(() => setAdesso(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (adesso === null) return null;

  const mancano = new Date(scadenza).getTime() - adesso;

  if (mancano <= 0) return <Badge tono="danger">adesioni chiuse</Badge>;

  const minuti = Math.floor(mancano / 60_000);
  const ore = Math.floor(minuti / 60);
  const giorni = Math.floor(ore / 24);

  // più è vicino, più il tono si scalda: a tre giorni è un'informazione, a
  // un'ora è una cosa da fare adesso
  const tono = giorni >= 2 ? 'info' : ore >= 6 ? 'warn' : 'danger';

  const quanto =
    giorni >= 1
      ? `${giorni}g ${ore % 24}h`
      : ore >= 1
        ? `${ore}h ${minuti % 60}m`
        : `${minuti}m`;

  return <Badge tono={tono}>adesioni: {quanto}</Badge>;
}
