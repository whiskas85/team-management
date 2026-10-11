import { prisma } from './db';
import { meta } from './macchine';

/**
 * I chilometri di una macchinata, calcolati dal percorso vero.
 *
 * I punti sono quelli dell'itinerario — partenza, tappe nell'ordine, arrivo —
 * e qui si conta la **sola andata**. Il ritorno, quando c'è (il solito: chi
 * guida riporta ognuno dove l'ha preso, per la stessa strada), lo raddoppia
 * chi fa i conti, secondo `andataRitorno` della macchina.
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

/**
 * Le autostrade dove il casello non c'è: la Salerno–Reggio, le siciliane
 * Palermo–Catania e Palermo–Mazara, il Raccordo di Roma e la Roma–Fiumicino.
 * Le altre «A» si pagano.
 */
const AUTOSTRADE_GRATIS = new Set(['A2', 'A19', 'A29', 'A90', 'A91']);

/** È un'autostrada a pagamento? Dal codice della strada: «A4», «A 1;E35». */
export function aPagamento(ref: string | undefined) {
  if (!ref) return false;
  return ref
    .split(/[;,/]/)
    .map((r) => r.trim().replace(/\s+/g, '').toUpperCase())
    .some((r) => /^A\d+$/.test(r) && !AUTOSTRADE_GRATIS.has(r));
}

