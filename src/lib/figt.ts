/**
 * Lettura dei tesseramenti dal portale ASNWG/FIGT.
 *
 * La tessera non la emettiamo noi: esiste sul portale federale e qui va solo
 * riconosciuta e agganciata all'operatore giusto. Quindi niente creazione a
 * mano, si importa quello che il portale dice.
 *
 * Il portale è un PHP con sessione a cookie e pagine HTML: non c'è un'API.
 * Si entra con POST su index.php e poi si legge la tabella di
 * tesseramenti_lista.php.
 */

const BASE = 'https://www.intranetasnwg.it';

export type TesseraPortale = {
  /** Numero tessera FIGT, es. "2026-02885". */
  numero: string;
  /** Cognome e nome come li scrive il portale, tutto maiuscolo. */
  nominativo: string;
  comune: string | null;
  email: string | null;
  qualifica: string | null;
  /** ATTIVO, SCADUTO… */
  stato: string;
  associazione: string | null;
  tesseraAcsi: string | null;
  anno: number;
  /** Id del tesseramento sul portale, per risalire alla scheda. */
  idTesseramento: string | null;
};

/** Una tessera federale vale fino al 31 dicembre del suo anno. */
export function scadenzaTessera(anno: number): Date {
  return new Date(anno, 11, 31);
}

const ripulisci = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Estrae le tessere dalla pagina della lista. Il portale non ha classi né id
 * sulle righe, quindi ci si appoggia all'ordine delle colonne: se un domani
 * cambia, questa è la funzione da correggere e il resto non se ne accorge.
 */
export function leggiTessere(html: string): TesseraPortale[] {
  const tabelle = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) ?? [];
  // la tabella buona è quella con le righe dei tesserati, non quella di ricerca
  const lista = tabelle.find((t) => /tesseramenti_scheda\.php/i.test(t));
  if (!lista) return [];

  const righe = lista.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];

  return righe.flatMap((riga) => {
    const celle = (riga.match(/<td[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(ripulisci);
    // le intestazioni usano <th>: quelle righe non hanno celle e cadono da sole
    if (celle.length < 9) return [];

    const numero = celle[0];
    if (!/^\d{4}-\d+$/.test(numero)) return [];

    const email = riga.match(/mailto:([^"']+)/i)?.[1] ?? null;
    const idTesseramento = riga.match(/tesseramenti_scheda\.php\?idtesseramento=(\d+)/i)?.[1] ?? null;
    const anno = Number(celle[8]) || Number(numero.slice(0, 4));

    return [
      {
        numero,
        nominativo: celle[1],
        comune: celle[2] || null,
        email: email?.toLowerCase() ?? null,
        qualifica: celle[4] || null,
        stato: celle[5] || 'SCONOSCIUTO',
        associazione: celle[6] || null,
        tesseraAcsi: celle[7] || null,
        anno,
        idTesseramento,
      },
    ];
  });
}

export type CredenzialiFigt = { login: string; password: string; idAnagrafica: string };

/**
 * Entra sul portale e restituisce i tesseramenti dell'associazione per l'anno
 * richiesto. I cookie di sessione si tengono a mano: fetch non ha un barattolo.
 */
/**
 * Apre una sessione sul portale e restituisce il cookie da riusare.
 * Il portale non ha API: si entra come farebbe un browser.
 */
async function entra(cred: CredenzialiFigt): Promise<string> {
  let cookie = '';
  const raccogli = (res: Response) => {
    const set = res.headers.getSetCookie?.() ?? [];
    const nuovi = set.map((c) => c.split(';')[0]).filter(Boolean);
    if (nuovi.length > 0) cookie = [cookie, ...nuovi].filter(Boolean).join('; ');
  };

  // una GET iniziale per farsi assegnare la sessione PHP
  raccogli(await fetch(`${BASE}/index.php`, { redirect: 'manual' }));

  const accesso = await fetch(`${BASE}/index.php`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(cookie ? { cookie } : {}),
    },
    body: new URLSearchParams({
      login: cred.login,
      password: cred.password,
      accedi: 'Accedi',
      azione: 'entra',
    }),
  });
  raccogli(accesso);

  // il portale risponde 302 verso home.php solo quando le credenziali vanno
  const destinazione = accesso.headers.get('location') ?? '';
  if (!destinazione.includes('home.php')) {
    throw new Error('Il portale FIGT non ha accettato le credenziali.');
  }

  return cookie;
}

export async function scaricaTessere(
  cred: CredenzialiFigt,
  anno: number,
): Promise<TesseraPortale[]> {
  const cookie = await entra(cred);

  const lista = await fetch(`${BASE}/tesseramenti_lista.php`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(cookie ? { cookie } : {}),
    },
    body: new URLSearchParams({
      azione: 'cerca',
      idanagrafica: cred.idAnagrafica,
      anno_ricerca: String(anno),
      pagina: '1',
    }),
  });

  if (!lista.ok) throw new Error(`Il portale ha risposto ${lista.status}.`);
  return leggiTessere(await lista.text());
}

/**
 * Accoppia una tessera a un operatore. L'email è l'unica chiave affidabile;
 * il nominativo del portale è "COGNOME NOME" tutto attaccato e con più nomi
 * propri, quindi si confronta a insiemi di parole invece che pezzo per pezzo.
 */
export function abbina<T extends { id: string; nome: string; cognome: string; email: string }>(
  tessera: TesseraPortale,
  operatori: T[],
): T | null {
  if (tessera.email) {
    const perEmail = operatori.find((o) => o.email.toLowerCase() === tessera.email);
    if (perEmail) return perEmail;
  }

  const parole = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z]+/)
        .filter(Boolean),
    );

  const dalPortale = parole(tessera.nominativo);
  const candidati = operatori.filter((o) => {
    const nostre = parole(`${o.cognome} ${o.nome}`);
    // tutte le parole del nostro nome devono comparire nel nominativo federale:
    // il portale ha spesso secondi nomi che noi non registriamo
    return nostre.size > 0 && [...nostre].every((w) => dalPortale.has(w));
  });

  // un solo candidato: siamo sicuri. Due o più: meglio lasciar decidere a mano
  return candidati.length === 1 ? candidati[0] : null;
}

