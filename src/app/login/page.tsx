import { Orbitron, Share_Tech_Mono, Silkscreen } from 'next/font/google';
import { Logo } from '@/components/Logo';
import { FormLogin, type RigaTerminale } from '@/components/FormLogin';
import { AccessoRapido, type Figura } from '@/components/AccessoRapido';
import { VERSIONE } from '@/lib/versione';
import { inTest } from '@/lib/ambiente';

// Tre caratteri, e solo qui. Il resto del gestionale il monospazio non ce l'ha,
// ed è voluto: si legge per ore e deve stancare poco. La porta d'ingresso
// invece si guarda per tre secondi, e può fare scena. next/font li scarica
// durante la build e li serve dal nostro server: chi apre la pagina non manda
// niente a Google.
const pixel = Silkscreen({
  subsets: ['latin'],
  weight: '700',
  variable: '--font-pixel',
  display: 'swap',
});
const titoli = Orbitron({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-display',
  display: 'swap',
});
const terminale = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-terminale',
  display: 'swap',
});

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

/**
 * La porta d'ingresso, con la faccia da terminale.
 *
 * Le righe in fondo alla card **dicono cose vere**: che il gestionale risponde,
 * che versione gira, se si è in produzione o nel test. Una scritta tipo
 * «crittografia AES-512 attiva» farebbe atmosfera, ma AES-512 non esiste, e una
 * bugia sulla sicurezza proprio sulla porta d'ingresso è l'ultima cosa da
 * mettere davanti a chi deve fidarsi a lasciarci i suoi dati.
 *
 * **Sul telefono sta tutta in uno schermo**, senza scorrere: sotto il bordo
 * finivano proprio il pulsante per registrarsi e le righe del terminale. Gli
 * spazi verticali si misurano sull'altezza dello schermo (dvh), così su un
 * telefono più basso si stringono di più; da tablet in su resta ariosa.
 * Dove stringere non basta cede prima quello che si può perdere — il marchio,
 * poi i sottotitoli e le righe del terminale — e resta sempre quella che dice
 * in che ambiente si è.
 */
export default function LoginPage() {
  const debug = process.env.DEBUG_LOGIN === '1';

  const righe: RigaTerminale[] = [
    { testo: 'CONNESSIONE AL GESTIONALE', esito: 'OK' },
    { testo: 'VERSIONE', esito: `v${VERSIONE}` },
    // il test si deve riconoscere a colpo d'occhio anche qui: confondere i due
    // ambienti vuol dire scrivere sui dati veri credendo di giocare. Per
    // questo è l'unica riga che resta anche sui telefoni più bassi
    {
      testo: 'AMBIENTE',
      esito: inTest ? 'TEST' : 'PRODUZIONE',
      tono: inTest ? 'warn' : 'ok',
      essenziale: true,
    },
    ...(debug ? [{ testo: 'ACCESSO RAPIDO DI PROVA', esito: 'ATTIVO', tono: 'warn' as const }] : []),
  ];

  return (
    <main
      className={`${pixel.variable} ${titoli.variable} ${terminale.variable} login-schermo flex min-h-[100dvh] items-center justify-center px-4 py-[clamp(0.75rem,3dvh,2.5rem)]`}
    >
      <div className="w-full max-w-5xl">
        <header className="mb-[clamp(0.75rem,2.5dvh,2.5rem)] flex flex-col items-center text-center">
          <h1 className="login-titolo" data-testo="ZERO DARK">
            ZERO DARK
          </h1>
          <p className="login-sottotitolo login-display mt-[clamp(0.25rem,1dvh,1.25rem)] text-[clamp(0.7rem,2.2vw,1rem)] font-medium tracking-[0.32em] text-nvg/75">
            OPS // GESTIONALE OPERATIVO
          </p>

          <div className="login-marchio mt-[clamp(0.5rem,1.5dvh,1.5rem)] flex items-center gap-3">
            {/* più piccolo sul telefono: la porta deve stare in uno schermo */}
            <span className="rounded-full shadow-[0_0_18px_rgba(76,255,0,.45)] ring-1 ring-nvg/40 sm:hidden">
              <Logo size={36} />
            </span>
            <span className="hidden rounded-full shadow-[0_0_18px_rgba(76,255,0,.45)] ring-1 ring-nvg/40 sm:inline-flex">
              <Logo size={52} />
            </span>
            <span className="text-left leading-tight">
              <span className="login-terminale block text-[11px] tracking-[0.12em] text-nvg/45">
                team softair
              </span>
              <span className="login-display block text-sm font-medium tracking-[0.2em] text-nvg">
                ZERO DARK TEAM
              </span>
              <span className="login-terminale block text-[10px] tracking-[0.3em] text-nvg/45">
                GOING DARK
              </span>
            </span>
          </div>
        </header>

        <div
          className={
            debug
              ? 'mx-auto grid max-w-4xl gap-6 md:grid-cols-[minmax(0,1fr)_18rem] md:items-start'
              : 'mx-auto max-w-xl'
          }
        >
          <FormLogin righe={righe} />
          {debug && <AccessoRapido figure={FIGURE} />}
        </div>
      </div>
    </main>
  );
}
