import { readFile } from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@zerodark.team';
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'ZeroDark2026!';
const DEBUG = process.env.DEBUG_LOGIN === '1';

/** Account di prova, uno per figura: alimentano i pulsanti di accesso rapido. */
const FIGURE = [
  {
    email: 'amministrazione@zerodark.team',
    telefono: '3401110001',
    nome: 'Anna',
    cognome: 'Amministrazione',
    callsign: 'Papyrus',
    roles: ['AMMINISTRAZIONE', 'ATLETA'],
    stato: 'SQUADRA',
  },
  {
    email: 'segreteria@zerodark.team',
    telefono: '3401110002',
    nome: 'Sara',
    cognome: 'Segreteria',
    callsign: 'Cash',
    roles: ['SEGRETERIA'],
    stato: 'SQUADRA',
  },
  {
    email: 'tl@zerodark.team',
    telefono: '3401110003',
    nome: 'Luca',
    cognome: 'Leader',
    callsign: 'Wolf',
    roles: ['TL', 'ATLETA'],
    stato: 'SQUADRA',
  },
  {
    email: 'atleta@zerodark.team',
    telefono: '3401110004',
    nome: 'Marco',
    cognome: 'Atleta',
    callsign: 'Vipera',
    roles: ['ATLETA'],
    stato: 'SQUADRA',
  },
  {
    email: 'nuovo@zerodark.team',
    telefono: '3401110005',
    nome: 'Nico',
    cognome: 'Nuovo',
    callsign: null,
    roles: [],
    stato: 'NUOVO',
  },
];

async function creaSeNonEsiste(dati) {
  const esistente = await prisma.user.findUnique({ where: { email: dati.email } });
  if (esistente) return false;

  await prisma.user.create({
    data: {
      ...dati,
      passwordHash: await bcrypt.hash(PASSWORD, 10),
      privacyAccettataIl: new Date(),
      privacyVersione: '2026-09-01',
    },
  });
  return true;
}


/**
 * Porta nel database lo statuto e il regolamento che stavano nei file.
 *
 * Una migrazione SQL il volume non lo può leggere, quindi il travaso si fa
 * qui, una volta sola: se un documento con quello slug esiste già non si tocca
 * niente. I file restano dove sono — se qualcosa andasse storto il testo è
 * ancora lì, e non si è perso nulla.
 */
async function importaDocumenti() {
  const cartella = process.env.UPLOAD_DIR || 'uploads';

  const daPortare = [
    {
      slug: 'statuto',
      tipo: 'STATUTO',
      titolo: 'Statuto',
      sottotitolo: 'Le regole con cui il team esiste: scopo, soci, organi, quote',
      file: 'documenti/statuto.md',
    },
    {
      slug: 'regolamento',
      tipo: 'REGOLAMENTO',
      titolo: 'Regolamento',
      sottotitolo: 'Come ci si comporta in campo e fuori: sicurezza, condotta, sanzioni',
      file: 'documenti/regolamento.md',
    },
  ];

  for (const d of daPortare) {
    if (await prisma.documento.findUnique({ where: { slug: d.slug } })) continue;

    const testo = await readFile(path.join(cartella, d.file), 'utf8').catch(() => null);

    // lo statuto si crea comunque, anche vuoto: è la pagina che chi ha i
    // permessi va ad aprire per scriverlo. Un regolamento che non c'è invece
    // non si inventa: l'elenco resta vuoto finché qualcuno non ne scrive uno
    if (testo === null && d.tipo !== 'STATUTO') continue;

    await prisma.documento.create({
      data: {
        slug: d.slug,
        tipo: d.tipo,
        titolo: d.titolo,
        sottotitolo: d.sottotitolo,
        testo: testo ?? '',
      },
    });
    console.log(`[seed] documento "${d.slug}" ${testo === null ? 'creato vuoto' : 'importato dal file'}`);
  }
}

