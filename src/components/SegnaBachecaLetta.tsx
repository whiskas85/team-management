'use client';

import { useEffect } from 'react';
import { segnaBachecaLetta } from '@/actions/bacheche';

/**
 * Le spunte colorate: la bacheca è aperta, i messaggi sono davanti agli occhi.
 *
 * Si segna solo se la pagina è davvero in primo piano: una scheda lasciata
 * aperta dietro le altre non è una lettura. Se la pagina era nascosta, si
 * aspetta il momento in cui torna visibile.
 */
export function SegnaBachecaLetta({ bachecaId }: { bachecaId: string }) {
  useEffect(() => {
    const segna = () => {
      if (document.visibilityState === 'visible') segnaBachecaLetta(bachecaId);
    };
    segna();
    document.addEventListener('visibilitychange', segna);
    return () => document.removeEventListener('visibilitychange', segna);
  }, [bachecaId]);

  return null;
}
