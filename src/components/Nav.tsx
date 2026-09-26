'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './Logo';
import { Icona, type NomeIcona } from './Icona';
import { ElencoPreferiti } from './Preferiti';
import { MenuUtente } from './MenuUtente';
import { Omnisearch } from './Omnisearch';
import { VERSIONE } from '@/lib/versione';

export type VoceMenu = {
  href: string;
  label: string;
  icona: NomeIcona;
  gruppo:
    | 'principale'
    | 'annunci'
    | 'sondaggi'
    | 'segnalazioni'
    | 'mercatino'
    | 'regolamenti'
    | 'persone'
    | 'amministrazione'
    | 'segreteria'
    | 'comando';
  badge?: number;
  /**
   * Il pallino è la somma di altre voci del menu, come «Tutte le bacheche»
   * che conta gli annunci di tutte. Si mostra, ma nel conto del pulsante Menu
   * non entra: quelle voci ci sono già, e contarle due volte raddoppierebbe
   * il numero.
   */
  riepilogo?: boolean;
  /** Se questa persona se l'è messa da parte con la stellina. */
  preferito?: boolean;
  /**
   * Le viste dentro la pagina: «Calendario · Storico», «Operatori · Avvisi».
   *
   * Nel menu non compaiono — sarebbe una colonna lunga il doppio per cose che
   * si raggiungono da dentro — ma **nella ricerca sì**: chi scrive «storico»
   * cerca lo storico, non il calendario, e farglielo trovare è la differenza
   * fra una riga di ricerca e un elenco di titoli.
   */
  sotto?: { label: string; href: string }[];
};

type Props = {
  voci: VoceMenu[];
  /** Gli indirizzi messi da parte, nell'ordine scelto da chi guarda. */
  preferiti: string[];
  utente: {
    id: string;
    nome: string;
    cognome: string;
    callsign: string | null;
    iniziali: string;
    /** Ha una foto del profilo: senza, l'avatar mostra le iniziali. */
    foto: boolean;
    roles: Role[];
  };
  esci: () => Promise<void>;
  /** Si è nell'ambiente di test: sopra l'intestazione compare la fascia gialla. */
  test?: boolean;
};

/** Dove si aggancia l'intestazione in test: sotto la fascia gialla, tacca compresa. */
const TOP_TEST = 'calc(1.75rem + env(safe-area-inset-top))';

const ETICHETTA_GRUPPO: Record<string, string> = {
  principale: 'Operativo',
  annunci: 'Annunci',
  sondaggi: 'Sondaggi',
  segnalazioni: 'Segnalazioni',
  mercatino: 'Mercatino',
  regolamenti: 'Regolamenti',
  persone: 'Atleti & nuovi',
  amministrazione: 'Amministrazione',
  segreteria: 'Segreteria',
  comando: 'Comando',
};

/**
 * Quale voce si accende.
 *
 * Vince la corrispondenza piu’ lunga, non la prima: /mercatino/carrello sta
 * sotto /mercatino, ma la voce giusta da accendere è il carrello. Con il solo
 * confronto per prefisso si accendeva Usato ovunque dentro il mercatino.
 */
