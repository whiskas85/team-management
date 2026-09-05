/**
 * Adempimenti GDPR minimi per un'associazione sportiva:
 * consenso tracciato con data e versione, diritto di accesso (esportazione)
 * e diritto alla cancellazione.
 */

export const VERSIONE_PRIVACY = '2026-09-01';

export const TITOLARE = 'Zero Dark Team';

/** Basi giuridiche dichiarate all'operatore, in chiaro. */
export const FINALITA = [
  {
    titolo: 'Gestione del tesseramento',
    testo:
      'Anagrafica, certificato medico e tessera federale sono trattati per eseguire il rapporto associativo e assolvere agli obblighi assicurativi e federali. Il conferimento è necessario: senza questi dati non è possibile tesserarsi.',
    base: 'Esecuzione del contratto associativo e obblighi di legge',
    obbligatorio: true,
  },
  {
    titolo: 'Dati sanitari (certificato medico)',
    testo:
      'Il certificato di idoneità è una categoria particolare di dati. Viene conservato in area riservata, consultabile solo da chi si occupa dell’amministrazione, e cancellato quando decade l’obbligo di conservazione.',
    base: 'Obbligo di legge in materia di tutela sanitaria dell’attività sportiva',
    obbligatorio: true,
  },
  {
    titolo: 'Immagini e riprese',
    testo:
      'Foto e video delle attività possono essere pubblicati sui canali del team. Questo consenso è facoltativo e revocabile in ogni momento dalla tua pagina personale.',
    base: 'Consenso',
    obbligatorio: false,
  },
  {
    titolo: 'Comunicazioni non operative',
    testo:
      'Inviti a eventi esterni, iniziative e comunicazioni non strettamente legate all’attività. Facoltativo e revocabile.',
    base: 'Consenso',
    obbligatorio: false,
  },
];

export const CONSERVAZIONE =
  'I dati anagrafici sono conservati per la durata del rapporto associativo e per i dieci anni successivi, come richiesto dalla normativa fiscale. I certificati medici sono cancellati entro un anno dalla scadenza. Le immagini restano finché non revochi il consenso.';

export const DIRITTI =
  'Puoi chiedere in ogni momento accesso, rettifica, cancellazione, limitazione e portabilità dei tuoi dati, e proporre reclamo al Garante per la protezione dei dati personali.';

/** Dati esportabili su richiesta dell'interessato (art. 15 e 20 GDPR). */
export type EsportazioneGdpr = Record<string, unknown>;
