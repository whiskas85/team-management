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

/**
 * Il benvenuto a chi arriva da un contatto: il primo messaggio che riceve dal
 * gestionale, da incollare in chat.
 *
 * Qui la password c'è, e apposta: è una persona nuova, magari davanti a chi
 * la sta creando, che deve poter entrare anche da un altro telefono o dopo che
 * il link è scaduto. Resta provvisoria — al primo accesso se ne sceglie una
 * sua — e il resto del messaggio le dice cosa trova e cosa fare, perché chi
 * entra la prima volta non sa dove guardare.
 */
export function componiMessaggioBenvenuto({
  nome,
  utente,
  password,
  link,
  indirizzo,
}: {
  nome: string;
  utente: string;
  password: string;
  link?: string;
  indirizzo?: string;
}): string {
  return [
    `Ciao ${nome}, benvenuto nello Zero Dark Team!`,
    'Ti abbiamo creato l’accesso al gestionale della squadra: è da lì che ti segni alle giocate, ricevi gli avvisi e trovi tutto quello che serve.',
    '',
    'COME ACCEDERE',
    link ? `Entra da qui (vale 7 giorni, una volta sola): ${link}` : null,
    indirizzo ? `Indirizzo: ${indirizzo}` : null,
    `Utente: ${utente}`,
    `Password provvisoria: ${password}`,
    'Al primo accesso scegli una password tua e completi i dati che ci mancano.',
    '',
    'PER COMINCIARE',
    '1. Installalo sul telefono: dal browser «Aggiungi a schermata Home», così lo apri come un’app.',
    '2. Attiva le notifiche quando te lo chiede: così sai subito delle nuove giocate e degli avvisi.',
    '3. Nel Calendario trovi le giocate: apri quella che ti interessa e premi «Ci sono».',
    '4. Nei tuoi pagamenti trovi le quote da saldare e come pagarle.',
    '',
    'Per qualsiasi dubbio scrivici pure. A presto in campo!',
  ]
    .filter((r) => r !== null)
    .join('\n');
}
