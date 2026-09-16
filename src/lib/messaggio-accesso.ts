/**
 * Il messaggio con cui si consegnano le chiavi di casa.
 *
 * Sta qui, in un posto solo, perché lo usano in due: il pulsante che lo copia
 * negli appunti e quello che lo spedisce dal ponte WhatsApp. Scritto due
 * volte, prima o poi le due versioni si sarebbero allontanate — e chi riceve
 * il messaggio non deve accorgersi da quale pulsante è passato.
 *
 * La password non c'è quando c'è il link: scritta in chat resterebbe lì per
 * sempre, mentre il link vale sette giorni e si spegne al primo uso.
 */
export function componiMessaggioAccesso({
  utente,
  password,
  link,
  indirizzo,
}: {
  utente: string;
  password: string;
  link?: string;
  indirizzo?: string;
}): string {
  const righe = link
    ? [
        'Accesso a Zero Dark Ops',
        `Il tuo utente: ${utente}`,
        '',
        'Entra da qui:',
        link,
        '',
        'Il link vale 7 giorni e si usa una volta sola: ti fa entrare e ti chiede di scegliere la tua password.',
      ]
    : [
        'Accesso a Zero Dark Ops',
        indirizzo ? `Indirizzo: ${indirizzo}` : null,
        `Il tuo utente: ${utente}`,
        `Password: ${password}`,
        'Al primo accesso ti verrà chiesto di sceglierne una tua.',
      ];

  return righe.filter((r) => r !== null).join('\n');
}
