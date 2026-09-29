/*
 * Prova del collegamento fra due gestionali: test (Zero Dark) e test2 (Lupi
 * Grigi, la squadra finta). Lo lancia l'automazione Rilascio, modo
 * «prova-collegamento», da GitHub: da lì i due ambienti si raggiungono.
 *
 * Fa quello che farebbe un admin (docs/COLLEGAMENTO-SQUADRE.md): su test crea
 * un link, su test2 lo apre e manda la richiesta, su test la accetta, e poi
 * controlla che tutte e due le parti si vedano collegate.
 *
 * Il log dell'automazione è pubblico: qui si scrive solo com'è andato ogni
 * passaggio, mai il contenuto delle pagine. Le password del proxy arrivano
 * dall'ambiente, e l'automazione le ha già mascherate.
 */
import { chromium } from 'playwright';

const A = process.env.INDIRIZZO_A ?? 'https://test.zerodarkteam.it';
const B = process.env.INDIRIZZO_B ?? 'https://test2.zerodarkteam.it';
const PW_A = process.env.PROXY_A;
const PW_B = process.env.PROXY_B;
if (!PW_A || !PW_B) {
  console.error('Mancano le password del proxy (PROXY_A, PROXY_B).');
  process.exit(1);
}

let falliti = 0;
async function passo(nome, fn) {
  try {
    const nota = await fn();
    console.log(`✓ ${nome}${nota ? ` — ${nota}` : ''}`);
    return true;
  } catch (e) {
    falliti++;
    console.log(`✗ ${nome} — ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function identita(base) {
  const r = await fetch(`${base}/api/federazione/identita`);
  if (!r.ok) throw new Error(`risponde ${r.status}`);
  const d = await r.json();
  return { indirizzo: d.indirizzo, nome: d.profilo?.nome };
}

/** Entra come admin con l'accesso rapido, e passa i consensi se li chiede. */
async function entra(pg, base) {
  await pg.goto(`${base}/login`);
  await pg.click('button[value="admin@zerodark.team"]');
  await pg.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20_000 });
  for (let i = 0; i < 5 && new URL(pg.url()).pathname === '/consensi'; i++) {
    const bottoni = [
      'Ho letto e accetto l’informativa',
      'Ho letto statuto e regolamenti',
      'Sì, potete pubblicarle',
    ];
    for (const testo of bottoni) {
      const b = pg.getByRole('button', { name: testo });
      if (await b.count()) {
        await b.first().click();
        await pg.waitForTimeout(1500);
      }
    }
    await pg.goto(`${base}/dashboard`);
  }
  const dove = new URL(pg.url()).pathname;
  if (dove !== '/dashboard') throw new Error(`dopo l'accesso sono su ${dove}`);
}

/** Il testo della sezione con quel titolo, nella pagina Collegamenti. */
async function sezione(pg, titolo) {
  const s = pg.locator('section', { has: pg.locator('p.titolo-sezione', { hasText: titolo }) });
  return (await s.count()) ? await s.first().innerText() : '';
}

const errorePagina = async (pg) =>
  (await pg.locator('.text-danger, [role=alert]').allInnerTexts()).join(' ').slice(0, 200);

const browser = await chromium.launch();
const pa = await (
  await browser.newContext({ httpCredentials: { username: 'zd', password: PW_A } })
).newPage();
const pb = await (
  await browser.newContext({ httpCredentials: { username: 'zd', password: PW_B } })
).newPage();

let io = {};
let loro = {};
await passo('test risponde come gestionale', async () => {
  io = await identita(A);
  return `${io.nome} · ${io.indirizzo}`;
});
await passo('test2 risponde come gestionale', async () => {
  loro = await identita(B);
  return `${loro.nome} · ${loro.indirizzo}`;
});
if (falliti) {
  await browser.close();
  process.exit(1);
}

await passo('accesso admin su test', () => entra(pa, A));
await passo('accesso admin su test2', () => entra(pb, B));

await pa.goto(`${A}/admin/collegamenti`);
const giaCollegati = (await sezione(pa, 'Squadre collegate')).includes(loro.nome);

if (giaCollegati) {
  console.log(`= già collegati: ${io.nome} ↔ ${loro.nome}, salto la richiesta`);
} else {
  let link = '';
  await passo('test: nuovo link di collegamento', async () => {
    await pa.getByRole('button', { name: 'Nuovo link' }).click();
    await pa.waitForTimeout(2500);
    await pa.reload();
    const testi = await pa.locator('p.break-all').allInnerTexts();
    link = testi.find((t) => t.includes('/collega/')) ?? '';
    if (!link) throw new Error('il link non compare');
    return 'creato';
  });

  await passo('test2: pagina pubblica del link', async () => {
    await pb.goto(link);
    if (!(await pb.getByText('Collegamento fra gestionali').count())) {
      throw new Error('la pagina del link non si apre');
    }
  });

  await passo('test2: manda la richiesta', async () => {
    await pb.goto(`${B}/admin/collegamenti/nuovo?link=${encodeURIComponent(link)}`);
    await pb.getByRole('button', { name: /Manda (di nuovo )?la richiesta/ }).click();
    await pb.waitForURL(/inviata=1/, { timeout: 30_000 }).catch(() => null);
    if (!pb.url().includes('inviata=1')) throw new Error((await errorePagina(pb)) || 'nessuna risposta');
    return 'inviata';
  });

  await passo('test: la richiesta è arrivata e si accetta', async () => {
    await pa.goto(`${A}/admin/collegamenti`);
    const card = pa.locator('.card', { hasText: loro.nome }).filter({
      has: pa.getByRole('button', { name: 'Accetta il collegamento' }),
    });
    if (!(await card.count())) throw new Error('fra le richieste non c’è');
    await card.first().getByRole('button', { name: 'Accetta il collegamento' }).click();
    // com'è andata lo dice il passaggio dopo
    await pa.waitForTimeout(4000);
  });
}

await passo(`test vede ${loro.nome} fra le collegate`, async () => {
  await pa.goto(`${A}/admin/collegamenti`);
  if (!(await sezione(pa, 'Squadre collegate')).includes(loro.nome)) throw new Error('non c’è');
});

await passo(`test2 vede ${io.nome} fra le collegate`, async () => {
  // l'«accettata» parte subito; se il primo invio non riesce, la coda riprova
  for (let i = 0; i < 6; i++) {
    await pb.goto(`${B}/admin/collegamenti`);
    if ((await sezione(pb, 'Squadre collegate')).includes(io.nome)) return i ? `dopo ${i * 10}s` : '';
    await pb.waitForTimeout(10_000);
  }
  throw new Error('ancora in attesa di risposta');
});

await passo('test2: la squadra ha il logo di test', async () => {
  await pb.goto(`${B}/admin/squadre`);
  const riga = pb.locator('li, div', { hasText: io.nome }).locator('img[src*="/api/squadre/"]');
  if (!(await riga.count())) throw new Error('logo non arrivato');
});

await browser.close();
console.log(falliti ? `\n${falliti} passaggi non riusciti` : '\nTutto a posto.');
process.exit(falliti ? 1 : 0);
