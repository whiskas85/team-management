'use client';

import { useEffect } from 'react';
import { segnaProfiloLetto } from '@/actions/letture';

/**
 * Segna la scheda come letta appena viene aperta, così il pallino sui "Nuovi"
 * smette di contarla per chi sta guardando.
 *
 * Non rende niente: sta qui e non nel render della pagina perché scrivere
 * durante il render di un server component è fragile (il render si ripete, e
 * il prefetch lo farebbe scattare senza che nessuno abbia davvero aperto la
 * scheda).
 */
export function SegnaLetto({ profiloId }: { profiloId: string }) {
  useEffect(() => {
    segnaProfiloLetto(profiloId);
  }, [profiloId]);

  return null;
}
