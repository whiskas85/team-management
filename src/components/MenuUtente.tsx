'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Role } from '@prisma/client';
import { Avatar, Badge } from './ui';
import { Icona } from './Icona';
import { etichettaRuolo, tonoRuolo } from '@/lib/domain';

/** Quanto è largo il chip una volta aperto. */
const APERTO = 240;

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
 *
 * **Non è una tendina che compare sotto: è il chip che si apre.** Cresce verso
 * sinistra e verso il basso restando agganciato al suo angolo, e il callsign
 * con la faccia non si spostano di un pixel — sono la stessa cosa di un
 * momento prima, più grande. Un riquadro che sbuca staccato sotto il chip
 * sarebbe un secondo oggetto da riconoscere; così invece si vede da dove viene.
 *
 * Dentro compare il nome per esteso, che è quello che il chip non ha spazio di
 * dire. Il callsign no: sta già in cima, e ripeterlo due centimetri più sotto
 * è il tipo di doppione che fa sembrare l'interfaccia scritta da due persone
 * che non si sono parlate.
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
  const segnaposto = useRef<HTMLDivElement>(null);

  // La larghezza da cui parte l'apertura, misurata invece che indovinata: il
  // chip è largo quanto il callsign di chi sta guardando, e un valore scritto a
  // mano andrebbe bene per un nick e storto per tutti gli altri.
  const [chiuso, setChiuso] = useState<number>();

  useEffect(() => {
    const el = segnaposto.current;
    if (!el) return;
    const misura = () => setChiuso(el.offsetWidth);
    misura();
    // il carattere arriva dopo il primo disegno e la riga si accorcia: senza
    // riascoltare, l'apertura partirebbe da una larghezza che non esiste più
    const osserva = new ResizeObserver(misura);
    osserva.observe(el);
    return () => osserva.disconnect();
  }, []);

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
      {/* Tiene nella barra lo spazio del chip mentre quello vero, che gli sta
          sopra, si allarga: senza, aprendo il menu il logo scivolerebbe. */}
      <div
        ref={segnaposto}
        aria-hidden
        className="invisible flex items-center gap-2 border border-transparent py-0.5 pl-2.5 pr-0.5"
      >
        <span className="num max-w-[110px] truncate text-[11px] font-semibold tracking-wide">
          {nick}
        </span>
        <Avatar iniziali={utente.iniziali} fotoDi={utente.id} size="sm" />
      </div>

      <div
        // ancorato all'angolo in alto a destra: è il punto che non si muove, e
        // per questo la crescita si legge come un'apertura e non come un salto.
        // Il raggio degli angoli è lo stesso aperto e chiuso, e non si anima:
        // sul chip, alto 38px, 20px vengono tagliati a metà altezza e fanno già
        // la pillola da soli. Passare da «tondo al massimo» a 16px, invece,
        // teneva il riquadro tagliato a cerchio per quasi tutta l'apertura
        style={{ width: aperto ? APERTO : chiuso }}
        className={`absolute right-0 top-0 z-50 overflow-hidden rounded-[20px] transition-[width,background-color,box-shadow] duration-300 ease-out motion-reduce:transition-none ${
          aperto
            ? 'border border-line bg-surface shadow-2xl'
            : 'border border-transparent hover:bg-surface2'
        }`}
      >
        <button
          type="button"
          onClick={() => setAperto((v) => !v)}
          aria-expanded={aperto}
          aria-haspopup="menu"
          className="flex w-full items-center justify-end gap-2 py-0.5 pl-2.5 pr-0.5"
        >
          <span className="num max-w-[110px] truncate text-[11px] font-semibold tracking-wide text-nvg">
            {nick}
          </span>
          <Avatar iniziali={utente.iniziali} fotoDi={utente.id} size="sm" />
        </button>

        {/* La riga che passa da 0fr a 1fr è il modo di far scendere un'altezza
            che non si conosce in anticipo: gli incarichi sono da zero a sei, e
            un'altezza scritta a mano sarebbe giusta per una persona sola. */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
            aperto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            {/* il contenuto entra un attimo dopo, quando c'è già lo spazio per
                leggerlo: comparire mentre il riquadro si allarga lo fa
                sembrare un rimbalzo */}
            <div
              role="menu"
              className={`transition-opacity duration-200 motion-reduce:transition-none ${
                aperto ? 'opacity-100 delay-100' : 'opacity-0'
              }`}
            >
              <div className="border-b border-line px-4 pb-3 pt-1">
                {/* il nome per esteso: è quello che il chip non ha spazio di
                    dire, e il callsign non si ripete perché sta due righe sopra */}
                <p className="truncate text-sm font-medium">
                  {utente.nome} {utente.cognome}
                </p>

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
                tabIndex={aperto ? undefined : -1}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink/90 transition-colors hover:bg-surface2 hover:text-ink"
              >
                <Icona nome="profilo" size={16} />
                Il mio profilo
              </Link>

              <form action={esci} className="border-t border-line">
                <button
                  type="submit"
                  role="menuitem"
                  tabIndex={aperto ? undefined : -1}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface2 hover:text-danger"
                >
                  <Icona nome="esci" size={16} />
                  Esci
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
