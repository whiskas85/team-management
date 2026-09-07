'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from './Logo';
import { Icona, type NomeIcona } from './Icona';
import { VERSIONE } from '@/lib/versione';

export type VoceMenu = {
  href: string;
  label: string;
  icona: NomeIcona;
  gruppo:
    | 'principale'
    | 'mercatino'
    | 'regolamenti'
    | 'amministrazione'
    | 'segreteria'
    | 'comando';
  badge?: number;
};

type Props = {
  voci: VoceMenu[];
  utente: { nome: string; cognome: string; callsign: string | null; ruolo: string };
  esci: () => Promise<void>;
};

const ETICHETTA_GRUPPO: Record<string, string> = {
  principale: 'Operativo',
  mercatino: 'Mercatino',
  regolamenti: 'Regolamenti',
  amministrazione: 'Amministrazione',
  segreteria: 'Segreteria',
  comando: 'Comando',
};

function attivo(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export function Nav({ voci, utente, esci }: Props) {
  const pathname = usePathname();
  const [apertoMenu, setApertoMenu] = useState(false);
  // quante notifiche stanno dentro il menu: senza il pallino qui, chiuso il
  // pannello non resterebbe alcun segnale che qualcosa aspetta una risposta
  const daVedere = voci.reduce((t, v) => t + (v.badge ?? 0), 0);

  const gruppi = [
    'principale',
    'mercatino',
    'regolamenti',
    'amministrazione',
    'segreteria',
    'comando',
  ].filter(
    (g) => voci.some((v) => v.gruppo === g),
  );
  // sul telefono la barra in basso tiene le quattro voci più usate
  const rapide = voci.filter((v) => v.gruppo === 'principale').slice(0, 4);

  return (
    <>
      {/* ---------------------------------------------------- sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface md:flex">
        <Link href="/dashboard" className="flex items-center gap-3 border-b border-line px-4 py-4">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="num flex items-center gap-1.5 text-[13px] font-semibold tracking-widest text-ink">
              ZERO DARK
              <span className="rounded border border-nvg/40 bg-nvg/10 px-1 py-px text-[9px] font-semibold tracking-normal text-nvg">
                v{VERSIONE}
              </span>
            </p>
            <p className="num text-[10px] tracking-[0.2em] text-nvg">GOING DARK</p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                          attivo(pathname, v.href)
                            ? 'bg-nvg/10 text-nvg'
                            : 'text-ink/80 hover:bg-surface2 hover:text-ink'
                        }`}
                      >
                        <Icona nome={v.icona} size={18} />
                        <span className="flex-1">{v.label}</span>
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

        <div className="border-t border-line p-3">
          <p className="truncate text-sm font-medium">
            {utente.callsign ? `"${utente.callsign}"` : `${utente.nome} ${utente.cognome}`}
          </p>
          <p className="num text-[10px] uppercase tracking-[0.06em] text-muted">
            {utente.ruolo}
          </p>
          <form action={esci} className="mt-3">
            <button type="submit" className="btn-ghost btn-sm w-full">
              <Icona nome="esci" size={15} /> Esci
            </button>
          </form>
        </div>
      </aside>

      {/* ---------------------------------------------------- header mobile */}
      {/* un solo accesso al menu: quello della barra in basso, dove arriva il
          pollice. Un secondo hamburger qui sopra ripeteva la stessa strada */}
      <header className="sticky top-0 z-30 flex items-center border-b border-line bg-bg/95 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size={30} />
          <span className="num text-xs font-semibold tracking-widest">ZERO DARK</span>
          <span className="rounded border border-nvg/40 bg-nvg/10 px-1 py-px text-[9px] font-semibold text-nvg">
            v{VERSIONE}
          </span>
        </Link>
      </header>

      {/* ---------------------------------------------------- barra inferiore mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface/97 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {rapide.map((v) => (
          <Link
            key={v.href}
            href={v.href}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${
              attivo(pathname, v.href) ? 'text-nvg' : 'text-muted'
            }`}
          >
            <Icona nome={v.icona} size={19} />
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
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface p-4 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {utente.nome} {utente.cognome}
                </p>
                <p className="num text-[10px] uppercase tracking-[0.06em] text-nvg">
                  {utente.ruolo}
                </p>
              </div>
              <button
                onClick={() => setApertoMenu(false)}
                className="rounded-md border border-line p-2 text-muted"
                aria-label="Chiudi menu"
              >
                <Icona nome="chiudi" />
              </button>
            </div>

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
                          attivo(pathname, v.href)
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

            <form action={esci}>
              <button type="submit" className="btn-ghost w-full">
                <Icona nome="esci" size={16} /> Esci
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