function voceAttiva(pathname: string, voci: VoceMenu[]) {
  const candidate = voci.filter((v) =>
    v.href === '/dashboard' ? pathname === '/dashboard' : pathname === v.href || pathname.startsWith(v.href + '/'),
  );
  return candidate.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function Nav({ voci, preferiti, utente, esci, test = false }: Props) {
  const pathname = usePathname();
  const acceso = voceAttiva(pathname, voci);
  const [apertoMenu, setApertoMenu] = useState(false);
  // il foglio del menu tirato giù col dito, in pixel: oltre una certa misura si chiude
  const [tirato, setTirato] = useState(0);
  const contenutoMenu = useRef<HTMLDivElement>(null);
  const presa = useRef<{ y: number; t: number; valida: boolean } | null>(null);
  // Sul telefono le due barre — quella in alto con il nome e quella in basso
  // con le voci — si tolgono di mezzo mentre si scende: si sta leggendo, e due
  // strisce fisse su uno schermo alto quattordici centimetri sono due
  // centimetri in meno di testo. Tornano appena si risale, che è il gesto di
  // chi ha finito e cerca dove andare.
  const [barreVia, setBarreVia] = useState(false);
  const ultimo = useRef(0);

  useEffect(() => {
    const scorri = () => {
      // su iPhone la pagina rimbalza oltre i bordi e scrollY diventa negativa
      // o supera il fondo: senza questo taglio le barre si mettono a ballare
      // proprio nel momento in cui il dito lascia lo schermo
      const y = Math.max(0, window.scrollY);
      // in cima non si nasconde mai, e sotto i venti pixel di differenza si
      // resta fermi: senza, la barra sfarfalla a ogni sussulto del dito
      if (y < 80) setBarreVia(false);
      else if (Math.abs(y - ultimo.current) > 20) setBarreVia(y > ultimo.current);
      ultimo.current = y;
    };

    window.addEventListener('scroll', scorri, { passive: true });
    return () => window.removeEventListener('scroll', scorri);
  }, []);

  // con il menu aperto le barre restano dove sono: si sta scegliendo, non
  // leggendo
  const nascoste = barreVia && !apertoMenu;

  const gruppi = [
    'principale',
    'annunci',
    'sondaggi',
    'segnalazioni',
    'mercatino',
    'regolamenti',
    'persone',
    'amministrazione',
    'segreteria',
    'comando',
  ].filter(
    (g) => voci.some((v) => v.gruppo === g),
  );
  // I preferiti, nell'ordine scelto da chi guarda. Si risolvono contro il menu
  // vero invece di conservare etichetta e icona: una voce rinominata si
  // rinomina anche qui, e una che questa persona non può più vedere sparisce
  // da sola invece di restare a puntare su una porta chiusa.
  const perHref = new Map(voci.map((v) => [v.href, v]));
  const vociPreferite = preferiti
    .map((h) => perHref.get(h))
    .filter((v): v is VoceMenu => v !== undefined);

  // Sul telefono la barra in basso tiene i preferiti, che è tutto il senso di
  // averli: quattro porte dove arriva il pollice, scelte da chi le usa. Chi non
  // ne ha ancora si tiene le prime quattro voci operative, così la barra non
  // nasce vuota.
  const rapide =
    vociPreferite.length > 0
      ? vociPreferite.slice(0, 4)
      : voci.filter((v) => v.gruppo === 'principale').slice(0, 4);

  // Quante notifiche stanno dentro il menu: senza il pallino qui, chiuso il
  // pannello non resterebbe alcun segnale che qualcosa aspetta una risposta.
  // Quelle delle voci già in barra non si contano due volte: il loro numero si
  // legge sulla voce stessa
  const daVedere = voci
    .filter((v) => !rapide.includes(v) && !v.riepilogo)
    .reduce((t, v) => t + (v.badge ?? 0), 0);

  return (
    <>
      {/* ---------------------------------------------------- sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="num flex items-center gap-1.5 text-[13px] font-semibold tracking-widest text-ink">
              ZERO DARK OPS
              <span className="rounded border border-nvg/40 bg-nvg/10 px-1 py-px text-[9px] font-semibold tracking-normal text-nvg">
                v{VERSIONE}
              </span>
            </p>
            <p className="num text-[10px] tracking-[0.2em] text-nvg">GOING DARK</p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* I preferiti stanno sopra tutto: sono le porte che questa persona
              apre ogni giorno, e farle cercare in mezzo alle altre trenta
              vanificherebbe l'averle scelte. */}
          {vociPreferite.length > 0 && (
            <div className="mb-5">
              <p className="titolo-sezione px-2 pb-2">Preferiti</p>
              <ElencoPreferiti
                voci={vociPreferite}
                acceso={acceso}
                riga={(v, { attivo, presa }) => (
                  <span
                    className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                      presa
                        ? 'bg-nvg/20 text-nvg shadow-lg ring-1 ring-nvg/40'
                        : attivo
                          ? 'bg-nvg/10 text-nvg'
                          : 'text-ink/80 hover:bg-surface2 hover:text-ink'
                    }`}
                  >
                    <Icona nome={v.icona} size={18} />
                    <span className="min-w-0 flex-1 truncate">{v.label}</span>
                    {!!v.badge && (
                      <span className="rounded-full bg-warn/20 px-1.5 py-0.5 num text-[10px] text-warn">
                        {v.badge}
                      </span>
                    )}
                  </span>
                )}
              />
              <p className="px-2 pt-1.5 text-[10px] text-muted">
                Tieni premuto per riordinarli
              </p>
            </div>
          )}

          {gruppi.map((g) => (
            <div key={g} className="mb-5">
              <p className="titolo-sezione px-2 pb-2">{ETICHETTA_GRUPPO[g]}</p>
              <ul className="space-y-0.5">
                {voci
                  .filter((v) => v.gruppo === g)
                  .map((v) => (
                    <li key={v.href}>
                      <Link
                        href={v.href}
                        className={`flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          acceso === v.href
                            ? 'bg-nvg/10 text-nvg'
                            : 'text-ink/80 hover:bg-surface2 hover:text-ink'
                        }`}
                      >
                        <Icona nome={v.icona} size={18} />
                        <span className="min-w-0 flex-1 truncate">{v.label}</span>
                        {!!v.badge && (
                          <span className="rounded-full bg-warn/20 px-1.5 py-0.5 num text-[10px] text-warn">
                            {v.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Chi sono, gli incarichi e l'uscita non stanno più qui in fondo: sono
            passati in alto a destra, che è dove li si cerca. In fondo alla
            colonna erano l'ultimo posto dove si guarda, e tenerli in tutt'e due
            avrebbe voluto dire due pulsanti «Esci» sulla stessa schermata. */}
      </aside>

      {/* In test, la fascia gialla in cima a tutto, **sopra** l'intestazione.
          Prima era attaccata in cima alla stessa altezza dell'intestazione e
          le finiva davanti, coprendo la barra della ricerca: ora
          l'intestazione si aggancia subito sotto la fascia (vedi TOP_TEST).
          Il fondo è pieno, non trasparente: quando l'intestazione scorre via
          sul telefono le passa dietro, e non deve trasparire. */}
      {test && (
        <div className="sticky top-0 z-40 flex h-[calc(1.75rem+env(safe-area-inset-top))] items-center justify-center border-b border-warn/50 bg-[#372904] pt-[env(safe-area-inset-top)] text-[11px] font-semibold uppercase tracking-[0.2em] text-warn">
          Ambiente di test
        </div>
      )}

      {/* ---------------------------------------------------- header mobile */}
      {/* un solo accesso al menu: quello della barra in basso, dove arriva il
          pollice. Un secondo hamburger qui sopra ripeteva la stessa strada */}
      <header
        /* Il padding in cima somma la tacca: su iPhone l'applicazione
           installata disegna **sotto** la barra di sistema (statusBarStyle
           black-translucent con viewport-fit=cover), e senza questo spazio il
           marchio e la versione finiscono dietro al notch — invisibili, come
           se la riga fosse tagliata. Dove la tacca non c'è, env() vale zero e
           non cambia niente. */
        // In test si aggancia sotto la fascia gialla, che ha già preso lo
        // spazio della tacca. La classe top-0 resta: è da lì che TestataFissa
        // riconosce le barre in cima, e la misura la prende dove sono davvero.
        style={test ? { top: TOP_TEST } : undefined}
        className={`sticky top-0 z-30 px-4 pb-2.5 transition-transform duration-200 md:px-8 md:pb-3 md:translate-y-0 ${
          test
            ? 'pt-2.5 md:pt-3'
            : 'pt-[calc(0.625rem+env(safe-area-inset-top))] md:pt-[calc(0.75rem+env(safe-area-inset-top))]'
        } ${nascoste ? '-translate-y-full' : 'translate-y-0'}`}
      >
        {/*
          Lo sfondo sfocato **sfuma**, invece di finire di netto.

          Prima era un fondo opaco con un bordo sotto: scorrendo, il taglio fra
          la parte sfocata e il contenuto nitido si vedeva come una riga che
          attraversava lo schermo. Qui la sfocatura vive in uno strato a sé, che
          scende qualche pixel più in basso dell'intestazione e si spegne con una
          maschera: il contenuto passa sotto e riemerge a fuoco senza che si
          capisca dove finisce una cosa e comincia l'altra.
        */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-6 top-0 -z-10 bg-gradient-to-b from-bg via-bg/92 to-transparent backdrop-blur-sm [mask-image:linear-gradient(to_bottom,black_62%,transparent)]"
        />

        {/* La riga di ricerca si prende **tutta la colonna** del contenuto, e
            la faccia se ne sta per conto suo all'estrema destra: appiccicata
            alla barra sembrava parte della barra. */}
        <div className="flex w-full items-center gap-3">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 md:hidden">
            <Logo size={30} />
            <span className="num truncate text-xs font-semibold tracking-wide">ZERO DARK OPS</span>
            <span className="shrink-0 rounded border border-nvg/40 bg-nvg/10 px-1 py-px text-[9px] font-semibold text-nvg">
              v{VERSIONE}
            </span>
          </Link>

          {/* La riga per saltare a una voce senza cercarla nella colonna: solo
              sul computer — sul telefono la tastiera coprirebbe metà schermo
              per arrivare dove il pollice arriva già da solo. Sta dentro un
              contenitore largo quanto il contenuto, così i due bordi cadono
              nello stesso punto. */}
          {/* Stessa misura e stessa centratura del contenitore dentro <main>:
              i due bordi della barra cadono esattamente sui due bordi delle
              card sotto. Lo spazio a destra serve finché lo schermo è stretto
              e la faccia starebbe sopra la barra; da xl in poi, che è dove la
              colonna smette di allargarsi, non serve più e sparisce. */}
          {/* hidden sul telefono, e non per nascondere la ricerca — quella è
              già nascosta da sé: è questo contenitore largo quanto tutto lo
              schermo che, restando in fila, schiacciava il logo e il nome fino
              a ridurli a «ZE…». */}
          <div className="mx-auto hidden w-full max-w-6xl items-center gap-3 pr-24 md:flex xl:pr-0">
            <div className="min-w-0 flex-1">
              <Omnisearch voci={voci} />
            </div>
          </div>

          {/* Il nick e la faccia, in alto a destra su tutt'e due i formati.
              La stellina non sta qui: è nella riga del titolo, dove si guarda
              già per sapere su che pagina si è. */}
          {/* Fuori dal flusso, agganciata al bordo destro: dentro alla fila
              rubava larghezza alla colonna e le spostava il centro, così la
              barra cadeva un po' più a sinistra del contenuto. */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 md:right-8">
            <MenuUtente utente={utente} esci={esci} />
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- barra inferiore mobile */}
      <nav
        // le colonne sono quante sono le voci più il menu: con due preferiti
        // una griglia fissa da cinque lascerebbe tre buchi e il pulsante del
        // menu a metà schermo
        style={{ gridTemplateColumns: `repeat(${rapide.length + 1}, minmax(0, 1fr))` }}
        className={`fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur transition-transform duration-200 md:hidden ${
          nascoste ? 'translate-y-full' : 'translate-y-0'
        }`}
      >
        {rapide.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${
              acceso === v.href ? 'text-nvg' : 'text-muted'
            }`}
          >
            {/* il pallino sulla voce, come nel menu: «Miei» dice quante quote
                aspettano di essere pagate senza doverlo aprire */}
            <span className="relative">
              <Icona nome={v.icona} size={19} />
              {!!v.badge && (
                <span className="num absolute -right-2.5 -top-1.5 min-w-[15px] rounded-full bg-nvg px-1 text-[9px] font-semibold leading-[15px] text-bg">
                  {v.badge}
                </span>
              )}
            </span>
            {v.label.split(' ')[0]}
          </Link>
        ))}
        <button
          onClick={() => setApertoMenu(true)}
          className="relative flex flex-col items-center gap-1 py-2.5 text-[10px] text-muted"
        >
          <span className="relative">
            <Icona nome="menu" size={19} />
            {daVedere > 0 && (
              <span className="num absolute -right-2.5 -top-1.5 min-w-[15px] rounded-full bg-nvg px-1 text-[9px] font-semibold leading-[15px] text-bg">
                {daVedere}
              </span>
            )}
          </span>
          Menu
        </button>
      </nav>

      {/* ---------------------------------------------------- drawer mobile */}
      {apertoMenu && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setApertoMenu(false)} />
          {/* Il pannello è una colonna: la testata — nome e chiusura — resta
              ferma, scorre solo il contenuto sotto. Tirato giù quando il
              contenuto è già in cima, il pannello segue il dito e si chiude:
              lo stesso gesto dei fogli che salgono dal fondo sul telefono. */}
          <div
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-line bg-surface"
            style={{
              transform: tirato ? `translateY(${tirato}px)` : undefined,
              transition: tirato ? 'none' : 'transform 0.2s ease-out',
            }}
            onTouchStart={(e) => {
              const scorre = contenutoMenu.current;
              presa.current = {
                y: e.touches[0].clientY,
                t: Date.now(),
                // si tira solo partendo dalla testata o col contenuto in cima
                valida: !scorre || scorre.scrollTop <= 0 || !scorre.contains(e.target as Node),
              };
            }}
            onTouchMove={(e) => {
              const p = presa.current;
              if (!p?.valida) return;
              // una pressione lunga è il riordino dei preferiti, non una chiusura
              if (Date.now() - p.t > 400 && !tirato) {
                p.valida = false;
                return;
              }
              const dy = e.touches[0].clientY - p.y;
              const scorre = contenutoMenu.current;
              if (dy > 0 && (!scorre || scorre.scrollTop <= 0)) setTirato(dy);
              else if (tirato) setTirato(0);
            }}
            onTouchEnd={() => {
              if (tirato > 90) setApertoMenu(false);
              setTirato(0);
              presa.current = null;
            }}
          >
            <div className="flex shrink-0 flex-col items-center px-4 pt-2">
              {/* la maniglia: dice che il foglio si tira giù */}
              <span className="mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
              <div className="flex w-full items-center justify-between pb-3">
                <p className="text-sm font-medium">
                  {utente.nome} {utente.cognome}
                </p>
                <button
                  onClick={() => setApertoMenu(false)}
                  className="rounded-md border border-line p-2 text-muted"
                  aria-label="Chiudi menu"
                >
                  <Icona nome="chiudi" />
                </button>
              </div>
            </div>

            <div
              ref={contenutoMenu}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-line px-4 pb-8 pt-4"
            >
              {/* Qui i preferiti sono le voci della barra in basso: riordinarli
                  vuol dire decidere cosa si ha sotto il pollice. Per questo si
                  riordinano da dentro il menu, dove si vedono tutti, e non dalla
                  barra, dove ce ne stanno quattro. */}
              {vociPreferite.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-baseline justify-between gap-2 pb-2">
                    <p className="titolo-sezione">Preferiti</p>
                    <p className="text-[10px] text-muted">tieni premuto per riordinare</p>
                  </div>
                  <ElencoPreferiti
                    voci={vociPreferite}
                    acceso={acceso}
                    onVai={() => setApertoMenu(false)}
                    riga={(v, { attivo, presa }) => (
                      <span
                        className={`flex items-center gap-2 rounded-md border px-3 py-3 text-sm ${
                          presa
                            ? 'border-nvg bg-nvg/20 text-nvg shadow-lg'
                            : attivo
                              ? 'border-nvg/40 bg-nvg/10 text-nvg'
                              : 'border-line bg-surface2 text-ink'
                        }`}
                      >
                        <Icona nome={v.icona} size={18} />
                        <span className="flex-1 truncate">{v.label}</span>
                        {!!v.badge && (
                          <span className="rounded-full bg-warn/20 px-1.5 py-0.5 num text-[10px] text-warn">
                            {v.badge}
                          </span>
                        )}
                      </span>
                    )}
                  />
                  <p className="pt-1.5 text-[10px] text-muted">
                    I primi quattro stanno nella barra in basso.
                  </p>
                </div>
              )}

              {gruppi.map((g) => (
                <div key={g} className="mb-4">
                  <p className="titolo-sezione pb-2">{ETICHETTA_GRUPPO[g]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {voci
                      .filter((v) => v.gruppo === g)
                      .map((v) => (
                        <Link
                          key={v.href}
                          href={v.href}
                          onClick={() => setApertoMenu(false)}
                          className={`flex items-center gap-2 rounded-md border px-3 py-3 text-sm ${
                            acceso === v.href
                              ? 'border-nvg/40 bg-nvg/10 text-nvg'
                              : 'border-line bg-surface2 text-ink'
                          }`}
                        >
                          <Icona nome={v.icona} size={18} />
                          <span className="flex-1 truncate">{v.label}</span>
                          {!!v.badge && (
                            <span className="rounded-full bg-warn/20 px-1.5 py-0.5 num text-[10px] text-warn">
                              {v.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                  </div>
                </div>
              ))}

              {vociPreferite.length === 0 && (
                <p className="mb-4 rounded-md border border-dashed border-line px-3 py-2 text-[11px] text-muted">
                  La <strong className="text-ink">stellina</strong> in alto a destra mette una pagina
                  fra i preferiti: finiscono qui, in cima al menu, e nella barra in basso.
                </p>
              )}

              <form action={esci}>
                <button type="submit" className="btn-ghost w-full">
                  <Icona nome="esci" size={16} /> Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
