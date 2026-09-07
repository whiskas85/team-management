'use client';

import { useEffect } from 'react';
import { segnaEventoLetto } from '@/actions/letture';

/**
 * Segna l'attività come vista appena viene aperta, così smette di contare fra
 * le novità.
 *
 * Non rende niente, e sta qui invece che nel render della pagina per la stessa
 * ragione della scheda di un operatore: scrivere durante il render di un
 * server component è fragile — il render si ripete, e il prefetch lo farebbe
 * scattare senza che nessuno abbia davvero aperto niente.
 */
export function SegnaEventoLetto({ eventId }: { eventId: string }) {
  useEffect(() => {
    segnaEventoLetto(eventId);
  }, [eventId]);

  return null;
}
