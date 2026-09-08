'use client';

import { useEffect } from 'react';
import { segnaDebriefingLetti } from '@/actions/letture';

/**
 * Segna come letti i debriefing che si stanno guardando.
 *
 * Qui "aperto" e "letto" coincidono davvero: il testo è tutto nella pagina,
 * non c'è un dentro in cui entrare. Sta in un componente client e non nel
 * render del server per la solita ragione — scrivere durante il render è
 * fragile, e il prefetch lo farebbe scattare senza che nessuno abbia guardato
 * niente.
 */
export function SegnaDebriefingLetti({ ids }: { ids: string[] }) {
  const chiave = ids.join(',');

  useEffect(() => {
    if (!chiave) return;
    segnaDebriefingLetti(chiave.split(','));
  }, [chiave]);

  return null;
}