async function main() {
  // L'admin di partenza serve a una cosa sola: non restare chiusi fuori da
  // un'installazione nuova. Quindi si crea quando di amministratori non ce n'è
  // nessuno, non quando manca quella certa email: un account cancellato apposta
  // non deve ricomparire a ogni riavvio.
  const veri = await prisma.user.count({
    where: { roles: { has: 'ADMIN' }, creatoDalSeed: false },
  });

  if (veri > 0) {
    // c'è un amministratore vero: quello di partenza ha finito il suo lavoro e
    // se ne va, altrimenti resterebbe lì per sempre con la password di default
    const iniziali = await prisma.user.deleteMany({
      where: { creatoDalSeed: true, roles: { has: 'ADMIN' } },
    });
    console.log(
      iniziali.count > 0
        ? `[seed] ${veri} amministratori veri: rimosso l'admin di partenza`
        : `[seed] ${veri} amministratori, non tocco niente`,
    );
  } else if (await creaSeNonEsiste({
    email: EMAIL,
    nome: 'Admin',
    cognome: 'Zero Dark',
    callsign: 'Zero',
    telefono: '3401110000',
    roles: ['ADMIN', 'ATLETA'],
    stato: 'SQUADRA',
    creatoDalSeed: true,
  })) {
    console.log(`[seed] nessun amministratore: creato ${EMAIL}`);
  } else {
    console.log(`[seed] in attesa del primo amministratore vero: resta ${EMAIL}`);
  }

  if (DEBUG) {
    let n = 0;
    for (const f of FIGURE) if (await creaSeNonEsiste(f)) n++;
    if (n > 0) console.log(`[seed] creati ${n} account di prova (password: ${PASSWORD})`);
  }

  // tipologie di partenza: sono dati di base, l'admin poi le modifica
  if ((await prisma.tipoAttivita.count()) === 0) {
    await prisma.tipoAttivita.createMany({
      data: [
        { nome: 'Partita', colore: 'verde', tipoQuota: 'EVENTO', riserve: false, ordine: 1 },
        { nome: 'Torneo', colore: 'rosso', tipoQuota: 'TORNEO', riserve: true, ordine: 2 },
        { nome: 'Gara', colore: 'ambra', tipoQuota: 'GARA', riserve: true, ordine: 3 },
        {
          nome: 'Allenamento',
          colore: 'azzurro',
          tipoQuota: 'ALLENAMENTO',
          riserve: false,
          ordine: 4,
        },
        { nome: 'Riunione', colore: 'grigio', tipoQuota: 'ALTRO', riserve: false, ordine: 5 },
      ],
    });
    console.log('[seed] create 5 tipologie di attività');
  }

  // metodi di incasso di partenza
  if ((await prisma.metodoPagamento.count()) === 0) {
    await prisma.metodoPagamento.createMany({
      data: [
        { nome: 'Contanti', ordine: 1, descrizione: 'Consegnati a mano al referente' },
        {
          nome: 'Bonifico',
          ordine: 2,
          selfService: true,
          istruzioni: 'IBAN da inserire nei dati di base',
        },
        { nome: 'Satispay', ordine: 3, selfService: true },
        { nome: 'PayPal', ordine: 4, selfService: true },
        { nome: 'Altro', ordine: 9 },
      ],
    });
    console.log('[seed] creati 5 metodi di pagamento');
  }

  const quanti = await prisma.field.count();
  if (quanti === 0) {
    await prisma.field.createMany({
      data: [
        {
          nome: 'Area Boschiva Nord',
          tipo: 'BOSCHIVO',
          citta: 'Bergamo',
          provincia: 'BG',
          note: 'Campo di riferimento per le partite domenicali.',
        },
        {
          nome: 'Capannone CQB',
          tipo: 'CQB',
          citta: 'Brescia',
          provincia: 'BS',
          note: 'Struttura al coperto, ideale per gli allenamenti invernali.',
        },
      ],
    });
    console.log('[seed] creati 2 campi di esempio');
  }

  await importaDocumenti();
}

main()
  .catch((e) => {
    console.error('[seed] errore:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