// ------------------------------------------------------------ polizza prova

export type DatiPolizza = {
  nome: string;
  cognome: string;
  nascita: Date;
  luogoNascita: string;
  /** Giorno in cui si gioca: la polizza copre fino alle 24:00 di quel giorno. */
  giorno: Date;
};

export type PolizzaProva = {
  /** Numero della polizza prova, es. "2793". */
  numero: string;
  /** Id della pratica sul portale. */
  idPolizza: string;
  /** Numero della polizza infortuni della compagnia, es. "IAH0004730". */
  polizzaInfortuni: string | null;
  valida: string | null;
};

/** Il portale scrive le date come 06-09-2026. */
const giornoPortale = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

/** …ma nel modulo le vuole come 2026-09-06. */
const giornoModulo = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Anni compiuti a una certa data. */
export function eta(nascita: Date, quando: Date): number {
  let a = quando.getFullYear() - nascita.getFullYear();
  const primaDelCompleanno =
    quando.getMonth() < nascita.getMonth() ||
    (quando.getMonth() === nascita.getMonth() && quando.getDate() < nascita.getDate());
  return primaDelCompleanno ? a - 1 : a;
}

/**
 * Attiva una polizza prova (la "giornaliera") sul portale federale.
 *
 * Attenzione: ogni attivazione consuma una polizza vera e non si può
 * annullare. Il portale la crea solo all'ultimo passo — `polizzeprova_salva` —
 * mentre i passi precedenti sono innocui: qui si sfrutta questo per controllare
 * tutto prima di impegnarsi, e ci si ferma appena qualcosa non torna.
 *
 * I tre passi sono quelli del portale: modulo, riepilogo, salvataggio. I dati
 * viaggiano nella sessione PHP fra un passo e l'altro, quindi vanno fatti in
 * fila sullo stesso cookie.
 */
