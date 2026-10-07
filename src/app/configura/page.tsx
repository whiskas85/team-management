import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdmin, URL_ASNWG } from '@/lib/domain';
import { mancanze, qualcosaManca } from '@/lib/consensi';
import { leggiMiaSquadra, marchio, PARTENZA } from '@/lib/mia-squadra';
import { temaSquadra } from '@/lib/tema-server';
import { Logo } from '@/components/Logo';
import { Icona, type NomeIcona } from '@/components/Icona';
import { Campo } from '@/components/ui';
import { FormAzione } from '@/components/Form';
import { Invia } from '@/components/Bottone';
import { RitagliaFoto } from '@/components/RitagliaFoto';
import { SceltaTemaSquadra } from '@/components/SceltaTemaSquadra';
import { PortaleFigt } from '@/components/PortaleFigt';
import { AffiliazioniFigt } from '@/components/AffiliazioniFigt';
import { FormCampo } from '@/components/FormCampo';
import { salvaLogoSquadra } from '@/actions/mia-squadra';
import {
  concludiConfigurazione,
  passoCampo,
  passoSquadra,
  passoTema,
} from '@/actions/configura';

export const dynamic = 'force-dynamic';

/**
 * La prima configurazione, guidata: il primo a entrare in un gestionale
 * appena nato è l'admin, e davanti ha un nome di partenza, il logo di
 * partenza, nessun campo. Invece di lasciarlo a cercare le pagine giuste in
 * mezzo a trenta voci di menu, gliele si mette in fila: la squadra, il tema,
 * il portale federale, i campi. Gli ultimi due si saltano.
 *
 * Sta fuori dal gruppo (app) come il cambio password: è il layout di quel
 * gruppo a mandare qui, e da dentro rimanderebbe a se stessa. Tutto quello che
 * si sceglie qui si ritrova, e si cambia, in «La mia squadra» e in «Campi».
 */

const PASSI = [
  { id: 'benvenuto', titolo: 'Benvenuto', icona: 'dashboard' },
  { id: 'squadra', titolo: 'La squadra', icona: 'squadra' },
  { id: 'tema', titolo: 'Il tema', icona: 'impostazioni' },
  { id: 'figt', titolo: 'Portale FIGT', icona: 'tessera' },
  { id: 'campi', titolo: 'I campi', icona: 'campi' },
  { id: 'fine', titolo: 'Fatto', icona: 'concludi' },
] as const satisfies readonly { id: string; titolo: string; icona: NomeIcona }[];

type Passo = (typeof PASSI)[number]['id'];

