'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { CALLSIGN_PRESO, callsignOccupato } from '@/lib/callsign';
import { createSession, destroySession, hashPassword, verifyPassword } from '@/lib/auth';
import { VERSIONE_PRIVACY } from '@/lib/gdpr';
// la data si legge con l'aiuto di sempre e non con `new Date`: "2004-05-15"
// letta come mezzanotte UTC, a est di Greenwich, diventa il giorno prima
import { data } from '@/lib/form';

export type StatoForm = { errore?: string; ok?: string };

const testo = (fd: FormData, k: string) => (fd.get(k)?.toString() ?? '').trim();
const flag = (fd: FormData, k: string) => {
  const v = testo(fd, k);
  return v === 'on' || v === 'true' || v === '1';
};

export async function accedi(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const identita = testo(fd, 'email').toLowerCase();
  const password = testo(fd, 'password');

  if (!identita || !password) {
    return { errore: 'Inserisci callsign, email o telefono, e la password.' };
  }

  // Si entra con quello che uno si ricorda: il callsign, l'email o il proprio
  // numero di telefono. Il confronto sul callsign ignora le maiuscole.
  let user = await prisma.user.findUnique({ where: { email: identita } });

  if (!user) {
    const perCallsign = await prisma.user.findMany({
      where: { callsign: { equals: identita, mode: 'insensitive' } },
      take: 2,
    });
    // due persone con lo stesso callsign renderebbero l'accesso una lotteria:
    // meglio dirlo e farsi dare l'email
    if (perCallsign.length > 1) {
      return { errore: 'Questo callsign appartiene a più operatori: entra con l’email.' };
    }
    user = perCallsign[0] ?? null;
  }

  // Il telefono si confronta a sole cifre: in rubrica lo stesso numero è
  // scritto in cinque modi — con il prefisso, con gli spazi, con il trattino —
  // e chi entra digita quello che ha in testa. Si guardano le ultime nove
  // cifre, così "+39 333 1234567" e "3331234567" sono la stessa persona.
  if (!user) {
    const cifre = identita.replace(/\D/g, '');
    if (cifre.length >= 8) {
      const coda = cifre.slice(-9);
      const perTelefono = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User"
        WHERE regexp_replace(COALESCE(telefono, ''), '[^0-9]', '', 'g') LIKE ${'%' + coda}
          AND telefono IS NOT NULL AND telefono <> ''
        LIMIT 2`;
      if (perTelefono.length > 1) {
        return { errore: 'Questo numero risulta a più operatori: entra con l’email.' };
      }
      if (perTelefono[0]) {
        user = await prisma.user.findUnique({ where: { id: perTelefono[0].id } });
      }
    }
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { errore: 'Credenziali non valide.' };
  }
  if (user.stato === 'DISABILITATO') {
    return { errore: 'Account disabilitato. Contatta l’amministrazione del team.' };
  }

  await prisma.user.update({ where: { id: user.id }, data: { ultimoAccesso: new Date() } });
  await createSession(user.id, flag(fd, 'ricordami'));
  redirect('/dashboard');
}

/**
 * Accesso rapido di sviluppo: entra come il primo account che ha il ruolo
 * richiesto. Attivo solo con DEBUG_LOGIN=1, così in produzione sparisce.
 */
export async function accessoDebug(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  if (process.env.DEBUG_LOGIN !== '1') return { errore: 'Accesso rapido disattivato.' };

  const email = testo(fd, 'email');
  // L'admin di prova non c'è sempre: nel test sul server l'admin di partenza
  // ha un'altra email, e dopo una copia dei dati veri ci sono solo gli admin
  // veri. Allora si entra come il primo amministratore che c'è.
  const user =
    (await prisma.user.findUnique({ where: { email } })) ??
    (email === 'admin@zerodark.team'
      ? await prisma.user.findFirst({
          where: { roles: { has: 'ADMIN' } },
          orderBy: { createdAt: 'asc' },
        })
      : null);
  if (!user) return { errore: `Account di prova ${email} non trovato.` };

  await createSession(user.id, false);
  redirect('/dashboard');
}

export async function registrati(_prev: StatoForm, fd: FormData): Promise<StatoForm> {
  const nome = testo(fd, 'nome');
  const cognome = testo(fd, 'cognome');
  const email = testo(fd, 'email').toLowerCase();
  const callsign = testo(fd, 'callsign');
  const telefono = testo(fd, 'telefono');
  const luogoNascita = testo(fd, 'luogoNascita');
  const dataNascita = data(fd, 'dataNascita');
  const password = testo(fd, 'password');
  const conferma = testo(fd, 'conferma');

  if (!nome || !cognome || !email || !password) {
    return { errore: 'Nome, cognome, email e password sono obbligatori.' };
  }

  // Gli stessi dati che si chiedono a chi viene inserito a mano, e per lo
  // stesso motivo: servono per tesseramento e polizza, e recuperarli mesi dopo
  // vuol dire rincorrere qualcuno che intanto ha smesso di rispondere. Sono
  // quattro righe in più adesso, contro una rincorsa poi.
  if (!telefono) return { errore: 'Il telefono è obbligatorio.' };
  if (!dataNascita) return { errore: 'La data di nascita è obbligatoria.' };
  if (!luogoNascita) return { errore: 'Il luogo di nascita è obbligatorio.' };
  if (dataNascita > new Date()) return { errore: 'La data di nascita è nel futuro.' };

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { errore: 'Email non valida.' };
  if (password.length < 8) return { errore: 'La password deve avere almeno 8 caratteri.' };
  if (password !== conferma) return { errore: 'Le due password non coincidono.' };
  if (!flag(fd, 'privacy')) {
    return { errore: 'Per creare l’account devi accettare l’informativa privacy.' };
  }

  const esistente = await prisma.user.findUnique({ where: { email } });
  if (esistente) return { errore: 'Esiste già un account con questa email.' };

  // il callsign serve anche per entrare: due uguali e l'accesso diventa ambiguo
  if (callsign) {
    const preso = await callsignOccupato(callsign);
    if (preso) return { errore: CALLSIGN_PRESO(callsign, preso) };
  }

  const adesso = new Date();
  const consensoImmagini = flag(fd, 'immagini');

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      nome,
      cognome,
      callsign: callsign || null,
      telefono,
      dataNascita,
      luogoNascita,
      roles: [], // nessun incarico: è un contatto, non un atleta
      // In attesa del via libera: fino ad allora vede una pagina sola. Chi
      // arriva dal sito non l'ha ancora visto in faccia nessuno, e il
      // calendario della squadra dice dove siamo e quando.
      stato: 'REGISTRATO',
      privacyAccettataIl: adesso,
      privacyVersione: VERSIONE_PRIVACY,
      consensoImmagini,
      consensoImmaginiIl: consensoImmagini ? adesso : null,
      ultimoAccesso: adesso,
    },
  });

  // Chi può decidere lo sa subito, anche col gestionale chiuso. Il messaggio
  // non dice chi è: una notifica si legge sullo schermo bloccato, e lì può
  // leggerla chiunque abbia in mano il telefono.
  const { avvisa, chiSegueINuovi } = await import('@/lib/push');
  void chiSegueINuovi()
    .then((chi) =>
      avvisa(chi, {
        titolo: 'Una richiesta di accesso',
        testo: 'Qualcuno ha chiesto di entrare: la trovi in Nuovi.',
        url: '/admin/nuovi',
        tag: 'registrazioni',
      }),
    )
    .catch(() => {
      /* un avviso mancato non deve far fallire una registrazione riuscita */
    });

  await createSession(user.id, flag(fd, 'ricordami'));
  redirect('/in-attesa');
}

/**
 * Il pulsante del link di accesso.
 *
 * È un'azione e non una semplice apertura di pagina per due ragioni che vanno
 * insieme: le azioni possono scrivere il cookie di sessione (le pagine no), e
 * soprattutto **nessun robot preme un pulsante**. L'anteprima che WhatsApp
 * costruisce aprendo il link non arriva fin qui, e il gettone resta buono per
 * la persona a cui è stato mandato.
 *
 * L'ordine conta: prima la sessione, poi si spegne il gettone. Se qualcosa va
 * storto nel mezzo, il link resta valido e si può riprovare.
 */
export async function entraConGettone(fd: FormData): Promise<void> {
  const { verificaGettone, bruciaGettone } = await import('@/lib/gettoni');

  const esito = await verificaGettone(testo(fd, 'gettone'));
  if (!esito.ok) redirect(`/login?accesso=${esito.motivo}`);

  // Chi è già collegato come qualcun altro non entra al posto suo, e
  // soprattutto non gli brucia il link: la pagina lo dice già, ma il pulsante
  // può essere premuto da una scheda aperta prima dell'accesso.
  const { getCurrentUser } = await import('@/lib/auth');
  const chiSta = await getCurrentUser();
  if (chiSta && chiSta.id !== esito.userId) redirect('/dashboard');

  // chi entra così deve comunque scegliersi una password: il link consegna le
  // chiavi, non tiene il posto di una password
  await prisma.user.update({
    where: { id: esito.userId },
    data: { deveCambiarePassword: true, ultimoAccesso: new Date() },
  });
  await createSession(esito.userId, false);
  await bruciaGettone(esito.gettoneId);

  redirect('/cambia-password');
}

export async function esci() {
  await destroySession();
  redirect('/login');
}