export async function attivaPolizzaProva(
  cred: CredenzialiFigt,
  idAffiliazione: string,
  dati: DatiPolizza,
): Promise<PolizzaProva> {
  const cookie = await entra(cred);
  const intestazioni = { 'content-type': 'application/x-www-form-urlencoded', cookie };

  // 1. il modulo: da qui si scopre per quali giorni il portale accetta una
  //    polizza. È una finestra di pochi giorni, non si assicura con un mese
  //    di anticipo
  const modulo = await fetch(
    `${BASE}/polizzeprova_inserisci.php?idaffiliazione=${encodeURIComponent(idAffiliazione)}`,
    { headers: { cookie } },
  );
  if (!modulo.ok) throw new Error(`Il portale ha risposto ${modulo.status} al modulo polizze.`);

  const html = await modulo.text();
  const tendina = html.match(/<select[^>]*name="data_prova"[\s\S]*?<\/select>/i)?.[0] ?? '';
  const ammesse = [...tendina.matchAll(/value="(\d{4}-\d{2}-\d{2})"/g)].map((m) => m[1]);

  const voluto = giornoModulo(dati.giorno);
  if (ammesse.length > 0 && !ammesse.includes(voluto)) {
    throw new Error(
      `Il portale accetta polizze solo dal ${ammesse[0]} al ${ammesse[ammesse.length - 1]}: ` +
        `per il ${voluto} è troppo presto o troppo tardi.`,
    );
  }

  // 2. il riepilogo: il portale rimanda indietro i dati che ha capito. Se non
  //    combaciano ci si ferma qui, prima di consumare la polizza
  const riepilogo = await fetch(`${BASE}/polizzeprova_riepilogo.php`, {
    method: 'POST',
    headers: intestazioni,
    body: new URLSearchParams({
      data_prova: voluto,
      nome: dati.nome,
      cognome: dati.cognome,
      giorno: String(dati.nascita.getDate()),
      mese: String(dati.nascita.getMonth() + 1),
      anno: String(dati.nascita.getFullYear()),
      luogo_nascita: dati.luogoNascita,
      submit: 'prosegui',
      idaffiliazione: idAffiliazione,
      azione: 'prosegui',
      minore: 'no',
    }),
  });
  if (!riepilogo.ok) throw new Error(`Il portale ha risposto ${riepilogo.status} al riepilogo.`);

  const testoRiepilogo = testo(await riepilogo.text());
  if (/minore/i.test(testoRiepilogo) && /non puoi/i.test(testoRiepilogo)) {
    throw new Error('Il portale rifiuta la polizza: risulta un minore di 12 anni.');
  }
  if (!testoRiepilogo.toLowerCase().includes(dati.cognome.toLowerCase())) {
    throw new Error(
      'Il riepilogo del portale non riporta la persona attesa: non attivo niente. ' +
        'Controlla i dati e semmai procedi a mano sul portale.',
    );
  }

  // 3. il salvataggio: da qui in poi la polizza è consumata
  const salva = await fetch(`${BASE}/polizzeprova_salva.php?azione=inserisci`, {
    headers: { cookie },
    redirect: 'manual',
  });

  const destinazione = salva.headers.get('location') ?? '';
  const idPolizza = destinazione.match(/idpolizza=(\d+)/i)?.[1];
  if (!idPolizza) {
    throw new Error(
      'Il portale non ha confermato l’attivazione. Controlla sul portale se la polizza è stata creata prima di riprovare.',
    );
  }

  // 4. la pagina di cortesia porta il numero da conservare
  const cortesia = await fetch(`${BASE}/polizzeprova_cortesia.php?idpolizza=${idPolizza}`, {
    headers: { cookie },
  });
  const t = testo(await cortesia.text());

  const numero = t.match(/Polizza\s+Prova\s+n[°º:\s]*\s*(\d+)/i)?.[1];
  if (!numero) {
    throw new Error(
      `Polizza attivata (pratica ${idPolizza}) ma non sono riuscito a leggerne il numero: ` +
        'recuperalo dal portale.',
    );
  }

  return {
    numero,
    idPolizza,
    polizzaInfortuni: t.match(/Polizza\s+Infortuni\s+n[°º:\s]*\s*([A-Z0-9]+)/i)?.[1] ?? null,
    valida: t.match(/valevole fino alle ore [\d.]+ del ([\d-]+)/i)?.[1] ?? giornoPortale(dati.giorno),
  };
}

