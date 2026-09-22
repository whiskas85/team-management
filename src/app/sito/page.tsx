import Link from 'next/link';
import { headers } from 'next/headers';
import { percorsoSito } from '@/lib/sito';
import { AFFILIAZIONI, AMBIZIONI, FATTI, INTERESSI, LINK_SOCIAL, VALORI } from './contenuti';
import { Scena } from './Scena';
import { LinkIcona } from './IconaLink';

export const dynamic = 'force-dynamic';

/** Il titolo di una sezione: il numero come su un ordine di missione. */
function Titolo({ numero, sopra, children }: { numero: string; sopra: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.35em] text-nvg">
        {numero} · {sopra}
      </p>
      <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{children}</h2>
    </div>
  );
}

/**
 * La home del sito: chi siamo, in cosa crediamo, dove vogliamo arrivare.
 *
 * Costruita come un ordine di missione — sezioni numerate, la carta sullo
 * sfondo, il verde del visore — perché è il modo in cui la squadra pensa, e
 * chi arriva deve capirlo prima ancora di leggere.
 */
export default async function HomeSito() {
  const host = (await headers()).get('host');
  const contatti = percorsoSito(host, '/contatti');

  return (
    <>
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative flex min-h-[100dvh] items-center overflow-hidden pt-16">
        {/* La copertina: la squadra al visore notturno, sotto le stelle. Il
            verde è già quello del sito. Due veli la scuriscono dove c'è da
            leggere — a sinistra il testo, in basso il passaggio alla pagina. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sito/copertina.webp"
          alt="La squadra Zero Dark in pattuglia, di notte, vista al visore notturno"
          className="absolute inset-0 h-full w-full object-cover object-[65%_center]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg via-bg/75 to-bg/10" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg to-transparent" />

        {/* gli angoli del mirino, come nel visore */}
        <div className="pointer-events-none absolute inset-6 hidden md:block">
          <span className="absolute left-0 top-12 h-8 w-8 border-l-2 border-t-2 border-nvg/60" />
          <span className="absolute right-0 top-12 h-8 w-8 border-r-2 border-t-2 border-nvg/60" />
          <span className="absolute bottom-0 left-0 h-8 w-8 border-b-2 border-l-2 border-nvg/60" />
          <span className="absolute bottom-0 right-0 h-8 w-8 border-b-2 border-r-2 border-nvg/60" />
          <span className="absolute bottom-2 left-12 font-mono text-[10px] tracking-[0.3em] text-nvg/70">00:30 · GOING DARK</span>
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 md:px-8">
          <div>
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.4em] text-nvg">Softair tattico</p>
            <h1 className="text-5xl font-bold uppercase leading-[0.95] tracking-tight md:text-7xl">
              Zero Dark
              <br />
              <span className="text-nvg [text-shadow:0_0_30px_rgba(76,255,0,0.45)]">Team</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink/85">
              Pattuglie a corto e lungo raggio, milsim, cartografia e ATAK. Ci muoviamo al buio, in
              silenzio e insieme: si vince come squadra, o non si vince.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={contatti}
                className="rounded-md bg-nvg px-5 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-bg shadow-nvg transition-transform hover:-translate-y-0.5"
              >
                Vuoi provare?
              </Link>
              <a
                href="#chi-siamo"
                className="rounded-md border border-line px-5 py-3 text-sm uppercase tracking-[0.15em] text-ink/80 hover:border-nvg hover:text-nvg"
              >
                Chi siamo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ chi siamo */}
      <section id="chi-siamo" className="scroll-mt-20 border-t border-line py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Titolo numero="01" sopra="Chi siamo">
            Una squadra, <span className="text-nvg">prima di tutto</span>
          </Titolo>
          <p className="mb-10 max-w-3xl text-lg text-ink/80">
            Zero Dark Team è una squadra di softair tattico nata nel 2024 a Torino. Giochiamo qui, e
            per le gare giriamo tutta Italia. Ci alleniamo ogni due settimane, e in mezzo ci sono le
            gare, i corsi e gli eventi. Ci unisce la voglia di preparare le cose per bene e di farle insieme: studiare la
            carta prima di partire, parlarsi via radio, arrivare all’obiettivo senza farsi vedere. Il
            resto — l’attrezzatura, i campi, le classifiche — viene dopo.
          </p>
          <dl className="mb-12 grid gap-4 sm:grid-cols-3">
            {FATTI.map((f) => (
              <div key={f.valore} className="border-l-2 border-nvg pl-4">
                <dt className="font-mono text-3xl font-bold tracking-tight text-nvg md:text-4xl">{f.valore}</dt>
                <dd className="mt-1 text-sm text-muted">{f.testo}</dd>
              </div>
            ))}
          </dl>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {INTERESSI.map((i, n) => (
              <div
                key={i.nome}
                className="group rounded-lg border border-line bg-surface p-5 transition-colors hover:border-nvg/60"
              >
                <p className="font-mono text-[11px] tracking-[0.3em] text-nvg">0{n + 1}</p>
                <h3 className="mt-2 text-lg font-semibold uppercase tracking-wide group-hover:text-nvg">{i.nome}</h3>
                <p className="mt-2 text-sm text-muted">{i.testo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- valori */}
      <section id="valori" className="scroll-mt-20 border-t border-line bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Titolo numero="02" sopra="I valori del softair">
            Il codice che ci diamo <span className="text-nvg">in campo</span>
          </Titolo>
          <p className="mb-12 max-w-3xl text-lg text-ink/80">
            Il softair si regge sulla parola: nessun arbitro vede ogni colpo, e il gioco funziona solo
            se chi viene colpito lo dichiara. Tutto il resto viene da lì.
          </p>
          <ol className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {VALORI.map((v, n) => (
              <li key={v.nome} className="border-l-2 border-nvg/50 pl-4">
                <p className="font-mono text-[11px] tracking-[0.3em] text-muted">
                  {String(n + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-1 text-xl font-semibold uppercase tracking-wide">{v.nome}</h3>
                <p className="mt-2 text-sm text-ink/75">{v.testo}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------------------------------------ ambizioni */}
      <section id="ambizioni" className="scroll-mt-20 border-t border-line py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Titolo numero="03" sopra="Le nostre ambizioni">
            Dove vogliamo <span className="text-nvg">misurarci</span>
          </Titolo>
          <div className="space-y-12">
            {AMBIZIONI.map((a, n) => (
              <article
                key={a.sigla}
                className={`grid items-center gap-8 md:grid-cols-2 ${n % 2 ? 'md:[&>*:first-child]:order-2' : ''}`}
              >
                <Scena
                  foto={a.foto}
                  nome={a.sigla}
                  codice={a.codice}
                  alt={`${a.sigla} — ${a.nome}`}
                  className="aspect-[3/2] rounded-lg border border-line"
                />
                <div>
                  <p className="font-mono text-4xl font-bold tracking-tight text-nvg md:text-5xl">{a.sigla}</p>
                  <h3 className="mt-1 text-lg uppercase tracking-[0.15em] text-ink/90">{a.nome}</h3>
                  <p className="mt-4 text-ink/75">{a.testo}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- affiliazioni */}
      <section id="affiliazioni" className="scroll-mt-20 border-t border-line bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <Titolo numero="04" sopra="Affiliazioni">
            Con chi <span className="text-nvg">giochiamo</span>
          </Titolo>
          <div className="grid gap-4 md:grid-cols-3">
            {AFFILIAZIONI.map((f) => (
              <div key={f.sigla} className="flex flex-col rounded-lg border border-line bg-surface p-6">
                <div
                  className={`mb-5 flex h-28 items-center justify-center rounded-md ${
                    f.logo.chiaro ? 'bg-white p-2' : 'bg-bg/60 p-3'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/sito/${f.logo.file}`}
                    alt={`Logo ${f.sigla}`}
                    className="h-full w-auto object-contain"
                    loading="lazy"
                  />
                </div>
                <p className="text-3xl font-bold tracking-tight">{f.sigla}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted">{f.nome}</p>
                {f.testo && <p className="mt-4 text-sm text-ink/75">{f.testo}</p>}
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {f.link.map((l) => (
                    <LinkIcona key={l.url} tipo={l.tipo} url={l.url} descrizione={f.sigla} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- seguici */}
      <section className="border-t border-line py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 md:grid-cols-2 md:px-8">
          <div>
            <Titolo numero="05" sopra="I nostri link">
              Seguici <span className="text-nvg">sul campo e fuori</span>
            </Titolo>
            <p className="-mt-4 text-ink/75">
              Le giornate, le pattuglie, i video delle missioni. Sul canale di SAT &amp; Gaming le
              riprese, su Instagram la squadra.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {LINK_SOCIAL.map((l) => (
                <LinkIcona key={l.url} tipo={l.tipo} url={l.url} descrizione={l.descrizione} grande />
              ))}
            </div>
          </div>
          <a href="https://www.youtube.com/@SATgaming1" target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sito/sat-gaming.webp" alt="SAT & Gaming su YouTube" className="w-full rounded-lg" />
          </a>
        </div>
      </section>

      {/* --------------------------------------------------------- chiamata */}
      <section className="relative overflow-hidden border-t border-line py-24">
        {/* piu' tenue delle altre: qui sopra c'e' il titolo, e il mirino non deve contendergli l'occhio */}
        <Scena nome="contatto" alt="" className="absolute inset-0 opacity-25" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold uppercase tracking-tight md:text-5xl">
            Vuoi provare una giornata <span className="text-nvg">con noi?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-ink/80">
            Lasciaci nome e telefono: ti chiamiamo noi, ci conosciamo e ti diciamo quando è la
            prossima giornata a cui puoi venire.
          </p>
          <Link
            href={contatti}
            className="mt-8 inline-block rounded-md bg-nvg px-6 py-3 text-sm font-semibold uppercase tracking-[0.15em] text-bg shadow-nvg transition-transform hover:-translate-y-0.5"
          >
            Scrivici
          </Link>
        </div>
      </section>
    </>
  );
}