export default async function ConfiguraPage({
  searchParams,
}: {
  searchParams: Promise<{ passo?: string }>;
}) {
  const me = await requireUser();
  if (me.deveCambiarePassword) redirect('/cambia-password');
  if (!isAdmin(me.roles)) redirect('/dashboard');
  if (qualcosaManca(await mancanze(me.id))) redirect('/consensi');

  const { passo: chiesto } = await searchParams;
  const indice = Math.max(
    0,
    PASSI.findIndex((p) => p.id === chiesto),
  );
  const passo: Passo = PASSI[indice].id;
  const dopo = PASSI[indice + 1]?.id;
  const prima = PASSI[indice - 1]?.id;

  const [s, m] = await Promise.all([leggiMiaSquadra(), marchio()]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={44} src={m.logoUrl} />
        <div className="min-w-0 flex-1">
          <p className="num text-[11px] uppercase tracking-[0.2em] text-nvg">
            Prima configurazione
          </p>
          <p className="truncate text-lg font-semibold">{m.nomeGestionale}</p>
        </div>
        {passo !== 'fine' && (
          <form action={concludiConfigurazione}>
            <button type="submit" className="btn-ghost btn-sm" title="Ritrovi tutto in «La mia squadra»">
              Lo finisco dopo
            </button>
          </form>
        )}
      </div>

      {/* dove si è e quanto manca: i passi già fatti si riaprono */}
      <ol className="mb-6 grid grid-cols-6 gap-1.5" aria-label="Passi">
        {PASSI.map((p, i) => (
          <li key={p.id} className="min-w-0">
            <Link
              href={`/configura?passo=${p.id}`}
              aria-current={i === indice ? 'step' : undefined}
              className="group block"
            >
              <span
                className={`block h-1.5 rounded-full ${
                  i < indice ? 'bg-nvg' : i === indice ? 'bg-nvg/70' : 'bg-surface2'
                }`}
              />
              <span
                className={`mt-1.5 hidden truncate text-[11px] sm:block ${
                  i === indice ? 'font-semibold text-ink' : 'text-muted group-hover:text-ink'
                }`}
              >
                {p.titolo}
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="card">
        {passo === 'benvenuto' && <Benvenuto nome={me.nome} squadra={m.nome} />}
        {passo === 'squadra' && <PassoSquadra s={s} m={m} />}
        {passo === 'tema' && <PassoTema logoUrl={m.logoUrl} />}
        {passo === 'figt' && <PassoFigt />}
        {passo === 'campi' && <PassoCampi />}
        {passo === 'fine' && <Fine />}

        {/* avanti e indietro: i passi che salvano hanno il loro pulsante,
            qui si va oltre senza cambiare niente */}
        {passo !== 'fine' && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
            {prima ? (
              <Link href={`/configura?passo=${prima}`} className="btn-ghost btn-sm">
                Indietro
              </Link>
            ) : (
              <span />
            )}
            {dopo && (
              <Link
                href={`/configura?passo=${dopo}`}
                className={passo === 'benvenuto' ? 'btn-primary' : 'btn-ghost btn-sm'}
              >
                {passo === 'benvenuto'
                  ? 'Cominciamo'
                  : passo === 'figt' || passo === 'campi'
                    ? 'Salta, lo faccio dopo'
                    : 'Avanti senza salvare'}
                <Icona nome="freccia" size={15} />
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function Titolo({ titolo, testo }: { titolo: string; testo: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{titolo}</h1>
      <p className="mt-1.5 text-sm text-muted">{testo}</p>
    </div>
  );
}

function Benvenuto({ nome, squadra }: { nome: string; squadra: string }) {
  const cosa: { icona: NomeIcona; titolo: string; testo: string }[] = [
    { icona: 'squadra', titolo: 'La squadra', testo: 'nome, logo, motto e recapiti' },
    { icona: 'impostazioni', titolo: 'Il tema', testo: 'i colori del gestionale, per tutti' },
    {
      icona: 'tessera',
      titolo: 'Portale FIGT',
      testo: 'per importare le tessere e fare le polizze giornaliere (si salta)',
    },
    { icona: 'campi', titolo: 'I campi', testo: 'dove giocate, con la posizione del parcheggio (si salta)' },
  ];
  return (
    <>
      <Titolo
        titolo={`Ciao ${nome}, il gestionale è tuo`}
        testo={`Prima che entrino gli altri, sistemiamo insieme quello che vedranno: bastano un paio di minuti. Ogni cosa la ritrovi poi in «La mia squadra» e la cambi quando vuoi.`}
      />
      <ul className="space-y-3">
        {cosa.map((c) => (
          <li key={c.titolo} className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-nvg/10 p-1.5 text-nvg">
              <Icona nome={c.icona} size={16} />
            </span>
            <span className="text-sm">
              <span className="font-medium">{c.titolo}</span>
              <span className="text-muted"> — {c.testo}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-muted">
        Per ora la squadra si chiama «{squadra}»: è il nome di partenza, lo cambi al prossimo passo.
      </p>
    </>
  );
}

function PassoSquadra({
  s,
  m,
}: {
  s: Awaited<ReturnType<typeof leggiMiaSquadra>>;
  m: Awaited<ReturnType<typeof marchio>>;
}) {
  return (
    <>
      <Titolo
        titolo="La squadra"
        testo="Il nome e il logo sono quelli dell’intestazione, dell’app installata sul telefono e del biglietto da visita per le squadre collegate."
      />
      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <FormAzione azione={passoSquadra}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome della squadra">
              <input name="nome" defaultValue={s?.nome ?? ''} placeholder={PARTENZA.nome} className="input" />
            </Campo>
            <Campo label="Nome del gestionale">
              <input
                name="nomeGestionale"
                defaultValue={s?.nomeGestionale ?? ''}
                placeholder={PARTENZA.nomeGestionale}
                className="input"
              />
            </Campo>
            <Campo label="Motto">
              <input name="motto" defaultValue={s?.motto ?? ''} placeholder={PARTENZA.motto} className="input" />
            </Campo>
            <Campo label="Sito">
              <input name="sito" type="url" defaultValue={s?.sito ?? ''} placeholder="https://" className="input" />
            </Campo>
            <Campo label="Città">
              <input name="citta" defaultValue={s?.citta ?? ''} className="input" />
            </Campo>
            <Campo label="Provincia">
              <input
                name="provincia"
                defaultValue={s?.provincia ?? ''}
                maxLength={2}
                className="input uppercase"
              />
            </Campo>
            <Campo label="Email della squadra">
              <input name="email" type="email" defaultValue={s?.email ?? ''} className="input" />
            </Campo>
            <Campo label="Telefono della squadra">
              <input name="telefono" defaultValue={s?.telefono ?? ''} className="input" />
            </Campo>
            <Campo label="Chi siamo" span>
              <textarea name="descrizione" defaultValue={s?.descrizione ?? ''} rows={3} className="input" />
            </Campo>
          </div>
          <p className="text-xs text-muted">Quello che lasci vuoto resta come in grigio.</p>
          <Invia icona="salva">Salva e vai avanti</Invia>
        </FormAzione>
        <div>
          <p className="label">Logo</p>
          <RitagliaFoto
            fotoAttuale={m.logoUrl}
            rimovibile={!!s?.logoPath}
            azione={salvaLogoSquadra}
            png
            cosa="logo"
          />
          <p className="mt-2 text-xs text-muted">
            Si salva da solo. Dai suoi colori, al prossimo passo, ti propongo il tema.
          </p>
        </div>
      </div>
    </>
  );
}

async function PassoTema({ logoUrl }: { logoUrl: string }) {
  return (
    <>
      <Titolo
        titolo="Il tema"
        testo="Il colore d’accento è uguale per tutti; il fondo è quello di partenza: notte o giorno poi lo sceglie ognuno per sé, dal chip col suo nome."
      />
      <SceltaTemaSquadra
        iniziale={await temaSquadra()}
        logoUrl={logoUrl}
        azione={passoTema}
        etichetta="Salva e vai avanti"
      />
    </>
  );
}

async function PassoFigt() {
  const figt = await prisma.credenzialeFigt.findUnique({ where: { id: 'figt' } });
  return (
    <>
      <Titolo
        titolo="Il portale federale FIGT"
        testo="Con l’accesso al portale ASNWG il gestionale importa le tessere dei tuoi e fa le polizze giornaliere per chi viene a provare. Bastano utenza e password: il codice dell’associazione e le affiliazioni li leggo io. Se non le hai sotto mano, salta: lo colleghi quando vuoi da «La mia squadra»."
      />
      {figt && (
        <p className="mb-4 rounded-md border border-nvg/40 bg-nvg/10 px-3 py-2 text-sm text-nvg">
          Collegato come <strong>{figt.login}</strong> · associazione {figt.idAnagrafica}
          {figt.idAffiliazione ? ` · affiliazione in corso ${figt.idAffiliazione}` : ''}.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <PortaleFigt collegamento={figt} />
        <a href={URL_ASNWG} target="_blank" rel="noreferrer" className="btn-ghost btn-sm">
          <Icona nome="apri" size={15} /> Apri il portale
        </a>
        {figt && (
          <Link href="/configura?passo=campi" className="btn-primary btn-sm">
            Avanti <Icona nome="freccia" size={15} />
          </Link>
        )}
      </div>
      {figt && <AffiliazioniFigt />}
    </>
  );
}

async function PassoCampi() {
  const campi = await prisma.field.findMany({
    where: { nostro: true },
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, citta: true, lat: true },
  });
  return (
    <>
      <Titolo
        titolo="I campi"
        testo="Dove giocate di solito. La posizione del campo è il punto «P · Parcheggio» sulla mappa di ogni attività: chi arriva sa dove lasciare la macchina, e col navigatore ci arriva da solo."
      />
      {campi.length > 0 && (
        <ul className="mb-5 divide-y divide-line rounded-md border border-line">
          {campi.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Icona nome="campi" size={15} />
              <span className="min-w-0 flex-1 truncate font-medium">{c.nome}</span>
              <span className="text-xs text-muted">
                {[c.citta, c.lat === null ? 'senza posizione' : null].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
      )}
      <FormAzione azione={passoCampo} restaAperto>
        <FormCampo squadre={[]} nostro />
        <div className="flex flex-wrap gap-2">
          <Invia icona="aggiungi">{campi.length > 0 ? 'Aggiungi un altro campo' : 'Aggiungi il campo'}</Invia>
          {campi.length > 0 && (
            <Link href="/configura?passo=fine" className="btn-ghost">
              Ho finito <Icona nome="freccia" size={15} />
            </Link>
          )}
        </div>
      </FormAzione>
    </>
  );
}

async function Fine() {
  const [s, figt, campi] = await Promise.all([
    leggiMiaSquadra(),
    prisma.credenzialeFigt.count({ where: { id: 'figt' } }),
    prisma.field.count({ where: { nostro: true } }),
  ]);
  const fatto: { titolo: string; ok: boolean; passo: Passo }[] = [
    { titolo: s?.nome ? `La squadra si chiama ${s.nome}` : 'Nome della squadra', ok: !!s?.nome, passo: 'squadra' },
    { titolo: 'Logo', ok: !!s?.logoPath, passo: 'squadra' },
    { titolo: 'Tema', ok: !!s?.temaAccento, passo: 'tema' },
    { titolo: 'Portale FIGT', ok: figt > 0, passo: 'figt' },
    {
      titolo: campi === 1 ? 'Un campo' : campi > 1 ? `${campi} campi` : 'Campi',
      ok: campi > 0,
      passo: 'campi',
    },
  ];
  const poi: { href: string; titolo: string; testo: string; icona: NomeIcona }[] = [
    { href: '/admin/operatori', titolo: 'Operatori', testo: 'aggiungi chi è già in squadra', icona: 'operatori' },
    { href: '/admin/stagioni', titolo: 'Stagioni', testo: 'la stagione in corso e le sue quote', icona: 'calendario' },
    { href: '/admin/tariffe', titolo: 'Tariffario', testo: 'quanto costano giocate e iscrizioni', icona: 'pagamenti' },
    { href: '/admin/metodi', titolo: 'Metodi di pagamento', testo: 'IBAN, Satispay, contanti', icona: 'incassa' },
    { href: '/admin/ruoli', titolo: 'Ruoli', testo: 'chi fa amministrazione, segreteria, team leader', icona: 'chiave' },
  ];
  return (
    <>
      <Titolo
        titolo="Ci siamo"
        testo="Il gestionale ha la faccia della tua squadra. Quello che hai saltato lo trovi in «La mia squadra» e in «Campi»."
      />
      <ul className="mb-6 space-y-2">
        {fatto.map((f) => (
          <li key={f.titolo} className="flex items-center gap-3 text-sm">
            <span className={f.ok ? 'text-nvg' : 'text-muted'}>
              <Icona nome={f.ok ? 'presente' : 'riserva'} size={17} />
            </span>
            <span className={`min-w-0 flex-1 ${f.ok ? '' : 'text-muted'}`}>{f.titolo}</span>
            {!f.ok && (
              <Link href={`/configura?passo=${f.passo}`} className="text-xs text-nvg hover:underline">
                Sistema
              </Link>
            )}
          </li>
        ))}
      </ul>

      <p className="titolo-sezione">E dopo</p>
      <p className="mb-3 mt-1 text-xs text-muted">
        Le prossime cose da sistemare, nel menu: Operatori sta in «Atleti &amp; nuovi», il resto in
        «Comando».
      </p>
      <ul className="mb-6 grid gap-2 sm:grid-cols-2">
        {poi.map((p) => (
          <li key={p.href} className="flex items-start gap-3 rounded-md border border-line px-3 py-2.5">
            <span className="mt-0.5 text-nvg">
              <Icona nome={p.icona} size={16} />
            </span>
            <span className="text-sm">
              <span className="font-medium">{p.titolo}</span>
              <span className="block text-xs text-muted">{p.testo}</span>
            </span>
          </li>
        ))}
      </ul>

      <form action={concludiConfigurazione}>
        <button type="submit" className="btn-primary">
          <Icona nome="approva" size={15} /> Entra nel gestionale
        </button>
      </form>
      <p className="mt-2 text-xs text-muted">
        Appena dentro ti mostro in un minuto dove stanno le cose principali.
      </p>
    </>
  );
}
