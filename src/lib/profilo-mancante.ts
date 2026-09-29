import { prisma } from './db';

/**
 * I dati che servono di un nuovo e che ancora non ci sono.
 *
 * Chi arriva da un contatto viene creato con quello che si sa — spesso nome,
 * email e telefono — e il resto glielo chiede il gestionale al primo accesso:
 * cognome, telefono, data e luogo di nascita servono per tesseramento e
 * polizza della prima giornata. Vale per i nuovi: chi è in squadra ha già
 * passato il modulo d'iscrizione, e fermarlo qui non avrebbe senso.
 */
export async function datiMancanti(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      stato: true,
      cognome: true,
      telefono: true,
      dataNascita: true,
      luogoNascita: true,
    },
  });
  if (!u || u.stato !== 'NUOVO') return null;
  const mancano = {
    cognome: !u.cognome.trim(),
    telefono: !u.telefono,
    dataNascita: !u.dataNascita,
    luogoNascita: !u.luogoNascita,
  };
  return Object.values(mancano).some(Boolean) ? mancano : null;
}
