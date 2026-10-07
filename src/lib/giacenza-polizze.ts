import { revalidatePath } from 'next/cache';
import { prisma } from './db';
import { decifra } from './segreti';
import { contaPolizzeProva } from './figt';
import { SCORTA_POLIZZE } from './assicurazione';
import { avvisa, chiSegueINuovi } from './push';

/*
 * Le polizze prova: quante ne restano sul portale federale.
 *
 * Il numero si legge dopo ogni attivazione, quando lo chiede qualcuno dalla
 * cassa, e da solo due volte al giorno (leggiPolizzeProgrammata, dai lavori
 * automatici): le polizze comprate le carica la segreteria federale quando
 * può, e senza una lettura nessuno se ne accorge finché non serve.
 */

/**
 * Rilegge la giacenza dal portale e la conserva, con la data della lettura.
 *
 * È la sola scrittura di quel dato: chiamarla dopo ogni attivazione tiene il
 * numero aggiornato da solo, senza che nessuno debba ricordarsi di premere il
 * pulsante. Se il portale non risponde si scala quella appena consumata: un
 * numero vecchio di un'ora è meno sbagliato di un numero fermo a ieri.
 */
export async function sincronizzaGiacenza(
  cred: { login: string; passwordCifrata: string; idAnagrafica: string },
  consumate = 0,
): Promise<number | null> {
  const dati = await (async () => {
    try {
      const g = await contaPolizzeProva({
        login: cred.login,
        password: decifra(cred.passwordCifrata),
        idAnagrafica: cred.idAnagrafica,
      });
      return { polizzeResidue: g.residue, polizzeAssegnate: g.assegnate };
    } catch {
      if (consumate === 0) return null;
      const attuale = await prisma.credenzialeFigt.findUnique({
        where: { id: 'figt' },
        select: { polizzeResidue: true, polizzeAssegnate: true },
      });
      if (attuale?.polizzeResidue === null || attuale?.polizzeResidue === undefined) return null;
      return {
        polizzeResidue: Math.max(0, attuale.polizzeResidue - consumate),
        polizzeAssegnate:
          attuale.polizzeAssegnate === null ? null : attuale.polizzeAssegnate + consumate,
      };
    }
  })();

  if (!dati) return null;

  const prima = await prisma.credenzialeFigt.findUnique({
    where: { id: 'figt' },
    select: { polizzeResidue: true },
  });

  await prisma.credenzialeFigt.update({
    where: { id: 'figt' },
    data: { ...dati, polizzeLetteIl: new Date() },
  });
  revalidatePath('/admin/cassa');
  revalidatePath('/admin/tessere');

  await avvisaScorteBasse(prima?.polizzeResidue ?? null, dati.polizzeResidue);
  await avvisaArrivate(prima?.polizzeResidue ?? null, dati.polizzeResidue);
  return dati.polizzeResidue;
}

/**
 * Sotto le cinque polizze si avvisa chi le compra.
 *
 * Le polizze prova sono prepagate e si comprano a blocchi, con i tempi della
 * segreteria federale in mezzo: accorgersi che sono finite il sabato sera,
 * mentre tre nuovi aspettano di essere coperti, vuol dire che quei tre non
 * giocano. Il numero c'era già in cassa, ma bisognava andarlo a guardare — e
 * nessuno guarda un numero che è sempre stato grande.
 *
 * **Si avvisa quando il numero scende**, non a ogni lettura: riaprire la cassa
 * o rileggere il portale non è una notizia. Ogni polizza consumata sotto
 * soglia manda la sua — cinque, quattro, tre è una discesa, e ognuna è più
 * urgente della precedente.
 */
async function avvisaScorteBasse(prima: number | null, adesso: number | null) {
  if (adesso === null || adesso > SCORTA_POLIZZE) return;
  if (prima !== null && adesso >= prima) return;

  await avvisa(await chiSegueINuovi(), {
    titolo:
      adesso === 0 ? 'Polizze prova finite' : `Restano ${adesso} polizze prova`,
    testo:
      adesso === 0
        ? 'Non si può più assicurare nessun nuovo: vanno comprate prima della prossima attività.'
        : `Sotto le ${SCORTA_POLIZZE}: conviene ricomprarle adesso, la segreteria federale non è immediata.`,
    url: '/admin/polizze',
    // un tag solo: due avvisi di scorte non fanno due righe sul telefono
    tag: 'polizze-scorte',
  });
}

/**
 * Sono arrivate polizze: il numero letto è più alto dell'ultimo.
 *
 * Le compra la squadra ma le carica la segreteria federale, con i suoi tempi:
 * chi le aspetta deve saperlo senza andare a controllare il portale ogni
 * giorno. Si avvisa solo quando il numero sale — una lettura uguale non è
 * una notizia — e solo se c'era un numero prima con cui confrontarlo.
 */
async function avvisaArrivate(prima: number | null, adesso: number | null) {
  if (prima === null || adesso === null || adesso <= prima) return;
  const arrivate = adesso - prima;
  await avvisa(await chiSegueINuovi(), {
    titolo:
      arrivate === 1 ? 'È arrivata una polizza prova' : `Sono arrivate ${arrivate} polizze prova`,
    testo: `Il portale federale ne conta ${adesso} da usare.`,
    url: '/admin/polizze',
    tag: 'polizze-arrivate',
  });
}

/*
 * Le letture automatiche: dopo pranzo e la sera, in orario d'ufficio della
 * segreteria federale e prima che chiuda la giornata. Ora di Roma.
 */
const LETTURE = ['14:00', '19:00'];

// Se il portale non risponde la lettura resta da fare e si riprova, ma non a
// ogni giro dei lavori (ogni cinque minuti): al massimo ogni mezz'ora.
const RIPROVA_MS = 30 * 60 * 1000;
let ultimoTentativo = 0;

/** L'ora di Roma adesso, come «AAAA-MM-GG» e «HH:MM». */
function oraDiRoma(adesso = new Date()) {
  const parti = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(adesso)
      .map((p) => [p.type, p.value]),
  );
  return { giorno: `${parti.year}-${parti.month}-${parti.day}`, ora: `${parti.hour}:${parti.minute}` };
}

/**
 * La lettura delle 14 e delle 19: la chiamano i lavori automatici ogni pochi
 * minuti, e legge solo se l'ultima lettura (qualunque, anche a mano) è
 * precedente all'orario passato più recente di oggi. Senza credenziali del
 * portale non fa niente.
 */
export async function leggiPolizzeProgrammata(adesso = new Date()): Promise<{
  letta: boolean;
  residue?: number | null;
}> {
  const { giorno, ora } = oraDiRoma(adesso);
  const passati = LETTURE.filter((o) => o <= ora);
  if (passati.length === 0) return { letta: false };
  const ultima = passati[passati.length - 1];

  const cred = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  if (!cred) return { letta: false };

  // già letta dopo quell'orario di oggi: niente da fare
  if (cred.polizzeLetteIl) {
    const l = oraDiRoma(cred.polizzeLetteIl);
    if (l.giorno === giorno && l.ora >= ultima) return { letta: false };
  }
  if (adesso.getTime() - ultimoTentativo < RIPROVA_MS) return { letta: false };
  ultimoTentativo = adesso.getTime();
  const residue = await sincronizzaGiacenza(cred);
  // null: il portale non ha risposto, la lettura resta da fare
  return { letta: residue !== null, residue };
}
