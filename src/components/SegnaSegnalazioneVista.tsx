'use client';

import { useEffect } from 'react';
import { segnaSegnalazioneVista } from '@/actions/canali-segnalazioni';

/**
 * La segnalazione è davanti agli occhi: si spegne il pallino, e chi la
 * gestisce la segna letta. Solo con la pagina in primo piano — una scheda
 * lasciata dietro le altre non è una lettura.
 */
export function SegnaSegnalazioneVista({ id }: { id: string }) {
  useEffect(() => {
    const segna = () => {
      if (document.visibilityState === 'visible') segnaSegnalazioneVista(id);
    };
    segna();
    document.addEventListener('visibilitychange', segna);
    return () => document.removeEventListener('visibilitychange', segna);
  }, [id]);

  return null;
}
