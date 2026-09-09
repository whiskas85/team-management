/**
 * Il diario di bordo: le ultime cose successe nella scheda, con l'ora.
 *
 * Serve a rispondere alla sola domanda che conta davanti a un errore, e a cui
 * finora non si sapeva rispondere: **cosa stava facendo?**. Una pila di
 * chiamate dice dove il codice si è rotto; il diario dice da dove ci si era
 * arrivati — quale pagina, quale pulsante, quale risposta del server era
 * andata storta un attimo prima.
 *
 * Sta in memoria e non nel database: è un anello di poche righe che si
 * riscrive da solo, e finisce sul server **solo** quando qualcosa si rompe.
 * Una copia va in `sessionStorage`, perché il caso classico è che la persona
 * ricarichi prima ancora che la segnalazione parta: dopo il ricaricamento la
 * memoria è vuota, quel poco di storia no.
 *
 * Non ci finisce niente che la persona abbia scritto: solo dove è andata, cosa
 * ha premuto e cosa ha risposto il server. Un diario che raccogliesse anche i
 * contenuti diventerebbe una registrazione di quello che la gente fa, ed è
 * un'altra cosa da un registro dei guasti.
 */

const CHIAVE = 'zd-diario';
/** Quante righe si tengono: oltre, si legge un romanzo invece di un guasto. */
const RIGHE = 40;
const MAX_TESTO = 200;

export type RigaDiario = { ora: string; tipo: string; testo: string };

let anello: RigaDiario[] = [];

const oraDiAdesso = () =>
  new Date().toLocaleTimeString('it-IT', { hour12: false }) +
  '.' +
  String(new Date().getMilliseconds()).padStart(3, '0');

/** Rilegge quello che era rimasto da prima del ricaricamento. */
function riprendi() {
  if (anello.length > 0 || typeof window === 'undefined') return;
  try {
    const salvato = sessionStorage.getItem(CHIAVE);
    if (salvato) anello = JSON.parse(salvato) as RigaDiario[];
  } catch {
    // sessionStorage negato o pieno: si va avanti senza, non è un motivo per
    // rompere la pagina proprio mentre si cerca di capire cos'altro l'ha rotta
  }
}

/**
 * Scrive una riga. Chiamarla non deve mai poter far danni: qualunque cosa vada
 * storta qui viene ingoiata, perché il diario è uno strumento di diagnosi e
 * non deve diventare la causa del prossimo errore.
 */
export function annota(tipo: string, testo: string) {
  if (typeof window === 'undefined') return;
  try {
    riprendi();
    anello.push({ ora: oraDiAdesso(), tipo, testo: String(testo).slice(0, MAX_TESTO) });
    if (anello.length > RIGHE) anello = anello.slice(-RIGHE);
    sessionStorage.setItem(CHIAVE, JSON.stringify(anello));
  } catch {
    /* vedi sopra */
  }
}

/** Il diario come si legge: una riga per riga, l'ora davanti. */
export function leggiDiario(): string {
  riprendi();
  return anello.map((r) => `${r.ora}  ${r.tipo.padEnd(9)} ${r.testo}`).join('\n');
}

export function svuotaDiario() {
  anello = [];
  try {
    sessionStorage.removeItem(CHIAVE);
  } catch {
    /* vedi sopra */
  }
}