/** Metri di strada fra i punti, nell'ordine, e quanti su autostrade a pagamento. */
async function strada(punti: Punto[]): Promise<{ metri: number; autostrada: number } | null> {
  try {
    const coord = punti.map((p) => `${p.lng},${p.lat}`).join(';');
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coord}?overview=false&steps=true`,
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) return null;
    const v = (await r.json()) as {
      code: string;
      routes?: { distance: number; legs: { steps: { distance: number; ref?: string }[] }[] }[];
    };
    if (v.code !== 'Ok' || !v.routes?.length) return null;
    const via = v.routes[0];
    const autostrada = via.legs
      .flatMap((l) => l.steps)
      .filter((st) => aPagamento(st.ref))
      .reduce((t, st) => t + st.distance, 0);
    return { metri: via.distance, autostrada };
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
 * l'ultima volta. Restituisce i chilometri (sola andata) e se sono una
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
  kmAutostrada: number | null;
  tappe: PuntoTesto[];
}): Promise<{ km: number | null; stimati: boolean; autostrada: number | null }> {
  const punti: PuntoTesto[] = [
    { luogo: m.partenza, lat: m.partenzaLat, lng: m.partenzaLng },
    ...m.tappe,
    { luogo: m.arrivo, lat: m.arrivoLat, lng: m.arrivoLng },
  ].filter((p) => meta(p.luogo, p.lat, p.lng));

  const firma = firmaPunti(punti);
  if (firma === m.kmFirma) {
    return { km: m.kmCalcolati, stimati: m.kmStimati, autostrada: m.kmAutostrada };
  }
  if (punti.length < 2) return { km: null, stimati: false, autostrada: null };

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
      data: { kmCalcolati: null, kmFirma: firma, kmStimati: false, kmAutostrada: null },
    });
    return { km: null, stimati: false, autostrada: null };
  }

  const via = await strada(coord);
  let metri = via?.metri ?? null;
  let stimati = false;
  if (metri == null) {
    metri = coord.slice(1).reduce((t, p, i) => t + aria(coord[i], p), 0) * 1.3;
    stimati = true;
  }
  // la sola andata: il ritorno lo conta chi legge, se c'è (andataRitorno)
  const km = Math.round(metri / 1000);
  // in linea d'aria l'autostrada non si sa: i caselli restano da scrivere
  const autostrada = via ? Math.round(via.autostrada / 1000) : null;

  await prisma.macchina.update({
    where: { id: m.id },
    data: { kmCalcolati: km, kmFirma: firma, kmStimati: stimati, kmAutostrada: autostrada },
  });
  return { km, stimati, autostrada };
}

// ------------------------------------------------------------ carburante

export const ALIMENTAZIONI = ['BENZINA', 'GASOLIO', 'GPL', 'METANO', 'ELETTRICA'] as const;
export type Alimentazione = (typeof ALIMENTAZIONI)[number];

export const etichettaAlimentazione: Record<Alimentazione, string> = {
  BENZINA: 'Benzina',
  GASOLIO: 'Diesel',
  GPL: 'GPL',
  METANO: 'Metano',
  ELETTRICA: 'Elettrica',
};

/** Il consumo proposto se l'autista non l'ha mai detto: una macchina media. */
export const consumoTipico: Record<Alimentazione, number> = {
  BENZINA: 6.5,
  GASOLIO: 5.5,
  GPL: 8.5,
  METANO: 4.5,
  // kWh ogni 100 km
  ELETTRICA: 17,
};

/** Cosa si consuma: litri, chili di metano, kWh di corrente. */
export const unitaConsumo = (a: Alimentazione) =>
  a === 'METANO' ? 'kg' : a === 'ELETTRICA' ? 'kWh' : 'l';

/** L'unità del prezzo, di conseguenza. */
export const unitaPrezzo = (a: Alimentazione) => `€/${unitaConsumo(a)}`;

/**
 * La corrente non ha un osservatorio dei prezzi come i carburanti: si ricarica
 * a casa a 25-30 centesimi, alle colonnine a 50-80. Si propone una via di
 * mezzo, e chi guida scrive la sua.
 */
export const PREZZO_KWH = 0.4;

type Carburante = Exclude<Alimentazione, 'ELETTRICA'>;

/**
 * Quanto costa un pieno al chilometro dove si parte.
 *
 * Prima i distributori vicini alla partenza, dall'osservatorio prezzi del
 * Ministero (gli stessi numeri dell'app «Carburanti»): la mediana dei prezzi
 * self entro 10 km. Se non risponde, o lì non c'è niente, la media nazionale
 * della settimana del Ministero dell'Ambiente. Nessuna chiave in nessuno dei
 * due: sono dati pubblici.
 */
const CODICE_MIMIT: Record<Carburante, string> = {
  BENZINA: '1-x',
  GASOLIO: '2-x',
  METANO: '3-x',
  GPL: '4-x',
};
const NOME_MIMIT: Record<Carburante, RegExp> = {
  BENZINA: /^benzina$/i,
  GASOLIO: /^gasolio$/i,
  METANO: /^metano$/i,
  GPL: /^gpl$/i,
};
const COLONNA_MASE: Record<Carburante, string> = {
  BENZINA: 'BENZINA',
  GASOLIO: 'GASOLIO_AUTO',
  GPL: 'GPL',
  METANO: 'METANO',
};

const mediana = (v: number[]) => {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
};

async function prezzoVicino(a: Carburante, p: Punto): Promise<number[] | null> {
  try {
    const r = await fetch('https://carburanti.mise.gov.it/ospzApi/search/zone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({
        points: [{ lat: p.lat, lng: p.lng }],
        fuelType: CODICE_MIMIT[a],
        priceOrder: 'asc',
        radius: 10,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return null;
    const v = (await r.json()) as {
      success?: boolean;
      results?: { fuels?: { price: number; name: string; isSelf: boolean }[] }[];
    };
    const prezzi = (v.results ?? [])
      .flatMap((d) => d.fuels ?? [])
      .filter((f) => f.isSelf && NOME_MIMIT[a].test(f.name.trim()) && f.price > 0.3 && f.price < 5)
      .map((f) => f.price);
    return prezzi.length ? prezzi : null;
  } catch {
    return null;
  }
}

async function prezzoNazionale(a: Carburante): Promise<{ prezzo: number; giorno: string } | null> {
  try {
    const r = await fetch(
      'https://sisen.mase.gov.it/dgsaie/api/v1/weekly-prices/report/export?format=CSV&lang=it',
      { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) },
    );
    if (!r.ok) return null;
    const righe = (await r.text()).trim().split(/\r?\n/);
    const colonne = righe[0].split(',');
    const i = colonne.indexOf(COLONNA_MASE[a]);
    if (i < 0) return null;
    // i numeri sono all'italiana e fra virgolette («1.115,75»): si legge un campo per volta
    const campi = (riga: string) =>
      riga.match(/("[^"]*"|[^,]*)(,|$)/g)?.map((c) => c.replace(/,$/, '').replace(/"/g, '')) ?? [];
    for (let k = righe.length - 1; k > 0; k--) {
      const c = campi(righe[k]);
      const v = Number((c[i] ?? '').replace(/\./g, '').replace(',', '.'));
      // euro ogni mille litri (o chili)
      if (v > 300) return { prezzo: Math.round(v) / 1000, giorno: c[0] };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Il prezzo per questa macchina: si cerca una volta al giorno per alimentazione
 * e punto di partenza, e si tiene salvato con la sua fonte.
 */
export async function aggiornaPrezzo(m: {
  id: string;
  alimentazione: string | null;
  partenza: string | null;
  partenzaLat: number | null;
  partenzaLng: number | null;
  arrivo: string | null;
  arrivoLat: number | null;
  arrivoLng: number | null;
  prezzoAuto: unknown;
  prezzoFonte: string | null;
  prezzoFirma: string | null;
}): Promise<{ prezzo: number | null; fonte: string | null }> {
  const a = (ALIMENTAZIONI as readonly string[]).includes(m.alimentazione ?? '')
    ? (m.alimentazione as Alimentazione)
    : 'BENZINA';
  const oggi = new Date().toISOString().slice(0, 10);
  const dove =
    meta(m.partenza, m.partenzaLat, m.partenzaLng) ?? meta(m.arrivo, m.arrivoLat, m.arrivoLng);
  const firma = `${a}|${dove ?? ''}|${oggi}`;
  if (a === 'ELETTRICA') {
    return {
      prezzo: PREZZO_KWH,
      fonte: 'prezzo medio di una ricarica, fra casa e colonnine: correggilo col tuo',
    };
  }
  if (firma === m.prezzoFirma) {
    return { prezzo: m.prezzoAuto != null ? Number(m.prezzoAuto) : null, fonte: m.prezzoFonte };
  }

  let prezzo: number | null = null;
  let fonte: string | null = null;
  // il punto: le coordinate se ci sono, se no si cerca l'indirizzo
  let punto: Punto | null = null;
  if (m.partenzaLat != null && m.partenzaLng != null)
    punto = { lat: m.partenzaLat, lng: m.partenzaLng };
  else if (m.partenza) punto = await cerca(m.partenza);
  if (!punto && m.arrivoLat != null && m.arrivoLng != null)
    punto = { lat: m.arrivoLat, lng: m.arrivoLng };

  if (punto) {
    const vicini = await prezzoVicino(a, punto);
    if (vicini) {
      prezzo = Math.round(mediana(vicini) * 1000) / 1000;
      fonte = `mediana di ${vicini.length} distributori self vicino alla partenza, oggi`;
    }
  }
  if (prezzo == null) {
    const naz = await prezzoNazionale(a);
    if (naz) {
      prezzo = naz.prezzo;
      fonte = `media nazionale della settimana del ${naz.giorno.split('-').reverse().join('/')}`;
    }
  }

  await prisma.macchina.update({
    where: { id: m.id },
    data: { prezzoAuto: prezzo, prezzoFonte: fonte, prezzoFirma: firma },
  });
  return { prezzo, fonte };
}

/**
 * Quanto costano i caselli, stimato: la tariffa media delle autostrade
 * italiane per un'auto (classe A), al chilometro. Ogni tratta ha la sua, e
 * le barriere a pagamento fisso non seguono i chilometri: è una stima, e si
 * dice. Chi ha lo scontrino scrive il vero.
 */
export const TARIFFA_AUTOSTRADA = 0.08;