/** Testo leggibile di una pagina del portale, entità comprese. */
function testo(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------ giacenza delle polizze prova

export type GiacenzaPolizze = {
  /** Polizze prepagate ancora da usare. */
  residue: number;
  /** Quante ne sono già state assegnate, se il portale lo dice. */
  assegnate: number | null;
};

/**
 * Legge quante polizze prova restano dalla pagina informativa del portale.
 *
 * I due numeri stanno nella colonna di sinistra, sotto le rispettive voci di
 * menu: non hanno né id né classi, quindi si cercano nel testo della pagina.
 * "non assegnate" viene prima e non confonde l'altra, perché lì fra "prova" e
 * "assegnate" c'è di mezzo il "non".
 */
export function leggiGiacenzaPolizze(html: string): GiacenzaPolizze | null {
  const t = testo(html);
  const residue = t.match(/polizze\s+prova\s+non\s+assegnate\D{0,20}(\d+)/i)?.[1];
  if (residue === undefined) return null;

  const assegnate = t.match(/polizze\s+prova\s+assegnate\D{0,20}(\d+)/i)?.[1];
  return { residue: Number(residue), assegnate: assegnate === undefined ? null : Number(assegnate) };
}

/**
 * Quante polizze prova restano da usare. È una lettura: non consuma niente e
 * non cambia nulla sul portale.
 */
export async function contaPolizzeProva(cred: CredenzialiFigt): Promise<GiacenzaPolizze> {
  const cookie = await entra(cred);

  const pagina = await fetch(`${BASE}/polizzeprova_info.php`, {
    headers: { ...(cookie ? { cookie } : {}) },
  });
  if (!pagina.ok) throw new Error(`Il portale ha risposto ${pagina.status}.`);

  const giacenza = leggiGiacenzaPolizze(await pagina.text());
  if (!giacenza) {
    throw new Error(
      'Non ho trovato il numero di polizze nella pagina del portale: probabilmente ne è cambiato il layout.',
    );
  }
  return giacenza;
}

// --------------------------------------------------- anagrafica del tesserato

export type AnagraficaPortale = {
  nome: string | null;
  cognome: string | null;
  sesso: string | null;
  dataNascita: Date | null;
  luogoNascita: string | null;
  codiceFiscale: string | null;
  indirizzo: string | null;
  citta: string | null;
  provincia: string | null;
  cap: string | null;
  telefono: string | null;
  email: string | null;
  qualifica: string | null;
};

/** Le etichette della scheda: servono anche a capire quando un campo è vuoto. */
const ETICHETTE = [
  'nome',
  'cognome',
  'sesso',
  'data di nascita',
  'luogo di nascita',
  'codice fiscale',
  'via',
  'numero civico',
  'località',
  'nazione',
  'regione',
  'provincia',
  'comune',
  'cap',
  'telefono',
  'cellulare',
  'fax',
  'indirizzo e-mail',
  'qualifica',
  'note',
  'certificato medico',
  'data di rilascio',
  'data di scadenza',
  'estero',
];

/** Il portale scrive le date come 26-06-1973. */
function dataItaliana(v: string | null): Date | null {
  const m = v?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/**
 * Legge la scheda di un tesseramento.
 *
 * La pagina non ha né classi né id: è una tabella di coppie etichetta/valore.
 * Si appiattisce in una fila di pezzi e si prende quello che segue l'etichetta,
 * a meno che non sia a sua volta un'etichetta — succede spesso, perché i campi
 * vuoti non lasciano nessun segno e altrimenti "telefono" varrebbe "cellulare".
 */
export function leggiAnagrafica(html: string): AnagraficaPortale {
  const pezzi = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ugrave;/g, 'ù')
    .replace(/&eacute;/g, 'é')
    .replace(/&deg;/g, '°')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);

  const valore = (etichetta: string): string | null => {
    const i = pezzi.findIndex((p) => p.toLowerCase() === etichetta);
    if (i < 0 || i + 1 >= pezzi.length) return null;
    const succ = pezzi[i + 1];
    return ETICHETTE.includes(succ.toLowerCase()) ? null : succ;
  };

  const via = valore('via');
  const civico = valore('numero civico');

  return {
    nome: valore('nome'),
    cognome: valore('cognome'),
    sesso: valore('sesso'),
    dataNascita: dataItaliana(valore('data di nascita')),
    luogoNascita: valore('luogo di nascita'),
    codiceFiscale: valore('codice fiscale')?.toUpperCase() ?? null,
    indirizzo: via ? [via, civico].filter(Boolean).join(' ') : null,
    citta: valore('comune'),
    provincia: valore('provincia'),
    cap: valore('cap'),
    // il portale tiene due caselle: vale quella compilata
    telefono: valore('cellulare') ?? valore('telefono'),
    email: valore('indirizzo e-mail')?.toLowerCase() ?? null,
    qualifica: valore('qualifica'),
  };
}

/**
 * Scarica le schede dei tesseramenti indicati. Sono sole letture: non tocca
 * niente sul portale e non consuma nulla.
 */
export async function scaricaAnagrafiche(
  cred: CredenzialiFigt,
  idTesseramenti: string[],
): Promise<Map<string, AnagraficaPortale>> {
  const cookie = await entra(cred);
  const esito = new Map<string, AnagraficaPortale>();

  for (const id of idTesseramenti) {
    const res = await fetch(`${BASE}/tesseramenti_scheda.php?idtesseramento=${id}`, {
      headers: { cookie },
    });
    if (!res.ok) continue;
    esito.set(id, leggiAnagrafica(await res.text()));
  }

  return esito;
}
