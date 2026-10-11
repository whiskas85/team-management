import { prisma } from './db';
import { meta } from './macchine';

/**
 * I chilometri di una macchinata, calcolati dal percorso vero.
 *
 * I punti sono quelli dell'itinerario — partenza, tappe nell'ordine, arrivo —
 * e il viaggio si conta **andata e ritorno**: chi guida torna indietro per la
 * stessa strada, riportando ognuno dove l'ha preso.
 *
 * Il percorso lo dà OSRM, il navigatore libero di OpenStreetMap (nessuna
 * chiave). I punti senza coordinate si cercano prima su OpenStreetMap. Se il
 * servizio non risponde si stima in linea d'aria, con un 30% in più per le
 * curve, e lo si dice: meglio un numero dichiarato approssimato che nessuno.
 *
 * Si ricalcola solo quando i punti cambiano: la firma dei punti resta salvata
 * accanto ai chilometri.
 */

const UA = 'ZeroDarkGestionale/1.0 (gestionale team softair)';

type Punto = { lat: number; lng: number };

async function cerca(testo: string): Promise<Punto | null> {
  try {
    const r = await fetch(
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
        encodeURIComponent(testo),
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(6000) },
    );
    if (!r.ok) return null;
    const v = (await r.json()) as { lat: string; lon: string }[];
    return v.length ? { lat: Number(v[0].lat), lng: Number(v[0].lon) } : null;
  } catch {
    return null;
  }
}

/** Metri di strada fra i punti, nell'ordine; nullo se il servizio non risponde. */
async function strada(punti: Punto[]): Promise<number | null> {
  try {
    const coord = punti.map((p) => `${p.lng},${p.lat}`).join(';');
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coord}?overview=false`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) },
    );
    if (!r.ok) return null;
    const v = (await r.json()) as { code: string; routes?: { distance: number }[] };
    return v.code === 'Ok' && v.routes?.length ? v.routes[0].distance : null;
  } catch {
    return null;
  }
}

/** Metri in linea d'aria fra due punti. */
function aria(a: Punto, b: Punto) {
  const R = 6_371_000;
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b.lat - a.lat);
  const dLng = r(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type PuntoTesto = { luogo: string | null; lat: number | null; lng: number | null };

/** La firma dei punti: se non cambia, i chilometri salvati valgono ancora. */
export const firmaPunti = (punti: PuntoTesto[]) =>
  punti.map((p) => meta(p.luogo, p.lat, p.lng) ?? '').join('|');

/**
 * Ricalcola i chilometri della macchina se l'itinerario è cambiato da
 * l'ultima volta. Restituisce i chilometri (andata e ritorno) e se sono una
 * stima.
 */
export async function aggiornaKm(m: {
  id: string;
  partenza: string | null;
  partenzaLat: number | null;
  partenzaLng: number | null;
  arrivo: string | null;
  arrivoLat: number | null;
  arrivoLng: number | null;
  kmCalcolati: number | null;
  kmFirma: string | null;
  kmStimati: boolean;
  tappe: PuntoTesto[];
}): Promise<{ km: number | null; stimati: boolean }> {
  const punti: PuntoTesto[] = [
    { luogo: m.partenza, lat: m.partenzaLat, lng: m.partenzaLng },
    ...m.tappe,
    { luogo: m.arrivo, lat: m.arrivoLat, lng: m.arrivoLng },
  ].filter((p) => meta(p.luogo, p.lat, p.lng));

  const firma = firmaPunti(punti);
  if (firma === m.kmFirma) return { km: m.kmCalcolati, stimati: m.kmStimati };
  if (punti.length < 2) return { km: null, stimati: false };

  // i punti scritti senza coordinate si cercano; se uno non si trova, si salta
  const coord: Punto[] = [];
  for (const p of punti) {
    if (p.lat != null && p.lng != null) coord.push({ lat: p.lat, lng: p.lng });
    else {
      const trovato = await cerca(p.luogo!);
      if (trovato) coord.push(trovato);
    }
  }
  if (coord.length < 2) {
    // non si trovano: lo si ricorda, per non ricercarli a ogni apertura
    await prisma.macchina.update({
      where: { id: m.id },
      data: { kmCalcolati: null, kmFirma: firma, kmStimati: false },
    });
    return { km: null, stimati: false };
  }

  let metri = await strada(coord);
  let stimati = false;
  if (metri == null) {
    metri = coord.slice(1).reduce((t, p, i) => t + aria(coord[i], p), 0) * 1.3;
    stimati = true;
  }
  const km = Math.round((metri * 2) / 1000);

  await prisma.macchina.update({
    where: { id: m.id },
    data: { kmCalcolati: km, kmFirma: firma, kmStimati: stimati },
  });
  return { km, stimati };
}
