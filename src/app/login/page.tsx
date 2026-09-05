import { Logo } from '@/components/Logo';
import { FormLogin } from '@/components/FormLogin';
import { AccessoRapido, type Figura } from '@/components/AccessoRapido';
import { VERSIONE } from '@/lib/versione';

const FIGURE: Figura[] = [
  { etichetta: 'Admin', email: 'admin@zerodark.team', descrizione: 'Accesso completo a tutto' },
  {
    etichetta: 'Amministrazione',
    email: 'amministrazione@zerodark.team',
    descrizione: 'Iscrizioni, certificati medici, tessere FIGT',
  },
  {
    etichetta: 'Segreteria',
    email: 'segreteria@zerodark.team',
    descrizione: 'Pagamenti e quote',
  },
  {
    etichetta: 'Team Leader',
    email: 'tl@zerodark.team',
    descrizione: 'Atleta che schiera titolari e riserve',
  },
  { etichetta: 'Atleta', email: 'atleta@zerodark.team', descrizione: 'Membro della squadra' },
  {
    etichetta: 'Nuovo',
    email: 'nuovo@zerodark.team',
    descrizione: 'Contatto che frequenta le open',
  },
];

/**
 * Niente prerendering: DEBUG_LOGIN si legge a ogni richiesta.
 *
 * Da pagina statica il valore verrebbe congelato durante `next build`, cioè
 * dentro l'immagine e con il .env di chi la costruisce: l'ambiente di test si
 * ritroverebbe i pulsanti di prova decisi dalla macchina di build invece che
 * dal proprio DEBUG_LOGIN.
 */
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const debug = process.env.DEBUG_LOGIN === '1';

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className={`w-full ${debug ? 'max-w-3xl' : 'max-w-sm'}`}>
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={84} />
          <h1 className="mt-4 flex items-center gap-2 text-xl font-semibold tracking-[0.3em] text-ink">
            ZERO DARK
            <span className="rounded border border-nvg/40 bg-nvg/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-normal text-nvg">
              v{VERSIONE}
            </span>
          </h1>
          <p className="text-[11px] tracking-[0.35em] text-nvg">GOING DARK</p>
          <p className="mt-3 text-sm text-muted">Accesso area riservata operatori</p>
        </div>

        <div className={debug ? 'grid gap-6 md:grid-cols-2 md:items-start' : ''}>
          <div className={debug ? 'mx-auto w-full max-w-sm' : ''}>
            <FormLogin />
          </div>
          {debug && <AccessoRapido figure={FIGURE} />}
        </div>
      </div>
    </main>
  );
}
