'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@prisma/client';
import { Avatar, Badge } from './ui';
import { Icona } from './Icona';
import { etichettaRuolo, tonoRuolo } from '@/lib/domain';

/**
 * Chi sono, in alto a destra, e cosa posso fare con me stesso.
 *
 * Stava in fondo alla colonna del menu — nome, incarichi, *Esci* — che è il
 * posto dove si guarda per ultimo. In alto a destra è dove lo cercano tutti,
 * perché è lì che sta in ogni applicazione che si sia usata prima di questa.
 *
 * Il callsign si legge senza virgolette: qui non si sta citando un soprannome
 * dentro un nome per esteso, si sta dicendo **come ti chiami qui dentro**.
 *
 * Gli incarichi stanno nella tendina e non sempre in vista, ed è voluto: uno
 * sa già cosa fa nella squadra. Servono nel momento in cui ci si chiede
 * *perché non vedo quella pagina?*, e allora si apre e si legge.
 */
export function MenuUtente({
  utente,
  esci,
}: {
  utente: {
    id: string;
    nome: string;
    cognome: string;
    callsign: string | null;
    iniziali: string;
    roles: Role[];
  };
  esci: () => Promise<void>;
}) {
  const [aperto, setAperto] = useState(false);
  const contenitore = useRef<HTMLDivElement>(null);

  // si chiude cliccando fuori o con Esc: una tendina che resta aperta finché
  // non si ricentra il pulsante è una tendina che si chiude per sbaglio
  // premendo qualcos'altro
  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: MouseEvent) => {
      if (!contenitore.current?.contains(e.target as Node)) setAperto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAperto(false);
    document.addEventListener('mousedown', fuori);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuori);
      document.removeEventListener('keydown', esc);
    };
  }, [aperto]);

  const nick = utente.callsign ?? utente.nome;

  return (
    <div ref={contenitore} className="relative">
      <button
        type="button"
        onClick={() => setAperto((v) => !v)}
        aria-expanded={aperto}
        aria-haspopup="menu"
        className={`flex items-center gap-2 rounded-full py-0.5 pl-2.5 pr-0.5 transition-colors ${
          aperto ? 'bg-surface2' : 'hover:bg-surface2'
        }`}
      >
        <span className="num max-w-[110px] truncate text-[11px] font-semibold tracking-wide text-nvg">
          {nick}
        </span>
        <Avatar iniziali={utente.iniziali} fotoDi={utente.id} size="sm" />
      </button>

      {aperto && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium">
              {utente.nome} {utente.cognome}
            </p>
            {utente.callsign && (
              <p className="num text-[11px] tracking-wide text-nvg">{utente.callsign}</p>
            )}

            {/* Gli incarichi: sono la risposta a «perché non vedo quella
                pagina?», ed è per quello che stanno qui e non altrove. */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {utente.roles.length > 0 ? (
                utente.roles.map((r) => (
                  <Badge key={r} tono={tonoRuolo[r]}>
                    {etichettaRuolo[r]}
                  </Badge>
                ))
              ) : (
                <Badge tono="neutro">Nuovo</Badge>
              )}
            </div>
          </div>

          <Link
            href="/profilo"
            onClick={() => setAperto(false)}
            role="menuitem"
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink/90 transition-colors hover:bg-surface2 hover:text-ink"
          >
            <Icona nome="profilo" size={16} />
            Il mio profilo
          </Link>

          <form action={esci} className="border-t border-line">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface2 hover:text-danger"
            >
              <Icona nome="esci" size={16} />
              Esci
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
