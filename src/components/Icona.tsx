export type NomeIcona =
  // navigazione
  | 'dashboard'
  | 'calendario'
  | 'campi'
  | 'naviga'
  | 'stellaVita'
  | 'profilo'
  | 'certificato'
  | 'pagamenti'
  | 'operatori'
  | 'nuovi'
  | 'tessera'
  | 'iscrizioni'
  | 'grafici'
  | 'menu'
  | 'esci'
  | 'chiudi'
  // azioni
  | 'invita'
  | 'elimina'
  | 'rilascia'
  | 'squadra'
  | 'tutti'
  | 'concludi'
  | 'annulla'
  | 'bozza'
  | 'riapri'
  | 'incassa'
  | 'approva'
  | 'rifiuta'
  | 'carica'
  | 'scarica'
  | 'salva'
  | 'aggiungi'
  | 'modifica'
  | 'apri'
  | 'cerca'
  | 'chiave'
  | 'freccia'
  | 'appello'
  | 'presente'
  | 'forse'
  | 'assente'
  | 'titolare'
  | 'riserva'
  | 'telefono'
  | 'whatsapp'
  | 'email';

const PATHS: Record<NomeIcona, string> = {
  // ---------------------------------------------------------------- navigazione
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6V11h-6v9Zm0-16v5h6V4h-6Z',
  calendario:
    'M7 3v2M17 3v2M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  campi: 'M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11Zm0-8.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z',
  naviga: 'M21 3 3 10.5l7.5 3L14 21l7-18Z',
  // Stella della vita: il simbolo standard del soccorso. Solo la stella, senza
  // scritte, perché a 18 pixel qualsiasi testo sarebbe illeggibile.
  stellaVita:
    'M12 2.4 10 8.54 3.69 7.2 8 12l-4.31 4.8L10 15.46 12 21.6l2-6.14 6.31 1.34L16 12l4.31-4.8L14 8.54Z',
  profilo: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0',
  certificato:
    'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6M9 17h4',
  pagamenti: 'M3 7h18v12H3zM3 11h18M7 15h3',
  operatori:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-2-4.5',
  nuovi: 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9a7 7 0 0 1 14 0M18 8v6M15 11h6',
  tessera: 'M3 6h18v12H3zM7 14h5M7 10.5h3M16 10h2v3h-2z',
  iscrizioni: 'M5 4h9l5 5v11H5zM14 4v5h5M8 13h8M8 17h5',
  grafici: 'M4 20V4M4 20h16M8 17V10M13 17V6M18 17v-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  esci: 'M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h9',
  chiudi: 'M6 6l12 12M18 6L6 18',

  // ---------------------------------------------------------------- azioni
  invita: 'M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9a7 7 0 0 1 14 0M18 8v6M15 11h6',
  elimina: 'M4 7h16M10 11v6M14 11v6M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13M9 7V4h6v3',
  rilascia: 'M21 3 10.5 13.5M21 3l-6.5 18-4-8.5L2 8.5 21 3Z',
  squadra:
    'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M18 20a6 6 0 0 0-2-4.5',
  tutti: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18',
  concludi: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 4.5-5',
  annulla: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.9 5.9l12.2 12.2',
  bozza: 'M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4',
  riapri: 'M3.5 12a8.5 8.5 0 1 0 2.8-6.3M3 4v5h5',
  incassa: 'M17 6.8A6.5 6.5 0 0 0 7.6 12 6.5 6.5 0 0 0 17 17.2M4 10.5h8M4 13.5h8',
  approva: 'M4 12.5l5 5L20 6.5',
  rifiuta: 'M6 6l12 12M18 6L6 18',
  carica: 'M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  scarica: 'M12 4v12M8 12l4 4 4-4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  salva: 'M5 4h11l3 3v13H5zM8 4v5h7M8 13h8v7H8z',
  aggiungi: 'M12 5v14M5 12h14',
  modifica: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z',
  apri: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  cerca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM16.5 16.5 21 21',
  chiave: 'M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM10.5 11.5 4 18v2h2l1-1h2v-2h2l1.5-1.5',
  freccia: 'M5 12h14M13 6l6 6-6 6',
  telefono:
    'M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.7 1.5C11.6 18.3 5.7 12.4 5 4.2A1.5 1.5 0 0 1 6.5 3.5Z',
  whatsapp:
    'M12 3a9 9 0 0 0-7.7 13.7L3 21l4.4-1.2A9 9 0 1 0 12 3ZM9.4 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.6 1.5c.1.2.1.4 0 .6l-.4.5c-.2.2-.3.4-.1.7a6 6 0 0 0 2.6 2.3c.3.1.5.1.7-.1l.5-.6c.2-.2.3-.2.6-.1l1.5.7c.3.2.4.3.4.6 0 .6-.4 1.4-1.4 1.6-1 .2-2.2-.2-3.9-1.4a9 9 0 0 1-2.8-3.4c-.4-1-.4-1.9 0-2.5Z',
  email: 'M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1ZM3.6 7l8.4 6 8.4-6',
  presente: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM8.5 12.5l2.5 2.5 4.5-5',
  forse:
    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.7 9.5a2.4 2.4 0 1 1 3.2 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01',
  assente: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6',
  titolare: 'M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8L12 3Z',
  riserva: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2',
  appello: 'M9 5h6a1 1 0 0 1 1 1v1H8V6a1 1 0 0 1 1-1ZM8 7H6a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-2M9 13l2 2 4-4',
};

export function Icona({ nome, size = 20 }: { nome: NomeIcona; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={PATHS[nome]} />
    </svg>
  );
}
