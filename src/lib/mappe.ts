/**
 * Lettura di un link di Google Maps. I formati sono parecchi e non tutti
 * contengono le coordinate: quando mancano si recupera almeno il nome del
 * posto, che è comunque meglio di niente.
 */

export type LuogoEstratto = {
  lat?: number;
  lng?: number;
  /** Nome del luogo ricavato dal link, quando c'è. */
  nome?: string;
};

const COORD = String.raw`-?\d{1,3}\.\d+`;

const valide = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);

/** Il pezzo /place/<Nome+Del+Posto>/ oppure ?q=<nome>. */
function nomeDaLink(testo: string): string | undefined {
  const place = testo.match(/\/maps\/place\/([^/@?]+)/);
  const grezzo = place?.[1] ?? testo.match(/[?&](?:q|query)=([^&]+)/)?.[1];
  if (!grezzo) return undefined;

  try {
    const nome = decodeURIComponent(grezzo.replace(/\+/g, ' ')).trim();
    // scartiamo solo le coppie di coordinate: i plus code iniziano con una
    // cifra ma sono nomi utilissimi, non vanno buttati via
    const eCoppia = new RegExp(`^${COORD}\\s*,\\s*${COORD}$`).test(nome);
    return eCoppia ? undefined : nome || undefined;
  } catch {
    return undefined;
  }
}

export function estraiLuogo(testo: string): LuogoEstratto | null {
  const t = testo.trim();
  if (!t) return null;

  const schemi = [
    // coordinate incollate a mano: "45.6983, 9.6773"
    new RegExp(`^(${COORD})[,\\s]+(${COORD})$`),
    // link lungo: ...!3d45.6983!4d9.6773
    new RegExp(`!3d(${COORD})!4d(${COORD})`),
    // vista sulla mappa: /@45.6983,9.6773,15z
    new RegExp(`@(${COORD}),(${COORD})`),
    // parametri: ?q= &query= &ll= &destination=
    new RegExp(`[?&](?:q|query|ll|sll|daddr|destination)=(${COORD}),\\s*(${COORD})`),
  ];

  for (const schema of schemi) {
    const trovato = t.match(schema);
    if (trovato) {
      const lat = Number(trovato[1]);
      const lng = Number(trovato[2]);
      if (valide(lat, lng)) return { lat, lng, nome: nomeDaLink(t) };
    }
  }

  // nessuna coordinata: restituiamo il nome, se il link ne porta uno
  const nome = nomeDaLink(t);
  return nome ? { nome } : null;
}

/** Link accorciati che vale la pena espandere lato server. */
const HOST_BREVI = ['maps.app.goo.gl', 'goo.gl', 'g.co'];

export function eLinkBreve(testo: string): boolean {
  try {
    return HOST_BREVI.includes(new URL(testo.trim()).hostname);
  } catch {
    return false;
  }
}

/** Solo Google: evita che il server venga usato per raggiungere altri indirizzi. */
export const HOST_AMMESSI = [
  ...HOST_BREVI,
  'maps.google.com',
  'www.google.com',
  'google.com',
  'www.google.it',
  'google.it',
];
