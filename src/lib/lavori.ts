import { prisma } from './db';
import { conIdentita } from './identita';
import { attivitaDaCoprire, dataLocale } from './assicurazione';
import { attivaGiornaliera } from '@/actions/assicurazione';
import type { SessionUser } from './auth';

/**
 * Il lavoro che si sveglia da solo.
 *
 * Il gestionale, per tutto il resto, fa qualcosa perché qualcuno ha premuto un
 * pulsante. Qui no: un `cron` sulla macchina chiama `/api/lavori` ogni pochi
 * minuti, e questa funzione guarda se c'è qualcosa da fare **adesso**.
 *
 * Serve per un caso solo, ed è quello per cui è nata: la domenica mattina.
 * Alle otto si è in viaggio, il gestionale non lo apre nessuno, e chi non è
 * stato coperto il giovedì arriva in campo scoperto. Un'ora prima è il momento
 * in cui non c'è più nessuno a rimediare.
 */

export type EsitoLavori = {
  spento?: true;
  /** Quante polizze sono state attivate davvero. */
  fatte: number;
  /** Quante sono state tentate e rifiutate, col perché. */
  rifiutate: { chi: string; perche: string }[];
  /** Quante persone erano da coprire ma non lo erano ancora: quota, dati. */
  inAttesa: number;
};

/**
 * Non più di queste per giro.
 *
 * Non è una regola di dominio, è un freno: se un difetto qui dentro provasse
 * ad assicurare in cerchio, il costo lo pagherebbe il club in polizze vere. Un
 * tetto basso lo fa fermare dopo poche, e la prossima sveglia riprende da dove
 * era arrivato.
 */
const MAX_PER_GIRO = 20;

/** Chi firma le polizze che partono da sole. */
async function chiFirma(id: string | null): Promise<SessionUser | null> {
  const utente = await prisma.user.findFirst({
    where: {
      ...(id ? { id } : {}),
      stato: { notIn: ['DISABILITATO', 'RIFIUTATO', 'REGISTRATO'] },
      roles: { hasSome: ['ADMIN', 'AMMINISTRAZIONE'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      nome: true,
      cognome: true,
      callsign: true,
      deveCambiarePassword: true,
      roles: true,
      stato: true,
      ultimaAttivita: true,
    },
  });
  // chi l'aveva accesa può essere uscito dalla squadra: in quel caso firma il
  // primo che amministra, invece di smettere di assicurare senza dirlo
  if (!utente && id) return chiFirma(null);
  return utente;
}

/**
 * Copre chi sta per giocare e non è ancora coperto.
 *
 * **Le regole non le decide questa funzione.** Chiama la stessa azione del
 * pulsante «Assicura», per conto di chi ha acceso l'automatismo: ha detto «ci
 * sono», la quota è saldata o dichiarata, i dati anagrafici ci sono, non è già
 * coperto, ha almeno dodici anni. Se un domani una di quelle regole cambia,
 * cambia in un posto solo e vale anche qui — che è tutto il punto di passare
 * di lì invece di riscriverla.
 */
export async function assicuraInAnticipo(): Promise<EsitoLavori> {
  const conf = await prisma.impostazioni.findUnique({ where: { id: 'app' } });
  if (!conf?.assicuraAuto) return { spento: true, fatte: 0, rifiutate: [], inAttesa: 0 };

  const firma = await chiFirma(conf.assicuraAutoDaId);
  if (!firma) return { fatte: 0, rifiutate: [{ chi: '—', perche: 'nessun admin a cui intestarle' }], inAttesa: 0 };

  const adesso = new Date();
  const finestra = new Date(adesso.getTime() + conf.assicuraAnticipoMin * 60_000);
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);

  const esito: EsitoLavori = { fatte: 0, rifiutate: [], inAttesa: 0 };

  for (const attivita of await attivitaDaCoprire()) {
    // Quelle che cominciano più in là del preavviso si guardano al prossimo
    // giro: è presto, e chi deve ancora pagare ha tempo per farlo.
    if (attivita.quando > finestra) continue;

    for (const nuovo of attivita.nuovi) {
      if (!nuovo.copribile || !nuovo.datiCompleti) {
        // non è un rifiuto: è uno che il gestionale non può coprire ancora,
        // e lo dice già la pagina delle polizze in rosso
        esito.inAttesa += 1;
        continue;
      }

      for (const g of nuovo.giorni) {
        if (!g.serve || g.copertura === 'ASSICURATO') continue;
        // un giorno già passato non si copre: la polizza vale fino alle 24:00
        // del suo giorno, e comprarla dopo è buttarla
        // mezzanotte di qui contro mezzanotte di qui: la chiave del giorno
        // letta in UTC starebbe un fuso più in là e sposterebbe il confronto
        const quandoVale = dataLocale(g.giorno);
        if (quandoVale < oggi) continue;

        if (esito.fatte >= MAX_PER_GIRO) return esito;

        const dati = new FormData();
        dati.set('userId', nuovo.id);
        dati.set('eventId', attivita.id);
        dati.set('giorno', g.giorno);

        const risposta = await conIdentita(firma, () => attivaGiornaliera({}, dati));
        if (risposta.ok) esito.fatte += 1;
        else if (risposta.errore) {
          esito.rifiutate.push({ chi: `${nuovo.nome} · ${attivita.titolo}`, perche: risposta.errore });
        }
      }
    }
  }

  return esito;
}
