'use server';

import { requireUser } from '@/lib/auth';
import { HOST_AMMESSI, eLinkBreve, estraiLuogo } from '@/lib/mappe';
import { estraiPlusCode, ricostruisci } from '@/lib/pluscode';

export type LuogoRisolto = {
  lat?: number;
  lng?: number;
  nome?: string;
  citta?: string;
  provincia?: string;
  /** Come sono state ottenute le coordinate, da spiegare all'utente. */
  fonte?: 'link' | 'pluscode' | 'ricerca';
  errore?: string;
  avviso?: string;
};

const UA = 'ZeroDarkGestionale/1.0 (gestionale team softair)';

/** Segue un link accorciato di Google e restituisce l'indirizzo finale. */
async function espandi(link: string): Promise<{ url?: string; errore?: string }> {
  let indirizzo: URL;
  try {
    indirizzo = new URL(link.trim());
  } catch {
    return { errore: 'Non sembra un link valido.' };
  }
  if (!['https:', 'http:'].includes(indirizzo.protocol)) {
    return { errore: 'Link non supportato.' };
  }
  if (!HOST_AMMESSI.includes(indirizzo.hostname)) {
    return { errore: 'Sono accettati solo link di Google Maps.' };
  }

  try {
    const risposta = await fetch(indirizzo.toString(), {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ZeroDarkGestionale/1.0)' },
    });
    if (!risposta.ok) {
      return { errore: 'Questo link non esiste più o non è raggiungibile: controllalo su Maps.' };
    }
    return { url: risposta.url };
  } catch {
    return { errore: 'Non sono riuscito ad aprire il link. Riprova o incollalo per esteso.' };
  }
}

/** Cerca un indirizzo su OpenStreetMap. Nessuna chiave, uso sporadico. */
async function cerca(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' +
      encodeURIComponent(query);
    const risposta = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!risposta.ok) return null;

    const risultati = (await risposta.json()) as { lat: string; lon: string }[];
    if (!risultati.length) return null;
    return { lat: Number(risultati[0].lat), lng: Number(risultati[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Da "8X55+42 Campo Decima, 10030 Villareggia TO" tira fuori le parti utili:
 * il plus code, il nome del posto e la località con la provincia.
 */
function scomponi(nome: string) {
  const plusCode = estraiPlusCode(nome);
  const senzaCodice = plusCode ? nome.replace(plusCode, '').trim() : nome;

  const pezzi = senzaCodice
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  // ultimo pezzo tipo "10030 Villareggia TO"
  const coda = pezzi.length > 1 ? pezzi[pezzi.length - 1] : '';
  const localita = coda.match(/^(?:(\d{5})\s+)?(.+?)(?:\s+([A-Z]{2}))?$/);

  return {
    plusCode,
    posto: pezzi[0] || senzaCodice,
    citta: localita?.[2]?.trim(),
    provincia: localita?.[3],
    localitaCompleta: coda || pezzi[0] || senzaCodice,
  };
}

/**
 * Ricava il punto da un link di Google Maps, in tre modi in cascata:
 * coordinate scritte nel link, plus code ricostruito sulla località, oppure
 * ricerca dell'indirizzo. Se non basta nessuno dei tre lo dice.
 */
export async function risolviLuogo(testo: string): Promise<LuogoRisolto> {
  await requireUser();

  const input = testo.trim();
  if (!input) return { errore: 'Incolla un link o delle coordinate.' };

  let daAnalizzare = input;
  if (eLinkBreve(input)) {
    const espanso = await espandi(input);
    if (espanso.errore) return { errore: espanso.errore };
    daAnalizzare = espanso.url ?? input;
  }

  // Testo libero: "autogrill A4 uscita Bergamo". Non è un link e non sono
  // coordinate, ma è il modo in cui le persone dicono davvero dove trovarsi —
  // e cercarlo è tutto quello che serve per trasformarlo in un punto sulla
  // mappa. Prima si poteva solo incollare un link, cioè bisognava aprire Maps
  // per fare a mano quello che il gestionale può fare da solo.
  const sembraUnLink = /^https?:\/\//i.test(input) || input.includes('maps.app.goo.gl');
  if (!sembraUnLink && !estraiLuogo(input)?.lat) {
    const trovato = await cerca(input);
    if (!trovato) {
      return {
        errore: 'Non l’ho trovato. Prova a scriverlo diversamente, o incolla un link di Maps.',
      };
    }
    const parti = scomponi(input);
    return {
      lat: trovato.lat,
      lng: trovato.lng,
      nome: input,
      citta: parti.citta,
      provincia: parti.provincia,
      fonte: 'ricerca',
    };
  }

  const luogo = estraiLuogo(daAnalizzare);

  // 1. coordinate scritte direttamente nel link
  if (luogo?.lat !== undefined && luogo?.lng !== undefined) {
    const parti = luogo.nome ? scomponi(luogo.nome) : null;
    return {
      lat: luogo.lat,
      lng: luogo.lng,
      nome: parti?.posto ?? luogo.nome,
      citta: parti?.citta,
      provincia: parti?.provincia,
      fonte: 'link',
    };
  }

  if (!luogo?.nome) {
    return { errore: 'Da questo link non ricavo né coordinate né nome. Compila i campi a mano.' };
  }

  const parti = scomponi(luogo.nome);

  // 2. plus code: preciso al metro, basta una località di riferimento vicina
  if (parti.plusCode) {
    const riferimento = await cerca(parti.localitaCompleta || parti.posto);
    if (riferimento) {
      const punto = ricostruisci(parti.plusCode, riferimento.lat, riferimento.lng);
      if (punto) {
        return {
          lat: punto.lat,
          lng: punto.lng,
          nome: parti.posto,
          citta: parti.citta,
          provincia: parti.provincia,
          fonte: 'pluscode',
        };
      }
    }
  }

  // 3. ricerca dell'indirizzo per esteso
  const trovato = await cerca(parti.posto + (parti.citta ? `, ${parti.citta}` : ''));
  if (trovato) {
    return {
      lat: trovato.lat,
      lng: trovato.lng,
      nome: parti.posto,
      citta: parti.citta,
      provincia: parti.provincia,
      fonte: 'ricerca',
    };
  }

  // niente coordinate: restituiamo almeno quello che sappiamo
  return {
    nome: parti.posto,
    citta: parti.citta,
    provincia: parti.provincia,
    avviso: `Ho preso il nome ("${parti.posto}") ma non sono riuscito a ricavare le coordinate. Puoi indicarle a mano, oppure aprire il punto su Maps e copiare il link dalla barra degli indirizzi.`,
  };
}
