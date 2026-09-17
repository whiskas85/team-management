/**
 * Come si chiama il file di un certificato quando esce dal gestionale.
 *
 * Quello che arriva è spesso `IMG_4471.jpg` o `scansione.pdf`: dentro una
 * cartella di scaricati, o dentro uno zip di venti, non dice niente. Qui si
 * ricostruisce un nome che si legge — cognome, nome, scadenza — perché chi
 * scarica questi file poi deve ritrovarli, magari fra sei mesi, magari per
 * mandarli alla federazione.
 */

const pulisci = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export function nomeFileCertificato(cert: {
  fileName: string;
  scadeIl: Date | null;
  user: { nome: string; cognome: string };
}): string {
  const estensione = cert.fileName.includes('.')
    ? cert.fileName.slice(cert.fileName.lastIndexOf('.') + 1).toLowerCase()
    : 'pdf';

  const scadenza = cert.scadeIl ? cert.scadeIl.toISOString().slice(0, 10) : 'senza-scadenza';

  return `${pulisci(cert.user.cognome)}-${pulisci(cert.user.nome)}-certificato-scade-${scadenza}.${estensione}`;
}
